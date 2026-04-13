import { defineDefaultCatalog } from "@backend/core/application/use-cases/gardening/default-catalog.config";
import {
  PopulateDefaultCatalogUseCase,
  PopulateDefaultCatalogUseCaseDuplicateCategorySlugError,
  PopulateDefaultCatalogUseCaseUnknownCategorySlugError,
} from "@backend/core/application/use-cases/gardening/populate-default-catalog.use-case";
import { bootstrapPopulateServiceAccount } from "#/backend/core/application/service-accounts";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import { createTestUseCaseContext } from "../create-test-use-case-context";
import {
  SpeciesCategoryCreateUseCase,
  SpeciesCategoryGetAllUseCase,
} from "#/backend/core/application/use-cases/gardening/species-category.use-cases";
import { SpeciesGetAllUseCase } from "#/backend/core/application/use-cases/gardening/species.use-cases";
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
      actorSubject: bootstrapPopulateServiceAccount,
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
      status: "populated",
      createdCategories: 1,
      createdSpecies: 1,
    });

    const categories = (await getCategoriesAll.run({ context: createTestUseCaseContext() })).items;
    expect(categories).toHaveLength(1);
    expect(categories[0]?.systemCatalog).toBe(true);

    const species = (await getSpeciesAll.run({ context: createTestUseCaseContext() })).items;
    expect(species).toHaveLength(1);
    expect(species[0]?.systemCatalog).toBe(true);
    expect(species[0]?.characteristics.name).toBe("Species one");
  });

  it("skips when species categories already exist", async () => {
    const context = createTestUseCaseContext();
    const preCreate = c.resolve(SpeciesCategoryCreateUseCase);
    await preCreate.run({ context, dto: { title: "Pre-existing" } });

    const populate = c.resolve(PopulateDefaultCatalogUseCase);
    const result = await populate.run({
      context: {
        actorSubject: bootstrapPopulateServiceAccount,
        activeWorkspaceScope: WorkspaceVO.globalShared(),
      },
      dto: { catalog: tinyCatalog },
    });

    expect(result).toEqual({ status: "skipped", reason: "catalog-not-empty" });

    const getSpeciesAll = c.resolve(SpeciesGetAllUseCase);
    expect((await getSpeciesAll.run({ context })).items).toHaveLength(0);
  });

  it("second run on same populated store skips", async () => {
    const context = {
      actorSubject: bootstrapPopulateServiceAccount,
      activeWorkspaceScope: WorkspaceVO.globalShared(),
    };
    const populate = c.resolve(PopulateDefaultCatalogUseCase);

    const first = await populate.run({
      context,
      dto: { catalog: tinyCatalog },
    });
    expect(first.status).toBe("populated");

    const second = await populate.run({ context, dto: { catalog: tinyCatalog } });
    expect(second).toEqual({ status: "skipped", reason: "catalog-not-empty" });
  });

  it("throws on duplicate category slugs in config", async () => {
    const context = {
      actorSubject: bootstrapPopulateServiceAccount,
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
      actorSubject: bootstrapPopulateServiceAccount,
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
