import {
  SpeciesBulkEditByIdsUseCase,
  SpeciesCreateUseCase,
  SpeciesDeleteManyUseCase,
  SpeciesDeleteUseCase,
  SpeciesGetAllUseCase,
  SpeciesGetByIdUseCase,
  SpeciesUpdateUseCase,
} from "#/backend/core/application/use-cases/gardening/species.use-cases";
import { CultivarGetAllUseCase } from "@backend/core/application/use-cases/gardening/cultivar.use-cases";
import {
  RepositoryNotFoundError,
} from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { WorkspaceRoleAssignmentRepositoryPortToken } from "#/backend/core/application/ports/repositories/access/workspace-role-assignment.repository.port";
import { bootstrapServiceAccount } from "#/backend/core/application/service-accounts";
import { SubjectVO } from "@backend/core/domain/access/subject.vo";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import { createTestUseCaseContext } from "../create-test-use-case-context";
import { PopulateDefaultCatalogUseCase } from "@backend/core/application/use-cases/gardening/populate-default-catalog.use-case";
import { beforeEach, describe, expect, it } from "vitest";

import { userUseCaseContext } from "../../../../helpers/use-case-context";
import { createUseCaseTestContainer } from "./create-use-case-test-container";
import { seedMinimalCatalog } from "../../../../helpers/gardening/seed-minimal-catalog";
import { fixtureSpeciesCharacteristics } from "../../../../helpers/gardening/test-fixtures";
import { defineDefaultCatalog } from "@backend/core/application/use-cases/gardening/default-catalog.config";

describe("Species use-cases", () => {
  let c: ReturnType<typeof createUseCaseTestContainer>;
  let context: ReturnType<typeof createTestUseCaseContext>;

  beforeEach(() => {
    c = createUseCaseTestContainer();
    context = createTestUseCaseContext();
  });

  const tinyDefaultCatalog = defineDefaultCatalog({
    categories: [{ slug: "seeded", title: "Seeded category", presentation: null }],
    species: [
      {
        categorySlug: "seeded",
        characteristics: { name: "Seeded species", description: null },
        presentation: null,
      },
    ],
  });

  it("CRUD happy path", async () => {
    const { category } = await seedMinimalCatalog(c);
    const create = c.resolve(SpeciesCreateUseCase);
    const getById = c.resolve(SpeciesGetByIdUseCase);
    const getAll = c.resolve(SpeciesGetAllUseCase);
    const update = c.resolve(SpeciesUpdateUseCase);
    const del = c.resolve(SpeciesDeleteUseCase);

    const row = await create.run({
      context,
      dto: {
        categoryId: category.id,
        characteristics: fixtureSpeciesCharacteristics({ name: "Tomato" }),
        presentation: null,
      },
    });
    expect(row.characteristics.name).toBe("Tomato");

    expect((await getById.run({ context, dto: { id: row.id } })).id).toEqual(row.id);
    expect((await getAll.run({ context })).items.map((s) => s.id)).toContainEqual(row.id);

    const updated = await update.run({
      context,
      dto: { id: row.id, characteristics: fixtureSpeciesCharacteristics({ name: "Cherry tomato" }) },
    });
    expect(updated.characteristics.name).toBe("Cherry tomato");

    await del.run({ context, dto: { id: row.id } });
    expect((await getAll.run({ context })).items.filter((s) => s.id === row.id)).toHaveLength(0);
    const missing = getById.run({ context, dto: { id: row.id } });
    await expect(missing).rejects.toBeInstanceOf(RepositoryNotFoundError);
    await expect(missing).rejects.toMatchObject({
      resource: "Species",
      context: {
        id: expect.arrayContaining([expect.objectContaining({ id: row.id })]),
      },
    });
  });

  it("create throws when categoryId does not exist", async () => {
    const create = c.resolve(SpeciesCreateUseCase);
    const missingCategoryId = "missing-category-id" as never;
    const createMissingCategory = create.run({
      context,
      dto: { categoryId: missingCategoryId, characteristics: fixtureSpeciesCharacteristics(), presentation: null },
    });
    await expect(createMissingCategory).rejects.toBeInstanceOf(RepositoryNotFoundError);
    await expect(createMissingCategory).rejects.toMatchObject({
      resource: "SpeciesCategory",
      context: {
        id: expect.arrayContaining([expect.objectContaining({ id: missingCategoryId })]),
      },
    });
  });

  it("update throws when species missing", async () => {
    const update = c.resolve(SpeciesUpdateUseCase);
    const missingSpeciesId = "missing-species-id" as never;
    const updateMissing = update.run({
      context,
      dto: { id: missingSpeciesId, characteristics: fixtureSpeciesCharacteristics() },
    });
    await expect(updateMissing).rejects.toBeInstanceOf(RepositoryNotFoundError);
  }); 

  it("update throws when categoryId invalid", async () => {
    const { species } = await seedMinimalCatalog(c);
    const update = c.resolve(SpeciesUpdateUseCase);
    const missingCategoryId = "missing-category-id" as never;
    const updateMissingCategory = update.run({
      context,
      dto: { id: species.id, categoryId: missingCategoryId },
    });
    await expect(updateMissingCategory).rejects.toBeInstanceOf(RepositoryNotFoundError);
    await expect(updateMissingCategory).rejects.toMatchObject({
      resource: "SpeciesCategory",
      context: {
        id: expect.arrayContaining([expect.objectContaining({ id: missingCategoryId })]),
      },
    });
  });

  it("getById throws when missing", async () => {
    const missingSpeciesId = "missing-species-id" as never;
    const getMissing = c.resolve(SpeciesGetByIdUseCase).run({ context, dto: { id: missingSpeciesId } });
    await expect(getMissing).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("delete throws when missing", async () => {
    const missingSpeciesId = "missing-species-id" as never;
    const deleteMissing = c.resolve(SpeciesDeleteUseCase).run({ context, dto: { id: missingSpeciesId } });
    await expect(deleteMissing).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("delete unbinds cultivars that still reference species", async () => {
    const { species } = await seedMinimalCatalog(c);
    const linkedCultivar = (await c.resolve(CultivarGetAllUseCase).run({ context })).items.find(
      (cultivar) => cultivar.speciesId === species.id,
    );
    expect(linkedCultivar).toBeDefined();

    const del = c.resolve(SpeciesDeleteUseCase);
    await del.run({ context, dto: { id: species.id } });

    const allCultivars = await c.resolve(CultivarGetAllUseCase).run({ context });
    const updatedLinkedCultivar = allCultivars.items.find((cultivar) => cultivar.id === linkedCultivar?.id);
    expect(updatedLinkedCultivar?.speciesId).toBeNull();
  });

  it("update allows populated catalog species in simplified workspace model", async () => {
    const session = createTestUseCaseContext();
    const populate = c.resolve(PopulateDefaultCatalogUseCase);
    await populate.run({
      context: {
        actorSubject: bootstrapServiceAccount,
        activeWorkspaceScope: WorkspaceVO.globalShared(),
      },
      dto: { catalog: tinyDefaultCatalog },
    });

    const getAll = c.resolve(SpeciesGetAllUseCase);
    const seeded = (await getAll.run({ context: session })).items[0];
    expect(seeded?.systemCatalog).toBe(true);

    const update = c.resolve(SpeciesUpdateUseCase);
    const attempted = update.run({
      context: session,
      dto: { id: seeded!.id, characteristics: fixtureSpeciesCharacteristics({ name: "Edited seeded species" }) },
    });
    await expect(attempted).resolves.toMatchObject({ id: seeded!.id });
  });

  it("delete allows populated catalog species in simplified workspace model", async () => {
    const session = createTestUseCaseContext();
    const populate = c.resolve(PopulateDefaultCatalogUseCase);
    await populate.run({
      context: {
        actorSubject: bootstrapServiceAccount,
        activeWorkspaceScope: WorkspaceVO.globalShared(),
      },
      dto: { catalog: tinyDefaultCatalog },
    });

    const getAll = c.resolve(SpeciesGetAllUseCase);
    const seeded = (await getAll.run({ context: session })).items[0];
    expect(seeded?.systemCatalog).toBe(true);

    const del = c.resolve(SpeciesDeleteUseCase);
    const attempted = del.run({ context: session, dto: { id: seeded!.id } });
    await expect(attempted).resolves.toEqual(seeded!.id);
  });

  it("deleteMany removes requested species", async () => {
    const { category } = await seedMinimalCatalog(c);
    const create = c.resolve(SpeciesCreateUseCase);
    const deleteMany = c.resolve(SpeciesDeleteManyUseCase);
    const getAll = c.resolve(SpeciesGetAllUseCase);

    const s1 = await create.run({
      context,
      dto: {
        categoryId: category.id,
        characteristics: fixtureSpeciesCharacteristics({ name: "dm-1" }),
        presentation: null,
      },
    });
    const s2 = await create.run({
      context,
      dto: {
        categoryId: category.id,
        characteristics: fixtureSpeciesCharacteristics({ name: "dm-2" }),
        presentation: null,
      },
    });

    const out = await deleteMany.run({ context, dto: { ids: [s1.id, s2.id] } });
    expect(out.count).toBe(2);

    const remaining = await getAll.run({ context });
    expect(remaining.items.some((s) => s.id === s1.id)).toBe(false);
    expect(remaining.items.some((s) => s.id === s2.id)).toBe(false);
  });

  it("bulkEditByIds updates selected species via repository updateMany", async () => {
    const { category } = await seedMinimalCatalog(c);
    const create = c.resolve(SpeciesCreateUseCase);
    const bulkEdit = c.resolve(SpeciesBulkEditByIdsUseCase);
    const getAll = c.resolve(SpeciesGetAllUseCase);

    const s1 = await create.run({
      context,
      dto: { categoryId: category.id, characteristics: fixtureSpeciesCharacteristics({ name: "be-1" }), presentation: null },
    });
    const s2 = await create.run({
      context,
      dto: { categoryId: category.id, characteristics: fixtureSpeciesCharacteristics({ name: "be-2" }), presentation: null },
    });

    const out = await bulkEdit.run({
      context,
      dto: { ids: [s1.id, s2.id], characteristics: fixtureSpeciesCharacteristics({ name: "bulk-edited" }) },
    });
    expect(out.count).toBe(2);

    const edited = (await getAll.run({ context })).items.filter((x) => [s1.id, s2.id].includes(x.id));
    expect(edited).toHaveLength(2);
    expect(edited.every((x) => x.characteristics.name === "bulk-edited")).toBe(true);
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
    const getAll = c.resolve(SpeciesGetAllUseCase);
    const seeded = (await getAll.run({ context: userCtx })).items.find((s) => s.systemCatalog);
    expect(seeded).toBeTruthy();

    const create = c.resolve(SpeciesCreateUseCase);
    const custom = await create.run({
      context: userCtx,
      dto: {
        categoryId: seeded!.categoryId,
        characteristics: fixtureSpeciesCharacteristics({ name: "user-species-bulk" }),
        presentation: null,
      },
    });

    const deleteMany = c.resolve(SpeciesDeleteManyUseCase);
    const out = await deleteMany.run({ context: userCtx, dto: { ids: [custom.id, seeded!.id] } });
    expect(out.count).toBe(1);

    const after = await getAll.run({ context: userCtx });
    expect(after.items.some((s) => s.id === seeded!.id)).toBe(true);
    expect(after.items.some((s) => s.id === custom.id)).toBe(false);
  });
});
