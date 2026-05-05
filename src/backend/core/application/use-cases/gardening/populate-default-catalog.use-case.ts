import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { SpeciesCategoryEntityId, SpeciesEntityId } from "@backend/core/domain/gardening/entities";
import { inject, injectable } from "tsyringe";
import {
	type SpeciesRepositoryPort,
	SpeciesRepositoryPortToken,
} from "../../ports/repositories/gardening/species.repository.port";
import {
	type SpeciesCategoryRepositoryPort,
	SpeciesCategoryRepositoryPortToken,
} from "../../ports/repositories/gardening/species-category.repository.port";
import {
	type TransactionManagerPort,
	TransactionManagerPortToken,
} from "../../ports/transaction/transaction-manager.port";
import { AccessControlApplicationService } from "../../services/access-control/access-control.application-service";
import { BaseUseCaseError } from "../shared/errors";
import { TransactionalUseCase } from "../shared/transactional.use-case";
import type { UseCaseRequest } from "../use-case-context";

import type { DefaultCatalogCategory, DefaultCatalogDefinition } from "./default-catalog.config";

export class PopulateDefaultCatalogUseCaseDuplicateCategorySlugError extends BaseUseCaseError {
	constructor(params: { slug: string }) {
		super({
			message: `Duplicate default catalog category slug: ${params.slug}`,
			i18nMessageKey: "errors_application_populate_default_catalog_duplicate_category_slug",
			useCaseName: "PopulateDefaultCatalogUseCase",
			context: params,
		});
	}
}

export class PopulateDefaultCatalogUseCaseUnknownCategorySlugError extends BaseUseCaseError {
	constructor(params: { categorySlug: string }) {
		super({
			message: `Default catalog species references unknown category slug: ${params.categorySlug}`,
			i18nMessageKey: "errors_application_populate_default_catalog_unknown_category_slug",
			useCaseName: "PopulateDefaultCatalogUseCase",
			context: params,
		});
	}
}

export type PopulateDefaultCatalogInput = UseCaseRequest<{
	catalog: DefaultCatalogDefinition<readonly DefaultCatalogCategory[]>;
}>;

export type PopulateDefaultCatalogOutput =
	| { status: "skipped"; reason: "up-to-date" }
	| {
			status: "reconciled";
			createdCategories: number;
			updatedCategories: number;
			createdSpecies: number;
			updatedSpecies: number;
	  };

function assertUniqueCategorySlugs(categories: readonly DefaultCatalogCategory[]): void {
	const seen = new Set<string>();
	for (const c of categories) {
		if (seen.has(c.slug)) {
			throw new PopulateDefaultCatalogUseCaseDuplicateCategorySlugError({ slug: c.slug });
		}
		seen.add(c.slug);
	}
}

function toStablePart(input: string): string {
	return encodeURIComponent(input);
}

function makeSystemCategoryId(slug: string): SpeciesCategoryEntityId {
	return `system-category:${toStablePart(slug)}` as SpeciesCategoryEntityId;
}

function makeSystemSpeciesId(categorySlug: string, speciesName: string): SpeciesEntityId {
	return `system-species:${toStablePart(categorySlug)}:${toStablePart(speciesName)}` as SpeciesEntityId;
}

@injectable()
export class PopulateDefaultCatalogUseCase extends TransactionalUseCase<
	PopulateDefaultCatalogInput,
	PopulateDefaultCatalogOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpeciesCategoryRepositoryPortToken)
		private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort,
		@inject(SpeciesRepositoryPortToken) private readonly speciesRepository: SpeciesRepositoryPort,
		@inject(TransactionManagerPortToken) transactionManager: TransactionManagerPort,
	) {
		super(transactionManager);
	}

	protected async execute(input: PopulateDefaultCatalogInput): Promise<PopulateDefaultCatalogOutput> {
		assertUniqueCategorySlugs(input.dto.catalog.categories);

		const globalShared = WorkspaceVO.globalShared();
		await this.access.assertCanPerformActionOnWorkspace({
			actorSubject: input.context.actorSubject,
			activeWorkspaceScope: globalShared,
			action: "create",
		});

		const existingCategories = await this.speciesCategoryRepository.getMany({
			filters: [{ workspace: globalShared }],
		});
		const existingSpecies = await this.speciesRepository.getMany({
			filters: [{ workspace: globalShared }],
		});

		const slugToCategoryId = new Map<string, SpeciesCategoryEntityId>();
		const existingCategoriesById = new Map(existingCategories.items.map((item) => [String(item.id), item]));
		const existingSpeciesById = new Map(existingSpecies.items.map((item) => [String(item.id), item]));
		let createdCategories = 0;
		let updatedCategories = 0;
		let createdSpecies = 0;
		let updatedSpecies = 0;

		for (const row of input.dto.catalog.categories) {
			const { slug, ...categoryCreate } = row;
			const expectedId = row.id ?? makeSystemCategoryId(slug);
			const existingById = existingCategoriesById.get(String(expectedId));
			if (existingById) {
				const categoryNeedsUpdate =
					existingById.title !== categoryCreate.title ||
					JSON.stringify(existingById.presentation ?? null) !==
						JSON.stringify(categoryCreate.presentation ?? null);
				if (categoryNeedsUpdate) {
					await this.speciesCategoryRepository.updateOne({
						filters: [{ id: expectedId, workspace: globalShared }],
						dto: {
							title: categoryCreate.title,
							presentation: categoryCreate.presentation,
						},
					});
					updatedCategories += 1;
				}
				slugToCategoryId.set(slug, existingById.id);
				continue;
			}
			const created = await this.speciesCategoryRepository.createOne({
				id: expectedId,
				...categoryCreate,
				workspace: globalShared,
			});
			createdCategories += 1;
			slugToCategoryId.set(slug, created.id);
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
			const expectedId = row.id ?? makeSystemSpeciesId(categorySlug, row.characteristics.name);
			const existingById = existingSpeciesById.get(String(expectedId));
			if (existingById) {
				const speciesNeedsUpdate =
					String(existingById.categoryId) !== String(categoryId) ||
					JSON.stringify(existingById.characteristics) !== JSON.stringify(speciesCreate.characteristics) ||
					JSON.stringify(existingById.presentation ?? null) !== JSON.stringify(speciesCreate.presentation ?? null);
				if (speciesNeedsUpdate) {
					await this.speciesRepository.updateOne({
						filters: [{ id: expectedId, workspace: globalShared }],
						dto: {
							categoryId,
							characteristics: speciesCreate.characteristics,
							presentation: speciesCreate.presentation,
						},
					});
					updatedSpecies += 1;
				}
				continue;
			}
			await this.speciesRepository.createOne({
				id: expectedId,
				categoryId,
				...speciesCreate,
				workspace: globalShared,
			});
			createdSpecies += 1;
		}

		if (
			createdCategories === 0 &&
			updatedCategories === 0 &&
			createdSpecies === 0 &&
			updatedSpecies === 0
		) {
			return { status: "skipped", reason: "up-to-date" };
		}

		return {
			status: "reconciled",
			createdCategories,
			updatedCategories,
			createdSpecies,
			updatedSpecies,
		};
	}
}
