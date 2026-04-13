import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { AccessControlApplicationService } from "@backend/core/application/services/access-control/access-control.application-service";
import { AccessForbiddenApplicationError } from "@backend/core/application/services/access-control/access-control.errors";
import {
	PlantCreateUseCase,
	PlantDeleteUseCase,
	PlantGetAllUseCase,
	PlantGetByIdUseCase,
	PlantUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/plant.use-cases";
import type { UseCaseContext } from "#/backend/core/application/use-cases/use-case-context";
import { SubjectVO } from "@backend/core/domain/access/subject.vo";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { WorkspaceRoleAssignmentRepositoryPort } from "#/backend/core/application/ports/repositories/access/workspace-role-assignment.repository.port";
import { TOKENS } from "@backend/di/tokens";
import { describe, expect, it } from "vitest";

import { userUseCaseContext } from "../../../../helpers/use-case-context";
import { seedMinimalCatalog } from "../../../../helpers/gardening/seed-minimal-catalog";
import { createUseCaseTestContainer } from "../../use-cases/gardening/create-use-case-test-container";

describe("Access control — workspace RBAC + scoped persistence (integration)", () => {
	it("cross-workspace plant id is invisible: peer read/update/delete resolve to not-found after workspace auth passes", async () => {
		const c = createUseCaseTestContainer();
		const workspaceRepo = c.resolve<WorkspaceRoleAssignmentRepositoryPort>(TOKENS.WorkspaceRoleAssignmentRepositoryPort);
		const alice = SubjectVO.user("alice");
		const bob = SubjectVO.user("bob");
		await workspaceRepo.upsertOne({
			subjectKey: alice.toKey(),
			workspaceKey: WorkspaceVO.user("alice").toKey(),
			role: "admin",
			grantSource: "test",
		});
		await workspaceRepo.upsertOne({
			subjectKey: bob.toKey(),
			workspaceKey: WorkspaceVO.user("bob").toKey(),
			role: "admin",
			grantSource: "test",
		});
		const { cultivar } = await seedMinimalCatalog(c, WorkspaceVO.user("alice").toKey());

		const create = c.resolve(PlantCreateUseCase);
		const getById = c.resolve(PlantGetByIdUseCase);
		const getAll = c.resolve(PlantGetAllUseCase);
		const update = c.resolve(PlantUpdateUseCase);
		const del = c.resolve(PlantDeleteUseCase);

		const aliceCtx = userUseCaseContext("alice");
		const bobCtx = userUseCaseContext("bob");

		const plant = await create.execute({
			context: aliceCtx,
			dto: { cultivarId: cultivar.id, title: "Alice plant", description: null },
		});

		await expect(getById.execute({ context: aliceCtx, dto: { id: plant.id } })).resolves.toMatchObject({
			id: plant.id,
		});
		await expect(getById.execute({ context: bobCtx, dto: { id: plant.id } })).rejects.toBeInstanceOf(
			RepositoryNotFoundError,
		);

		const aliceList = await getAll.execute({ context: aliceCtx });
		expect(aliceList.items.some((p) => String(p.id) === String(plant.id))).toBe(true);

		const bobList = await getAll.execute({ context: bobCtx });
		expect(bobList.items.some((p) => String(p.id) === String(plant.id))).toBe(false);

		await expect(update.execute({ context: bobCtx, dto: { id: plant.id, title: "hijacked" } })).rejects.toBeInstanceOf(
			RepositoryNotFoundError,
		);

		const updated = await update.execute({
			context: aliceCtx,
			dto: { id: plant.id, title: "Still alice" },
		});
		expect(updated.title).toBe("Still alice");

		await expect(del.execute({ context: bobCtx, dto: { id: plant.id } })).rejects.toBeInstanceOf(
			RepositoryNotFoundError,
		);
		await del.execute({ context: aliceCtx, dto: { id: plant.id } });
	});

	it("denies plant create when actor lacks create permission", async () => {
		const c = createUseCaseTestContainer();
		const eve = SubjectVO.user("eve");
		const workspaceRepo = c.resolve<WorkspaceRoleAssignmentRepositoryPort>(TOKENS.WorkspaceRoleAssignmentRepositoryPort);
		await workspaceRepo.upsertOne({
			subjectKey: eve.toKey(),
			workspaceKey: WorkspaceVO.user("eve").toKey(),
			role: "viewer",
			grantSource: "test",
		});
		const { cultivar } = await seedMinimalCatalog(c, WorkspaceVO.user("eve").toKey());
		const create = c.resolve(PlantCreateUseCase);

		await expect(
			create.execute({
				context: userUseCaseContext("eve"),
				dto: { cultivarId: cultivar.id, title: "nope", description: null },
			}),
		).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
	});

	it("workspace admin can grant viewer; viewer reads but cannot update", async () => {
		const c = createUseCaseTestContainer();
		const workspaceRepo = c.resolve<WorkspaceRoleAssignmentRepositoryPort>(TOKENS.WorkspaceRoleAssignmentRepositoryPort);
		const owner = SubjectVO.user("owner");
		const guest = SubjectVO.user("guest");
		await workspaceRepo.upsertOne({
			subjectKey: owner.toKey(),
			workspaceKey: WorkspaceVO.user("owner").toKey(),
			role: "admin",
			grantSource: "test",
		});
		const { cultivar } = await seedMinimalCatalog(c, WorkspaceVO.user("owner").toKey());
		const create = c.resolve(PlantCreateUseCase);
		const getById = c.resolve(PlantGetByIdUseCase);
		const update = c.resolve(PlantUpdateUseCase);
		const access = c.resolve(AccessControlApplicationService);

		const ownerCtx = userUseCaseContext("owner");
		/** Guest acts in the owner's workspace after receiving viewer role there (not in guest's personal workspace). */
		const guestInOwnerWorkspaceCtx: UseCaseContext = {
			actorSubject: guest,
			activeWorkspaceScope: WorkspaceVO.user("owner"),
		};

		const plant = await create.execute({
			context: ownerCtx,
			dto: { cultivarId: cultivar.id, title: "Shared later", description: null },
		});

		await access.assignWorkspaceRole({
			actorSubject: owner,
			targetSubject: guest,
			activeWorkspaceScope: WorkspaceVO.user("owner"),
			role: "viewer",
		});

		await expect(
			getById.execute({ context: guestInOwnerWorkspaceCtx, dto: { id: plant.id } }),
		).resolves.toMatchObject({
			id: plant.id,
		});
		await expect(
			update.execute({ context: guestInOwnerWorkspaceCtx, dto: { id: plant.id, title: "no" } }),
		).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
	});

	it("viewer cannot delete in workspace (RBAC before scoped delete)", async () => {
		const c = createUseCaseTestContainer();
		const workspaceRepo = c.resolve<WorkspaceRoleAssignmentRepositoryPort>(TOKENS.WorkspaceRoleAssignmentRepositoryPort);
		const ownerAdmin = SubjectVO.user("owner-del");
		const viewer = SubjectVO.user("viewer-del");
		const sharedScope = WorkspaceVO.user("owner-del");
		const wk = sharedScope.toKey();
		await workspaceRepo.upsertOne({
			subjectKey: ownerAdmin.toKey(),
			workspaceKey: wk,
			role: "admin",
			grantSource: "test",
		});
		await workspaceRepo.upsertOne({
			subjectKey: viewer.toKey(),
			workspaceKey: wk,
			role: "viewer",
			grantSource: "test",
		});
		const { cultivar } = await seedMinimalCatalog(c, wk);
		const create = c.resolve(PlantCreateUseCase);
		const del = c.resolve(PlantDeleteUseCase);
		const ownerCtx: UseCaseContext = { actorSubject: ownerAdmin, activeWorkspaceScope: sharedScope };
		const viewerCtx: UseCaseContext = { actorSubject: viewer, activeWorkspaceScope: sharedScope };
		const plant = await create.execute({
			context: ownerCtx,
			dto: { cultivarId: cultivar.id, title: "shared plant", description: null },
		});
		await expect(del.execute({ context: viewerCtx, dto: { id: plant.id } })).rejects.toBeInstanceOf(
			AccessForbiddenApplicationError,
		);
	});
});
