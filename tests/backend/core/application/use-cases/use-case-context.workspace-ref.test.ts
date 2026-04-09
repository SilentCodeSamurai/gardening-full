import { workspaceRef } from "#/backend/core/application/resource-refs";
import type { ResoursePermissionRepositoryPort } from "@backend/core/application/ports/repositories/resource-access/resourse-permission.repository.port";
import { AccessForbiddenApplicationError } from "@backend/core/application/services/access-control/access-control.errors";
import { LocationCreateUseCase } from "@backend/core/application/use-cases/gardening/location.use-cases";
import { PlantCreateUseCase } from "@backend/core/application/use-cases/gardening/plant.use-cases";
import { SpatialNodeCreateUseCase } from "@backend/core/application/use-cases/spatial/spatial.use-cases";
import { IdentityRef } from "@backend/core/domain/resource-access";
import { TOKENS } from "@backend/di/tokens";
import { describe, expect, it } from "vitest";

import { seedMinimalCatalog } from "../../../helpers/gardening/seed-minimal-catalog";
import { createTestUseCaseContext } from "./create-test-use-case-context";
import { createUseCaseTestContainer } from "./gardening/create-use-case-test-container";

describe("UseCaseContext.workspaceRef", () => {
	it("allows plant create when actor has create permission on the same workspace ref as context", async () => {
		const c = createUseCaseTestContainer();
		const repo = c.resolve<ResoursePermissionRepositoryPort>(TOKENS.ResoursePermissionRepositoryPort);
		const ws = workspaceRef("tenant-east");
		const actor = IdentityRef.user("pat");
		await repo.upsertRoleAssignment({
			subjectRef: actor,
			resourceRef: ws,
			role: "editor",
			grantSource: "test",
		});
		const { cultivar } = await seedMinimalCatalog(c);
		const created = await c.resolve(PlantCreateUseCase).execute({
			context: { actorRef: actor, workspaceRef: ws },
			dto: { cultivarId: cultivar.id, title: "Cherry", description: null },
		});
		expect(created.title).toBe("Cherry");
	});

	it("denies plant create when context.workspaceRef is not one the actor may create under", async () => {
		const c = createUseCaseTestContainer();
		const repo = c.resolve<ResoursePermissionRepositoryPort>(TOKENS.ResoursePermissionRepositoryPort);
		const wsGranted = workspaceRef("home");
		const wsContext = workspaceRef("other");
		const actor = IdentityRef.user("pat");
		await repo.upsertRoleAssignment({
			subjectRef: actor,
			resourceRef: wsGranted,
			role: "editor",
			grantSource: "test",
		});
		const { cultivar } = await seedMinimalCatalog(c);
		await expect(
			c.resolve(PlantCreateUseCase).execute({
				context: { actorRef: actor, workspaceRef: wsContext },
				dto: { cultivarId: cultivar.id, title: "nope", description: null },
			}),
		).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
	});

	it("denies create when actorRef is tests-local but workspaceRef is not the seeded default workspace", async () => {
		const c = createUseCaseTestContainer();
		const { cultivar } = await seedMinimalCatalog(c);
		const base = createTestUseCaseContext();
		await expect(
			c.resolve(PlantCreateUseCase).execute({
				context: {
					...base,
					workspaceRef: workspaceRef("not-seeded-for-tests-local"),
				},
				dto: { cultivarId: cultivar.id, title: "blocked", description: null },
			}),
		).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
	});

	it("allows the same actor to create under two workspaces when both have editor assignments", async () => {
		const c = createUseCaseTestContainer();
		const repo = c.resolve<ResoursePermissionRepositoryPort>(TOKENS.ResoursePermissionRepositoryPort);
		const wsA = workspaceRef("a");
		const wsB = workspaceRef("b");
		const actor = IdentityRef.user("multi");
		for (const ws of [wsA, wsB]) {
			await repo.upsertRoleAssignment({
				subjectRef: actor,
				resourceRef: ws,
				role: "editor",
				grantSource: "test",
			});
		}
		const { cultivar } = await seedMinimalCatalog(c);
		const create = c.resolve(PlantCreateUseCase);
		const pA = await create.execute({
			context: { actorRef: actor, workspaceRef: wsA },
			dto: { cultivarId: cultivar.id, title: "in A", description: null },
		});
		const pB = await create.execute({
			context: { actorRef: actor, workspaceRef: wsB },
			dto: { cultivarId: cultivar.id, title: "in B", description: null },
		});
		expect(pA.title).toBe("in A");
		expect(pB.title).toBe("in B");
	});

	it("denies location create when workspaceRef does not match a granted scope", async () => {
		const c = createUseCaseTestContainer();
		const repo = c.resolve<ResoursePermissionRepositoryPort>(TOKENS.ResoursePermissionRepositoryPort);
		const wsGranted = workspaceRef("allowed-loc");
		const actor = IdentityRef.user("loc-user");
		await repo.upsertRoleAssignment({
			subjectRef: actor,
			resourceRef: wsGranted,
			role: "editor",
			grantSource: "test",
		});
		await expect(
			c.resolve(LocationCreateUseCase).execute({
				context: { actorRef: actor, workspaceRef: workspaceRef("wrong-loc") },
				dto: { name: "X" },
			}),
		).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
		await expect(
			c.resolve(LocationCreateUseCase).execute({
				context: { actorRef: actor, workspaceRef: wsGranted },
				dto: { name: "Yard" },
			}),
		).resolves.toMatchObject({ name: "Yard" });
	});

	it("denies spatial node create when workspaceRef is not permitted for the actor", async () => {
		const c = createUseCaseTestContainer();
		const repo = c.resolve<ResoursePermissionRepositoryPort>(TOKENS.ResoursePermissionRepositoryPort);
		const wsGranted = workspaceRef("spatial-ok");
		const actor = IdentityRef.user("spatial-user");
		await repo.upsertRoleAssignment({
			subjectRef: actor,
			resourceRef: wsGranted,
			role: "editor",
			grantSource: "test",
		});
		const create = c.resolve(SpatialNodeCreateUseCase);
		const dto = {
			parentId: null,
			kind: "frame" as const,
			rect: { x: 0, y: 0, width: 10, height: 10 },
			ref: { entity: "location" as const, entityId: "layout-root" },
		};
		await expect(
			create.execute({
				context: { actorRef: actor, workspaceRef: workspaceRef("spatial-bad") },
				dto,
			}),
		).rejects.toBeInstanceOf(AccessForbiddenApplicationError);
		const node = await create.execute({
			context: { actorRef: actor, workspaceRef: wsGranted },
			dto,
		});
		expect(node.kind).toBe("frame");
	});
});
