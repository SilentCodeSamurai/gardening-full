import { defineDefaultCatalog } from "@backend/core/application/use-cases/gardening/default-catalog.config";
import { PopulateDefaultCatalogUseCase } from "@backend/core/application/use-cases/gardening/populate-default-catalog.use-case";
import {
  SpeciesCategoryCreateUseCase,
  SpeciesCategoryDeleteUseCase,
  SpeciesCategoryGetAllUseCase,
  SpeciesCategoryGetByIdUseCase,
  SpeciesCategoryUpdateUseCase,
} from "#/backend/core/application/use-cases/gardening/species-category.use-cases";
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { bootstrapPopulateServiceAccount } from "#/backend/core/application/service-accounts";
import type { WorkspaceRoleAssignmentRepositoryPort } from "#/backend/core/application/ports/repositories/access/workspace-role-assignment.repository.port";
import { createTestUseCaseContext } from "../create-test-use-case-context";
import { SubjectVO } from "@backend/core/domain/access/subject.vo";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import { TOKENS } from "@backend/di/tokens";
import { speciesCategoryId } from "@backend/infrastructure/integrations/shared/database-ids";
import { describe, expect, it } from "vitest";

import { userUseCaseContext } from "../../../../helpers/use-case-context";
import { createUseCaseTestContainer } from "./create-use-case-test-container";
import { seedMinimalCatalog } from "../../../../helpers/gardening/seed-minimal-catalog";

describe("Species category use-cases", () => {
  const tinyDefaultCatalog = defineDefaultCatalog({
    categories: [{ slug: "seeded", title: "Seeded category" }],
    species: [],
  });

  it("default catalog is readable in user workspace via system catalog inclusion", async () => {
    const c = createUseCaseTestContainer();
    const workspaceRepo = c.resolve<WorkspaceRoleAssignmentRepositoryPort>(
      TOKENS.WorkspaceRoleAssignmentRepositoryPort,
    );
    const stranger = SubjectVO.user("no-assignments");
    await workspaceRepo.upsertOne({
      subjectKey: stranger.toKey(),
      workspaceKey: WorkspaceVO.user("no-assignments").toKey(),
      role: "viewer",
      grantSource: "test",
    });
    await c.resolve(PopulateDefaultCatalogUseCase).execute({
      context: {
        actorSubject: bootstrapPopulateServiceAccount,
        activeWorkspaceScope: WorkspaceVO.globalShared(),
      },
      dto: {
        catalog: tinyDefaultCatalog,
      },
    });
    const getAll = c.resolve(SpeciesCategoryGetAllUseCase);
    const items = (await getAll.execute({ context: userUseCaseContext("no-assignments") })).items;
    expect(items).toHaveLength(1);
  });

  it("create, getById, getAll, update, delete happy path", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const create = c.resolve(SpeciesCategoryCreateUseCase);
    const getById = c.resolve(SpeciesCategoryGetByIdUseCase);
    const getAll = c.resolve(SpeciesCategoryGetAllUseCase);
    const update = c.resolve(SpeciesCategoryUpdateUseCase);
    const del = c.resolve(SpeciesCategoryDeleteUseCase);

    const row = await create.execute({ context, dto: { title: "Vegetables" } });
    expect(row.title).toBe("Vegetables");
    expect(row.systemCatalog).toBe(true);

    const byId = await getById.execute({ context, dto: { id: row.id } });
    expect(byId.id).toEqual(row.id);

    expect((await getAll.execute({ context })).items).toHaveLength(1);

    const updated = await update.execute({ context, dto: { id: row.id, title: "Herbs" } });
    expect(updated.title).toBe("Herbs");

    const deletedId = await del.execute({ context, dto: { id: row.id } });
    expect(deletedId).toEqual(row.id);
    expect((await getAll.execute({ context })).items).toHaveLength(0);
    const missing = getById.execute({ context, dto: { id: row.id } });
    await expect(missing).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("getById throws when missing", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const getById = c.resolve(SpeciesCategoryGetByIdUseCase);
    const missingId = speciesCategoryId();
    const missing = getById.execute({ context, dto: { id: missingId } });
    await expect(missing).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("update throws when missing", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const update = c.resolve(SpeciesCategoryUpdateUseCase);
    const missingId = speciesCategoryId();
    const updateMissing = update.execute({ context, dto: { id: missingId, title: "x" } });
    await expect(updateMissing).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("delete throws when missing", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const del = c.resolve(SpeciesCategoryDeleteUseCase);
    const missingId = speciesCategoryId();
    const deleteMissing = del.execute({ context, dto: { id: missingId } });
    await expect(deleteMissing).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("delete throws when species still reference category", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { category } = await seedMinimalCatalog(c);
    const del = c.resolve(SpeciesCategoryDeleteUseCase);
    const conflict = del.execute({ context, dto: { id: category.id } });
    await expect(conflict).rejects.toBeInstanceOf(RepositoryConflictError);
    await expect(conflict).rejects.toMatchObject({
      operation: "delete",
      reason: "species-reference-category",
      context: { categoryId: category.id },
    });
  });

  it("update allows populated catalog row in simplified workspace model", async () => {
    const c = createUseCaseTestContainer();
    const populate = c.resolve(PopulateDefaultCatalogUseCase);
    await populate.execute({
      context: {
        actorSubject: bootstrapPopulateServiceAccount,
        activeWorkspaceScope: WorkspaceVO.globalShared(),
      },
      dto: { catalog: tinyDefaultCatalog },
    });

    const getAll = c.resolve(SpeciesCategoryGetAllUseCase);
    const seeded = (await getAll.execute({ context: createTestUseCaseContext() })).items[0];
    expect(seeded?.systemCatalog).toBe(true);

    const update = c.resolve(SpeciesCategoryUpdateUseCase);
    const attempted = update.execute({
      context: createTestUseCaseContext(),
      dto: { id: seeded!.id, title: "Edited seeded category" },
    });
    await expect(attempted).resolves.toMatchObject({ id: seeded!.id });
  });

  it("delete allows populated catalog row in simplified workspace model", async () => {
    const c = createUseCaseTestContainer();
    const populate = c.resolve(PopulateDefaultCatalogUseCase);
    await populate.execute({
      context: {
        actorSubject: bootstrapPopulateServiceAccount,
        activeWorkspaceScope: WorkspaceVO.globalShared(),
      },
      dto: { catalog: tinyDefaultCatalog },
    });

    const getAll = c.resolve(SpeciesCategoryGetAllUseCase);
    const seeded = (await getAll.execute({ context: createTestUseCaseContext() })).items[0];
    expect(seeded?.systemCatalog).toBe(true);

    const del = c.resolve(SpeciesCategoryDeleteUseCase);
    const attempted = del.execute({ context: createTestUseCaseContext(), dto: { id: seeded!.id } });
    await expect(attempted).resolves.toEqual(seeded!.id);
  });
});
