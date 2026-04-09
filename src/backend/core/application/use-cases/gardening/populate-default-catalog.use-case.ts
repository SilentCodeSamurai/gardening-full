import type { SpeciesCategoryEntityId } from "@backend/core/domain/gardening/entities";
import type { SpeciesRepositoryPort } from "../../ports/repositories/gardening/species.repository.port";
import type { SpeciesCategoryRepositoryPort } from "../../ports/repositories/gardening/species-category.repository.port";
import { gardeningCatalogRootRef, gardeningSpeciesCategoryRef, gardeningSpeciesRef } from "../../resource-refs";
import type { AccessControlApplicationService } from "../../services/access-control/access-control.application-service";
import { BaseUseCaseError } from "../shared/errors";
import type { IUseCase } from "../shared/use-case.interface";
import type { UseCaseRequest } from "../use-case-context";

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

export type PopulateDefaultCatalogInput = UseCaseRequest<{
	catalog: DefaultCatalogDefinition<readonly DefaultCatalogCategory[]>;
}>;

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
		private readonly access: AccessControlApplicationService,
		private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort,
		private readonly speciesRepository: SpeciesRepositoryPort,
	) {}

	public async execute(input: PopulateDefaultCatalogInput): Promise<PopulateDefaultCatalogOutput> {
		assertUniqueCategorySlugs(input.dto.catalog.categories);

		await this.access.assertCanCreate(input.context, gardeningCatalogRootRef());

		const existing = await this.speciesCategoryRepository.getAll();
		if (existing.items.length > 0) {
			return { status: "skipped", reason: "catalog-not-empty" };
		}

		const slugToCategoryId = new Map<string, SpeciesCategoryEntityId>();

		for (const row of input.dto.catalog.categories) {
			const { slug, ...categoryCreate } = row;
			const created = await this.speciesCategoryRepository.create(categoryCreate);
			slugToCategoryId.set(slug, created.id);
			const categoryRef = gardeningSpeciesCategoryRef(String(created.id));
			await this.access.bootstrapResourceAdminForActor(input.context, categoryRef);
		}

		for (const row of input.dto.catalog.species) {
			const categoryId = slugToCategoryId.get(row.categorySlug);
			if (!categoryId) {
				throw new PopulateDefaultCatalogUseCaseUnknownCategorySlugError({
					categorySlug: row.categorySlug,
				});
			}
			const { categorySlug, ...speciesCreate } = row;
			void categorySlug;
			const species = await this.speciesRepository.create({
				categoryId,
				...speciesCreate,
			});
			const speciesRef = gardeningSpeciesRef(String(species.id));
			await this.access.bootstrapResourceAdminForActor(input.context, speciesRef);
		}

		return {
			status: "populated",
			createdCategories: input.dto.catalog.categories.length,
			createdSpecies: input.dto.catalog.species.length,
		};
	}
}
