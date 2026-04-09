import { defaultWorkspaceRef, gardeningPlantRef } from "#/backend/core/application/resource-refs";
import type { ResoursePermissionRepositoryPort } from "@backend/core/application/ports/repositories/resource-access/resourse-permission.repository.port";
import { AccessControlApplicationService } from "@backend/core/application/services/access-control/access-control.application-service";
import { AccessForbiddenApplicationError } from "@backend/core/application/services/access-control/access-control.errors";
import {
	PlantCreateUseCase,
	PlantDeleteUseCase,
	PlantGetAllUseCase,
	PlantGetByIdUseCase,
	PlantUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/plant.use-cases";
import { IdentityRef } from "@backend/core/domain/resource-access";
import { TOKENS } from "@backend/di/tokens";
import { describe, expect, it } from "vitest";

import { seedMinimalCatalog } from "../../../../helpers/gardening/seed-minimal-catalog";
import { createUseCaseTestContainer } from "../../use-cases/gardening/create-use-case-test-container";

describe("Access control — plant ownership and isolation (use-case integration)", () => {
	it("creator keeps read/update/delete on own plant; peer with same workspace create access cannot access it", async () => {
		const c = createUseCaseTestContainer();
		const repo = c.resolve<ResoursePermissionRepositoryPort>(TOKENS.ResoursePermissionRepositoryPort);
		const ws = defaultWorkspaceRef();
		const alice = IdentityRef.user("alice");
		const bob = IdentityRef.user("bob");
		await repo.upsertRoleAssignment({
			subjectRef: alice,
			resourceRef: ws,
			role: "editor",
			grantSource: "test",
		});
		await repo.upsertRoleAssignment({
			subjectRef: bob,
			resourceRef: ws,
			role: "editor",
			grantSource: "test",
		});

		const { cultivar } = await seedMinimalCatalog(c);

		const create = c.resolve(PlantCreateUseCase);
		const getById = c.resolve(PlantGetByIdUseCase);
		const getAll = c.resolve(PlantGetAllUseCase);
		const update = c.resolve(PlantUpdateUseCase);
		const del = c.resolve(PlantDeleteUseCase);

		const aliceCtx = { actorRef: alice, workspaceRef: ws };
		const bobCtx = { actorRef: bob, workspaceRef: ws };

		const plant = await create.execute({
			context: aliceCtx,
			dto: { cultivarId: cultivar.id, title: "Alice plant", description: null },
		});

		await expect(getById.execute({ context: aliceCtx, dto: { id: plant.id } })).resolves.toMatchObject({
			id: plant.id,
		});
		await expect(getById.execute({ context: bobCtx, dto: { id: plant.id } })).rejects.toBeInstanceOf(
			AccessForbiddenApplicationError,
		);

		const aliceList = await getAll.execute({ context: aliceCtx });
		expect(aliceList.items.some((p) => String(p.id) === String(plant.id))).toBe(true);

		const bobList = await getAll.execute({ context: bobCtx });
		expect(bobList.items.some((p) => String(p.id) === String(plant.id))).toBe(false);

		await expect(
			update.execute({ context: bobCtx, dto: { id: plant.id, title: "hijacked" } }),
		).rejects.toBeInstanceOf(AccessForbiddenApplicationError);

		const updated = await update.execute({
			context: aliceCtx,
			dto: { id: plant.id, title: "Still alice" },
		});
		expect(updated.title).toBe("Still alice");

		await expect(del.execute({ context: bobCtx, dto: { id: plant.id } })).rejects.toBeInstanceOf(
			AccessForbiddenApplicationError,
		);
		await del.execute({ context: aliceCtx, dto: { id: plant.id } });
	});

	it("denies plant create when actor lacks create permission on workspace", async () => {
		const c = createUseCaseTestContainer();
		const eve = IdentityRef.user("eve");
		const { cultivar } = await seedMinimalCatalog(c);
		const create = c.resolve(PlantCreateUseCase);

		await expect(
			create.execute({
				context: { actorRef: eve, workspaceRef: defaultWorkspaceRef() },
				dto: { cultivarId: cultivar.id, title: "nope", description: null },
			}),
		).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
	});

	it("resource admin can grant viewer; viewer reads but cannot update", async () => {
		const c = createUseCaseTestContainer();
		const repo = c.resolve<ResoursePermissionRepositoryPort>(TOKENS.ResoursePermissionRepositoryPort);
		const ws = defaultWorkspaceRef();
		const owner = IdentityRef.user("owner");
		const guest = IdentityRef.user("guest");
		await repo.upsertRoleAssignment({
			subjectRef: owner,
			resourceRef: ws,
			role: "editor",
			grantSource: "test",
		});

		const { cultivar } = await seedMinimalCatalog(c);
		const create = c.resolve(PlantCreateUseCase);
		const getById = c.resolve(PlantGetByIdUseCase);
		const update = c.resolve(PlantUpdateUseCase);
		const access = c.resolve(AccessControlApplicationService);

		const ownerCtx = { actorRef: owner, workspaceRef: ws };
		const guestCtx = { actorRef: guest, workspaceRef: ws };

		const plant = await create.execute({
			context: ownerCtx,
			dto: { cultivarId: cultivar.id, title: "Shared later", description: null },
		});

		await access.assignRole(ownerCtx, {
			subjectRef: guest,
			resourceRef: gardeningPlantRef(String(plant.id)),
			role: "viewer",
			grantSource: "test",
		});

		await expect(getById.execute({ context: guestCtx, dto: { id: plant.id } })).resolves.toMatchObject({
			id: plant.id,
		});
		await expect(
			update.execute({ context: guestCtx, dto: { id: plant.id, title: "no" } }),
		).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
	});
});
