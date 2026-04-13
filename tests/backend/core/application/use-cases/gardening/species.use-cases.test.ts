import {
  SpeciesCreateUseCase,
  SpeciesDeleteUseCase,
  SpeciesGetAllUseCase,
  SpeciesGetByIdUseCase,
  SpeciesUpdateUseCase,
} from "#/backend/core/application/use-cases/gardening/species.use-cases";
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { bootstrapPopulateServiceAccount } from "#/backend/core/application/service-accounts";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import { createTestUseCaseContext } from "../create-test-use-case-context";
import { PopulateDefaultCatalogUseCase } from "@backend/core/application/use-cases/gardening/populate-default-catalog.use-case";
import {
  speciesCategoryId,
  speciesId,
} from "@backend/infrastructure/integrations/shared/database-ids";
import { describe, expect, it } from "vitest";

import { createUseCaseTestContainer } from "./create-use-case-test-container";
import { seedMinimalCatalog } from "../../../../helpers/gardening/seed-minimal-catalog";
import { fixtureSpeciesCharacteristics } from "../../../../helpers/gardening/test-fixtures";
import { defineDefaultCatalog } from "@backend/core/application/use-cases/gardening/default-catalog.config";

describe("Species use-cases", () => {
  const tinyDefaultCatalog = defineDefaultCatalog({
    categories: [{ slug: "seeded", title: "Seeded category" }],
    species: [
      {
        categorySlug: "seeded",
        characteristics: { name: "Seeded species", description: null },
      },
    ],
  });

  it("CRUD happy path", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { category } = await seedMinimalCatalog(c);
    const create = c.resolve(SpeciesCreateUseCase);
    const getById = c.resolve(SpeciesGetByIdUseCase);
    const getAll = c.resolve(SpeciesGetAllUseCase);
    const update = c.resolve(SpeciesUpdateUseCase);
    const del = c.resolve(SpeciesDeleteUseCase);

    const row = await create.execute({
      context,
      dto: { categoryId: category.id, characteristics: fixtureSpeciesCharacteristics({ name: "Tomato" }) },
    });
    expect(row.characteristics.name).toBe("Tomato");

    expect((await getById.execute({ context, dto: { id: row.id } })).id).toEqual(row.id);
    expect((await getAll.execute({ context })).items.map((s) => s.id)).toContainEqual(row.id);

    const updated = await update.execute({
      context,
      dto: { id: row.id, characteristics: fixtureSpeciesCharacteristics({ name: "Cherry tomato" }) },
    });
    expect(updated.characteristics.name).toBe("Cherry tomato");

    await del.execute({ context, dto: { id: row.id } });
    expect((await getAll.execute({ context })).items.filter((s) => s.id === row.id)).toHaveLength(0);
    const missing = getById.execute({ context, dto: { id: row.id } });
    await expect(missing).rejects.toBeInstanceOf(RepositoryNotFoundError);
    await expect(missing).rejects.toMatchObject({
      resource: "Species",
      context: {
        id: expect.arrayContaining([expect.objectContaining({ id: row.id })]),
      },
    });
  });

  it("create throws when categoryId does not exist", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const create = c.resolve(SpeciesCreateUseCase);
    const missingCategoryId = speciesCategoryId();
    const createMissingCategory = create.execute({
      context,
      dto: { categoryId: missingCategoryId, characteristics: fixtureSpeciesCharacteristics() },
    });
    await expect(createMissingCategory).rejects.toBeInstanceOf(RepositoryNotFoundError);
    await expect(createMissingCategory).rejects.toMatchObject({
      resource: "SpeciesCategory",
      context: { id: missingCategoryId },
    });
  });

  it("update throws when species missing", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const update = c.resolve(SpeciesUpdateUseCase);
    const missingSpeciesId = speciesId();
    const updateMissing = update.execute({
      context,
      dto: { id: missingSpeciesId, characteristics: fixtureSpeciesCharacteristics() },
    });
    await expect(updateMissing).rejects.toBeInstanceOf(RepositoryNotFoundError);
  }); 

  it("update throws when categoryId invalid", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { species } = await seedMinimalCatalog(c);
    const update = c.resolve(SpeciesUpdateUseCase);
    const missingCategoryId = speciesCategoryId();
    const updateMissingCategory = update.execute({
      context,
      dto: { id: species.id, categoryId: missingCategoryId },
    });
    await expect(updateMissingCategory).rejects.toBeInstanceOf(RepositoryNotFoundError);
    await expect(updateMissingCategory).rejects.toMatchObject({
      resource: "SpeciesCategory",
      context: { id: missingCategoryId },
    });
  });

  it("getById throws when missing", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const missingSpeciesId = speciesId();
    const getMissing = c.resolve(SpeciesGetByIdUseCase).execute({ context, dto: { id: missingSpeciesId } });
    await expect(getMissing).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("delete throws when missing", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const missingSpeciesId = speciesId();
    const deleteMissing = c.resolve(SpeciesDeleteUseCase).execute({ context, dto: { id: missingSpeciesId } });
    await expect(deleteMissing).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("delete throws when cultivars still reference species", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { species } = await seedMinimalCatalog(c);
    const del = c.resolve(SpeciesDeleteUseCase);
    const conflict = del.execute({ context, dto: { id: species.id } });
    await expect(conflict).rejects.toBeInstanceOf(RepositoryConflictError);
    await expect(conflict).rejects.toMatchObject({
      operation: "delete",
      reason: "cultivar-reference-species",
      context: { speciesId: species.id },
    });
  });

  it("update allows populated catalog species in simplified workspace model", async () => {
    const c = createUseCaseTestContainer();
    const session = createTestUseCaseContext();
    const populate = c.resolve(PopulateDefaultCatalogUseCase);
    await populate.execute({
      context: {
        actorSubject: bootstrapPopulateServiceAccount,
        activeWorkspaceScope: WorkspaceVO.globalShared(),
      },
      dto: { catalog: tinyDefaultCatalog },
    });

    const getAll = c.resolve(SpeciesGetAllUseCase);
    const seeded = (await getAll.execute({ context: session })).items[0];
    expect(seeded?.systemCatalog).toBe(true);

    const update = c.resolve(SpeciesUpdateUseCase);
    const attempted = update.execute({
      context: session,
      dto: { id: seeded!.id, characteristics: fixtureSpeciesCharacteristics({ name: "Edited seeded species" }) },
    });
    await expect(attempted).resolves.toMatchObject({ id: seeded!.id });
  });

  it("delete allows populated catalog species in simplified workspace model", async () => {
    const c = createUseCaseTestContainer();
    const session = createTestUseCaseContext();
    const populate = c.resolve(PopulateDefaultCatalogUseCase);
    await populate.execute({
      context: {
        actorSubject: bootstrapPopulateServiceAccount,
        activeWorkspaceScope: WorkspaceVO.globalShared(),
      },
      dto: { catalog: tinyDefaultCatalog },
    });

    const getAll = c.resolve(SpeciesGetAllUseCase);
    const seeded = (await getAll.execute({ context: session })).items[0];
    expect(seeded?.systemCatalog).toBe(true);

    const del = c.resolve(SpeciesDeleteUseCase);
    const attempted = del.execute({ context: session, dto: { id: seeded!.id } });
    await expect(attempted).resolves.toEqual(seeded!.id);
  });
});
