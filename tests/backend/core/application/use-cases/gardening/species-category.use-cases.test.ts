import { defineDefaultCatalog } from "@backend/core/application/use-cases/gardening/default-catalog.config";
import { PopulateDefaultCatalogUseCase } from "@backend/core/application/use-cases/gardening/populate-default-catalog.use-case";
import {
  SpeciesCategoryBulkEditByIdsUseCase,
  SpeciesCategoryCreateUseCase,
  SpeciesCategoryDeleteManyUseCase,
  SpeciesCategoryDeleteUseCase,
  SpeciesCategoryGetAllUseCase,
  SpeciesCategoryGetByIdUseCase,
  SpeciesCategoryUpdateUseCase,
} from "#/backend/core/application/use-cases/gardening/species-category.use-cases";
import {
  RepositoryNotFoundError,
} from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { bootstrapServiceAccount } from "#/backend/core/application/service-accounts";
import { WorkspaceRoleAssignmentRepositoryPortToken } from "#/backend/core/application/ports/repositories/access/workspace-role-assignment.repository.port";
import { createTestUseCaseContext } from "../create-test-use-case-context";
import { SubjectVO } from "@backend/core/domain/access/subject.vo";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import { beforeEach, describe, expect, it } from "vitest";

import { userUseCaseContext } from "../../../../helpers/use-case-context";
import { createUseCaseTestContainer } from "./create-use-case-test-container";
import { seedMinimalCatalog } from "../../../../helpers/gardening/seed-minimal-catalog";
import { SpeciesGetAllUseCase } from "@backend/core/application/use-cases/gardening/species.use-cases";

describe("Species category use-cases", () => {
  let c: ReturnType<typeof createUseCaseTestContainer>;
  let context: ReturnType<typeof createTestUseCaseContext>;

  beforeEach(() => {
    c = createUseCaseTestContainer();
    context = createTestUseCaseContext();
  });

  const tinyDefaultCatalog = defineDefaultCatalog({
    categories: [{ slug: "seeded", title: "Seeded category", presentation: null }],
    species: [],
  });

  it("default catalog is readable in user workspace via system catalog inclusion", async () => {
    const workspaceRepo = c.resolve(WorkspaceRoleAssignmentRepositoryPortToken);
    const stranger = SubjectVO.user("no-assignments");
    await workspaceRepo.upsertOne({
      subject: stranger,
      workspace: WorkspaceVO.user("no-assignments"),
      role: "viewer",
      grantSource: "test",
    });
    await c.resolve(PopulateDefaultCatalogUseCase).run({
      context: {
        actorSubject: bootstrapServiceAccount,
        activeWorkspaceScope: WorkspaceVO.globalShared(),
      },
      dto: {
        catalog: tinyDefaultCatalog,
      },
    });
    const getAll = c.resolve(SpeciesCategoryGetAllUseCase);
    const items = (await getAll.run({ context: userUseCaseContext("no-assignments") })).items;
    expect(items).toHaveLength(1);
  });

  it("create, getById, getAll, update, delete happy path", async () => {
    const create = c.resolve(SpeciesCategoryCreateUseCase);
    const getById = c.resolve(SpeciesCategoryGetByIdUseCase);
    const getAll = c.resolve(SpeciesCategoryGetAllUseCase);
    const update = c.resolve(SpeciesCategoryUpdateUseCase);
    const del = c.resolve(SpeciesCategoryDeleteUseCase);

    const row = await create.run({ context, dto: { title: "Vegetables", presentation: null } });
    expect(row.title).toBe("Vegetables");
    expect(row.systemCatalog).toBe(true);

    const byId = await getById.run({ context, dto: { id: row.id } });
    expect(byId.id).toEqual(row.id);

    expect((await getAll.run({ context })).items).toHaveLength(1);

    const updated = await update.run({ context, dto: { id: row.id, title: "Herbs" } });
    expect(updated.title).toBe("Herbs");

    const deletedId = await del.run({ context, dto: { id: row.id } });
    expect(deletedId).toEqual(row.id);
    expect((await getAll.run({ context })).items).toHaveLength(0);
    const missing = getById.run({ context, dto: { id: row.id } });
    await expect(missing).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("getById throws when missing", async () => {
    const getById = c.resolve(SpeciesCategoryGetByIdUseCase);
    const missingId = "missing-category-id" as never;
    const missing = getById.run({ context, dto: { id: missingId } });
    await expect(missing).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("update throws when missing", async () => {
    const update = c.resolve(SpeciesCategoryUpdateUseCase);
    const missingId = "missing-category-id" as never;
    const updateMissing = update.run({ context, dto: { id: missingId, title: "x" } });
    await expect(updateMissing).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("delete throws when missing", async () => {
    const del = c.resolve(SpeciesCategoryDeleteUseCase);
    const missingId = "missing-category-id" as never;
    const deleteMissing = del.run({ context, dto: { id: missingId } });
    await expect(deleteMissing).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("delete unbinds species that still reference category", async () => {
    const { category } = await seedMinimalCatalog(c);
    const linkedSpecies = (await c.resolve(SpeciesGetAllUseCase).run({ context })).items.find(
      (species) => species.categoryId === category.id,
    );
    expect(linkedSpecies).toBeDefined();

    const del = c.resolve(SpeciesCategoryDeleteUseCase);
    await del.run({ context, dto: { id: category.id } });

    const allSpecies = await c.resolve(SpeciesGetAllUseCase).run({ context });
    const updatedLinkedSpecies = allSpecies.items.find((species) => species.id === linkedSpecies?.id);
    expect(updatedLinkedSpecies?.categoryId).toBeNull();
  });

  it("update allows populated catalog row in simplified workspace model", async () => {
    const populate = c.resolve(PopulateDefaultCatalogUseCase);
    await populate.run({
      context: {
        actorSubject: bootstrapServiceAccount,
        activeWorkspaceScope: WorkspaceVO.globalShared(),
      },
      dto: { catalog: tinyDefaultCatalog },
    });

    const getAll = c.resolve(SpeciesCategoryGetAllUseCase);
    const seeded = (await getAll.run({ context: createTestUseCaseContext() })).items[0];
    expect(seeded?.systemCatalog).toBe(true);

    const update = c.resolve(SpeciesCategoryUpdateUseCase);
    const attempted = update.run({
      context: createTestUseCaseContext(),
      dto: { id: seeded!.id, title: "Edited seeded category" },
    });
    await expect(attempted).resolves.toMatchObject({ id: seeded!.id });
  });

  it("delete allows populated catalog row in simplified workspace model", async () => {
    const populate = c.resolve(PopulateDefaultCatalogUseCase);
    await populate.run({
      context: {
        actorSubject: bootstrapServiceAccount,
        activeWorkspaceScope: WorkspaceVO.globalShared(),
      },
      dto: { catalog: tinyDefaultCatalog },
    });

    const getAll = c.resolve(SpeciesCategoryGetAllUseCase);
    const seeded = (await getAll.run({ context: createTestUseCaseContext() })).items[0];
    expect(seeded?.systemCatalog).toBe(true);

    const del = c.resolve(SpeciesCategoryDeleteUseCase);
    const attempted = del.run({ context: createTestUseCaseContext(), dto: { id: seeded!.id } });
    await expect(attempted).resolves.toEqual(seeded!.id);
  });

  it("deleteMany removes requested categories", async () => {
    const create = c.resolve(SpeciesCategoryCreateUseCase);
    const deleteMany = c.resolve(SpeciesCategoryDeleteManyUseCase);
    const getAll = c.resolve(SpeciesCategoryGetAllUseCase);

    const c1 = await create.run({ context, dto: { title: "DM-1", presentation: null } });
    const c2 = await create.run({ context, dto: { title: "DM-2", presentation: null } });

    const out = await deleteMany.run({ context, dto: { ids: [c1.id, c2.id] } });
    expect(out.count).toBe(2);

    const remaining = await getAll.run({ context });
    expect(remaining.items.some((x) => x.id === c1.id)).toBe(false);
    expect(remaining.items.some((x) => x.id === c2.id)).toBe(false);
  });

  it("bulkEditByIds updates selected categories via repository updateMany", async () => {
    const create = c.resolve(SpeciesCategoryCreateUseCase);
    const bulkEdit = c.resolve(SpeciesCategoryBulkEditByIdsUseCase);
    const getAll = c.resolve(SpeciesCategoryGetAllUseCase);

    const c1 = await create.run({ context, dto: { title: "BE-1", presentation: null } });
    const c2 = await create.run({ context, dto: { title: "BE-2", presentation: null } });

    const out = await bulkEdit.run({ context, dto: { ids: [c1.id, c2.id], title: "Edited in bulk" } });
    expect(out.count).toBe(2);

    const rows = (await getAll.run({ context })).items.filter((x) => [c1.id, c2.id].includes(x.id));
    expect(rows).toHaveLength(2);
    expect(rows.every((x) => x.title === "Edited in bulk")).toBe(true);
  });

  it("deleteMany in user workspace only deletes rows in that scope (default catalog ids are no-ops)", async () => {
    const workspaceRepo = c.resolve(WorkspaceRoleAssignmentRepositoryPortToken);
    await workspaceRepo.upsertOne({
      subject: SubjectVO.user("no-assignments"),
      workspace: WorkspaceVO.user("no-assignments"),
      role: "admin",
      grantSource: "test",
    });
    const populate = c.resolve(PopulateDefaultCatalogUseCase);
    await populate.run({
      context: {
        actorSubject: bootstrapServiceAccount,
        activeWorkspaceScope: WorkspaceVO.globalShared(),
      },
      dto: { catalog: tinyDefaultCatalog },
    });
    const userCtx = userUseCaseContext("no-assignments");
    const getAll = c.resolve(SpeciesCategoryGetAllUseCase);
    const seeded = (await getAll.run({ context: userCtx })).items.find((x) => x.systemCatalog);
    expect(seeded).toBeTruthy();

    const create = c.resolve(SpeciesCategoryCreateUseCase);
    const custom = await create.run({
      context: userCtx,
      dto: { title: "User category for bulk", presentation: null },
    });

    const deleteMany = c.resolve(SpeciesCategoryDeleteManyUseCase);
    const out = await deleteMany.run({ context: userCtx, dto: { ids: [custom.id, seeded!.id] } });
    expect(out.count).toBe(1);

    const after = await getAll.run({ context: userCtx });
    expect(after.items.some((x) => x.id === seeded!.id)).toBe(true);
    expect(after.items.some((x) => x.id === custom.id)).toBe(false);
  });
});
