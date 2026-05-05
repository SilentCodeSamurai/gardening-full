import { defineDefaultCatalog } from "@backend/core/application/use-cases/gardening/default-catalog.config";
import {
  PopulateDefaultCatalogUseCase,
  PopulateDefaultCatalogUseCaseDuplicateCategorySlugError,
  PopulateDefaultCatalogUseCaseUnknownCategorySlugError,
} from "@backend/core/application/use-cases/gardening/populate-default-catalog.use-case";
import { bootstrapServiceAccount } from "#/backend/core/application/service-accounts";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import { createTestUseCaseContext } from "../create-test-use-case-context";
import {
  SpeciesCategoryCreateUseCase,
  SpeciesCategoryGetAllUseCase,
} from "#/backend/core/application/use-cases/gardening/species-category.use-cases";
import { SpeciesGetAllUseCase } from "#/backend/core/application/use-cases/gardening/species.use-cases";
import { speciesCategoryId, speciesId } from "#/backend/infrastructure/integrations/shared/database-ids";
import { beforeEach, describe, expect, it } from "vitest";

import { createUseCaseTestContainer } from "./create-use-case-test-container";

/** Inline strings: tests only assert persistence shape, not i18n (locale files stay product-only). */
const tinyCatalog = defineDefaultCatalog({
  categories: [{ slug: "a", title: "Category A" }],
  species: [
    {
      categorySlug: "a",
      characteristics: { name: "Species one", description: null },
    },
  ],
});

describe("PopulateDefaultCatalogUseCase", () => {
  let c: ReturnType<typeof createUseCaseTestContainer>;

  beforeEach(() => {
    c = createUseCaseTestContainer();
  });

  it("creates categories and species from catalog when store is empty", async () => {
    const context = {
      actorSubject: bootstrapServiceAccount,
      activeWorkspaceScope: WorkspaceVO.globalShared(),
    };
    const populate = c.resolve(PopulateDefaultCatalogUseCase);
    const getSpeciesAll = c.resolve(SpeciesGetAllUseCase);
    const getCategoriesAll = c.resolve(SpeciesCategoryGetAllUseCase);

    const result = await populate.run({
      context,
      dto: { catalog: tinyCatalog },
    });

    expect(result).toEqual({
      status: "reconciled",
      createdCategories: 1,
      updatedCategories: 0,
      createdSpecies: 1,
      updatedSpecies: 0,
    });

    const categories = (await getCategoriesAll.run({ context: createTestUseCaseContext() })).items;
    expect(categories).toHaveLength(1);
    expect(categories[0]?.systemCatalog).toBe(true);

    const species = (await getSpeciesAll.run({ context: createTestUseCaseContext() })).items;
    expect(species).toHaveLength(1);
    expect(species[0]?.systemCatalog).toBe(true);
    expect(species[0]?.characteristics.name).toBe("Species one");
    expect(species[0]?.id).toBe("system-species:a:Species%20one");
    expect(categories[0]?.id).toBe("system-category:a");
  });

  it("reconciles system catalog even when categories already exist", async () => {
    const context = createTestUseCaseContext();
    const preCreate = c.resolve(SpeciesCategoryCreateUseCase);
    await preCreate.run({ context, dto: { title: "Pre-existing" } });

    const populate = c.resolve(PopulateDefaultCatalogUseCase);
    const result = await populate.run({
      context: {
        actorSubject: bootstrapServiceAccount,
        activeWorkspaceScope: WorkspaceVO.globalShared(),
      },
      dto: { catalog: tinyCatalog },
    });

    expect(result).toEqual({
      status: "reconciled",
      createdCategories: 1,
      updatedCategories: 0,
      createdSpecies: 1,
      updatedSpecies: 0,
    });

    const getCategoriesAll = c.resolve(SpeciesCategoryGetAllUseCase);
    const getSpeciesAll = c.resolve(SpeciesGetAllUseCase);
    expect((await getCategoriesAll.run({ context })).items).toHaveLength(2);
    expect((await getSpeciesAll.run({ context })).items).toHaveLength(1);
  });

  it("second run on same populated store skips", async () => {
    const context = {
      actorSubject: bootstrapServiceAccount,
      activeWorkspaceScope: WorkspaceVO.globalShared(),
    };
    const populate = c.resolve(PopulateDefaultCatalogUseCase);

    const first = await populate.run({
      context,
      dto: { catalog: tinyCatalog },
    });
    expect(first.status).toBe("reconciled");

    const second = await populate.run({ context, dto: { catalog: tinyCatalog } });
    expect(second).toEqual({ status: "skipped", reason: "up-to-date" });
  });

  it("applies catalog migrations when stable system ids already exist", async () => {
    const context = {
      actorSubject: bootstrapServiceAccount,
      activeWorkspaceScope: WorkspaceVO.globalShared(),
    };
    const populate = c.resolve(PopulateDefaultCatalogUseCase);
    const getCategoriesAll = c.resolve(SpeciesCategoryGetAllUseCase);
    const getSpeciesAll = c.resolve(SpeciesGetAllUseCase);

    await populate.run({
      context,
      dto: { catalog: tinyCatalog },
    });

    const migratedCatalog = defineDefaultCatalog({
      categories: [
        { slug: "a", title: "Category A (renamed)" },
        { slug: "b", title: "Category B" },
      ],
      species: [
        {
          categorySlug: "a",
          characteristics: { name: "Species one", description: "updated description" },
        },
        {
          categorySlug: "b",
          characteristics: { name: "Species two", description: null },
        },
      ],
    });

    const migrationResult = await populate.run({
      context,
      dto: { catalog: migratedCatalog },
    });

    expect(migrationResult).toEqual({
      status: "reconciled",
      createdCategories: 1,
      updatedCategories: 1,
      createdSpecies: 1,
      updatedSpecies: 1,
    });

    const categories = (await getCategoriesAll.run({ context: createTestUseCaseContext() })).items;
    const species = (await getSpeciesAll.run({ context: createTestUseCaseContext() })).items;

    expect(categories).toHaveLength(2);
    expect(species).toHaveLength(2);
    expect(categories.map((x) => x.id)).toEqual(
      expect.arrayContaining(["system-category:a", "system-category:b"]),
    );
    expect(species.map((x) => x.id)).toEqual(
      expect.arrayContaining(["system-species:a:Species%20one", "system-species:b:Species%20two"]),
    );
    expect(species.find((x) => x.id === "system-species:a:Species%20one")?.characteristics.description).toBe(
      "updated description",
    );
  });

  it("uses ids from catalog config as stable identity for updates", async () => {
    const context = {
      actorSubject: bootstrapServiceAccount,
      activeWorkspaceScope: WorkspaceVO.globalShared(),
    };
    const populate = c.resolve(PopulateDefaultCatalogUseCase);
    const getSpeciesAll = c.resolve(SpeciesGetAllUseCase);

    const v1 = defineDefaultCatalog({
      categories: [{ id: speciesCategoryId("system-category:custom-a"), slug: "a", title: "Category A" }],
      species: [
        {
          id: speciesId("system-species:custom-a:one"),
          categorySlug: "a",
          characteristics: { name: "Species one", description: null },
        },
      ],
    });

    const v2 = defineDefaultCatalog({
      categories: [{ id: speciesCategoryId("system-category:custom-a"), slug: "a", title: "Category A" }],
      species: [
        {
          id: speciesId("system-species:custom-a:one"),
          categorySlug: "a",
          characteristics: { name: "Species one renamed", description: "desc v2" },
        },
      ],
    });

    await populate.run({ context, dto: { catalog: v1 } });
    const result = await populate.run({ context, dto: { catalog: v2 } });

    expect(result).toEqual({
      status: "reconciled",
      createdCategories: 0,
      updatedCategories: 0,
      createdSpecies: 0,
      updatedSpecies: 1,
    });

    const species = (await getSpeciesAll.run({ context: createTestUseCaseContext() })).items;
    expect(species).toHaveLength(1);
    expect(species[0]?.id).toBe("system-species:custom-a:one");
    expect(species[0]?.characteristics.name).toBe("Species one renamed");
  });

  it("throws on duplicate category slugs in config", async () => {
    const context = {
      actorSubject: bootstrapServiceAccount,
      activeWorkspaceScope: WorkspaceVO.globalShared(),
    };
    const populate = c.resolve(PopulateDefaultCatalogUseCase);

    const bad = defineDefaultCatalog({
      categories: [
        { slug: "dup", title: "One" },
        { slug: "dup", title: "Two" },
      ],
      species: [],
    });

    const duplicateSlug = populate.run({ context, dto: { catalog: bad } });
    await expect(duplicateSlug).rejects.toBeInstanceOf(
      PopulateDefaultCatalogUseCaseDuplicateCategorySlugError,
    );
    await expect(duplicateSlug).rejects.toMatchObject({
      context: { slug: "dup" },
    });
  });

  it("rolls back created categories when a species references unknown category slug", async () => {
    const context = {
      actorSubject: bootstrapServiceAccount,
      activeWorkspaceScope: WorkspaceVO.globalShared(),
    };
    const populate = c.resolve(PopulateDefaultCatalogUseCase);

    const bad = defineDefaultCatalog({
      categories: [{ slug: "known", title: "Known" }],
      species: [
        {
          // @ts-expect-error: test error case
          categorySlug: "unknown",
          characteristics: { name: "Broken species", description: null },
        },
      ],
    });

    await expect(populate.run({ context, dto: { catalog: bad } })).rejects.toBeInstanceOf(
      PopulateDefaultCatalogUseCaseUnknownCategorySlugError,
    );

    const categories = await c.resolve(SpeciesCategoryGetAllUseCase).run({ context: createTestUseCaseContext() });
    const species = await c.resolve(SpeciesGetAllUseCase).run({ context: createTestUseCaseContext() });
    expect(categories.items).toHaveLength(0);
    expect(species.items).toHaveLength(0);
  });
});
