import type { SpeciesCategoryRepositoryPort } from "../../ports/repositories/gardening/species-category.repository.port";
import type { SpeciesRepositoryPort } from "../../ports/repositories/gardening/species.repository.port";
import type { SpeciesCategoryEntityId } from "@backend/core/domain/gardening/entities";
import { BaseUseCaseError } from "../shared/errors";
import type { IUseCase } from "../shared/use-case.interface";

import type { DefaultCatalogCategory, DefaultCatalogDefinition } from "./default-catalog.config";

export class PopulateDefaultCatalogUseCaseDuplicateCategorySlugError extends BaseUseCaseError {
	constructor(params: { slug: string }) {
		super({
			message: `Duplicate default catalog category slug: ${params.slug}`,
			useCaseName: "PopulateDefaultCatalogUseCase",
			context: params,
		});
	}
}

export class PopulateDefaultCatalogUseCaseUnknownCategorySlugError extends BaseUseCaseError {
	constructor(params: { categorySlug: string }) {
		super({
			message: `Default catalog species references unknown category slug: ${params.categorySlug}`,
			useCaseName: "PopulateDefaultCatalogUseCase",
			context: params,
		});
	}
}

export type PopulateDefaultCatalogInput = {
	catalog: DefaultCatalogDefinition<readonly DefaultCatalogCategory[]>;
};

export type PopulateDefaultCatalogOutput =
	| { status: "skipped"; reason: "catalog-not-empty" }
	| { status: "populated"; createdCategories: number; createdSpecies: number };

function assertUniqueCategorySlugs(categories: readonly DefaultCatalogCategory[]): void {
	const seen = new Set<string>();
	for (const c of categories) {
		if (seen.has(c.slug)) {
			throw new PopulateDefaultCatalogUseCaseDuplicateCategorySlugError({ slug: c.slug });
		}
		seen.add(c.slug);
	}
}

export class PopulateDefaultCatalogUseCase
	implements IUseCase<PopulateDefaultCatalogInput, PopulateDefaultCatalogOutput>
{
	constructor(
		private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort,
		private readonly speciesRepository: SpeciesRepositoryPort,
	) {}

	public async execute(input: PopulateDefaultCatalogInput): Promise<PopulateDefaultCatalogOutput> {
		assertUniqueCategorySlugs(input.catalog.categories);

		const existing = await this.speciesCategoryRepository.getAll(undefined);
		if (existing.items.length > 0) {
			return { status: "skipped", reason: "catalog-not-empty" };
		}

		const slugToCategoryId = new Map<string, SpeciesCategoryEntityId>();

		for (const row of input.catalog.categories) {
			const { slug, ...categoryCreate } = row;
			const created = await this.speciesCategoryRepository.create({
				...categoryCreate,
				isDefault: true,
			});
			slugToCategoryId.set(slug, created.id);
		}

		for (const row of input.catalog.species) {
			const categoryId = slugToCategoryId.get(row.categorySlug);
			if (!categoryId) {
				throw new PopulateDefaultCatalogUseCaseUnknownCategorySlugError({
					categorySlug: row.categorySlug,
				});
			}
			const { categorySlug, ...speciesCreate } = row;
			void categorySlug;
			await this.speciesRepository.create({ categoryId, ...speciesCreate, isDefault: true });
		}

		return {
			status: "populated",
			createdCategories: input.catalog.categories.length,
			createdSpecies: input.catalog.species.length,
		};
	}
}
