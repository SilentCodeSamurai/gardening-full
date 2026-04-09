import { defineDefaultCatalog } from "@backend/core/application/use-cases/gardening/default-catalog.config";
import {
  PopulateDefaultCatalogUseCase,
  PopulateDefaultCatalogUseCaseDuplicateCategorySlugError,
} from "@backend/core/application/use-cases/gardening/populate-default-catalog.use-case";
import { createCatalogPopulateUseCaseContext } from "#/backend/core/application/use-cases/use-case-context.defaults";
import { createTestUseCaseContext } from "../create-test-use-case-context";
import {
  SpeciesCategoryCreateUseCase,
  SpeciesCategoryGetAllUseCase,
} from "@backend/core/application/use-cases/gardening/species-category.crud-use-cases";
import { SpeciesGetAllUseCase } from "@backend/core/application/use-cases/gardening/species.crud-use-cases";
import { describe, expect, it } from "vitest";

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
  it("creates categories and species from catalog when store is empty", async () => {
    const c = createUseCaseTestContainer();
    const context = createCatalogPopulateUseCaseContext();
    const populate = c.resolve(PopulateDefaultCatalogUseCase);
    const getSpeciesAll = c.resolve(SpeciesGetAllUseCase);
    const getCategoriesAll = c.resolve(SpeciesCategoryGetAllUseCase);

    const result = await populate.execute({
      context,
      dto: { catalog: tinyCatalog },
    });

    expect(result).toEqual({
      status: "populated",
      createdCategories: 1,
      createdSpecies: 1,
    });

    const categories = (await getCategoriesAll.execute({ context: createTestUseCaseContext() })).items;
    expect(categories).toHaveLength(1);
    expect(categories[0]?.systemCatalog).toBe(true);

    const species = (await getSpeciesAll.execute({ context: createTestUseCaseContext() })).items;
    expect(species).toHaveLength(1);
    expect(species[0]?.systemCatalog).toBe(true);
    expect(species[0]?.characteristics.name).toBe("Species one");
  });

  it("skips when species categories already exist", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const preCreate = c.resolve(SpeciesCategoryCreateUseCase);
    await preCreate.execute({ context, dto: { title: "Pre-existing" } });

    const populate = c.resolve(PopulateDefaultCatalogUseCase);
    const result = await populate.execute({
      context: createCatalogPopulateUseCaseContext(),
      dto: { catalog: tinyCatalog },
    });

    expect(result).toEqual({ status: "skipped", reason: "catalog-not-empty" });

    const getSpeciesAll = c.resolve(SpeciesGetAllUseCase);
    expect((await getSpeciesAll.execute({ context })).items).toHaveLength(0);
  });

  it("second run on same populated store skips", async () => {
    const c = createUseCaseTestContainer();
    const context = createCatalogPopulateUseCaseContext();
    const populate = c.resolve(PopulateDefaultCatalogUseCase);

    const first = await populate.execute({
      context,
      dto: { catalog: tinyCatalog },
    });
    expect(first.status).toBe("populated");

    const second = await populate.execute({ context, dto: { catalog: tinyCatalog } });
    expect(second).toEqual({ status: "skipped", reason: "catalog-not-empty" });
  });

  it("throws on duplicate category slugs in config", async () => {
    const c = createUseCaseTestContainer();
    const context = createCatalogPopulateUseCaseContext();
    const populate = c.resolve(PopulateDefaultCatalogUseCase);

    const bad = defineDefaultCatalog({
      categories: [
        { slug: "dup", title: "One" },
        { slug: "dup", title: "Two" },
      ],
      species: [],
    });

    const duplicateSlug = populate.execute({ context, dto: { catalog: bad } });
    await expect(duplicateSlug).rejects.toBeInstanceOf(
      PopulateDefaultCatalogUseCaseDuplicateCategorySlugError,
    );
    await expect(duplicateSlug).rejects.toMatchObject({
      context: { slug: "dup" },
    });
  });
});
