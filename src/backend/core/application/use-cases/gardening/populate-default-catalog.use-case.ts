import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { SpeciesCategoryEntityId } from "@backend/core/domain/gardening/entities";
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

		const existing = await this.speciesCategoryRepository.getMany({
			filters: [{ workspace: globalShared }],
		});
		if (existing.items.length > 0) {
			return { status: "skipped", reason: "catalog-not-empty" };
		}

		const slugToCategoryId = new Map<string, SpeciesCategoryEntityId>();

		const createdCategories = [];
		const createdSpecies = [];

		for (const row of input.dto.catalog.categories) {
			const { slug, ...categoryCreate } = row;
			const created = await this.speciesCategoryRepository.createOne({
				...categoryCreate,
				workspace: globalShared,
			});
			createdCategories.push(created);
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
			const created = await this.speciesRepository.createOne({
				categoryId,
				...speciesCreate,
				workspace: globalShared,
			});
			createdSpecies.push(created);
		}

		return {
			status: "populated",
			createdCategories: createdCategories.length,
			createdSpecies: createdSpecies.length,
		};
	}
}
