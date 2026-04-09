import type {
	DefaultCatalogCategory,
	DefaultCatalogDefinition,
} from "../core/application/use-cases/gardening/default-catalog.config";
import { DEFAULT_CATALOG } from "../core/application/use-cases/gardening/default-catalog.config";
import { PopulateDefaultCatalogUseCase } from "../core/application/use-cases/gardening/populate-default-catalog.use-case";
import { createCatalogPopulateUseCaseContext } from "../core/application/use-cases/use-case-context.defaults";
import { appContainer } from "../di/app-container";

export type PopulateDataOptions = {
	catalog?: DefaultCatalogDefinition<readonly DefaultCatalogCategory[]>;
};

export type PopulateDataResult = Awaited<ReturnType<typeof populateData>>;

/**
 * Seeds default catalog data when stores are empty (categories, species, access grants).
 */
export async function populateData(options?: PopulateDataOptions) {
	const useCase = appContainer.resolve(PopulateDefaultCatalogUseCase);
	return useCase.execute({
		context: createCatalogPopulateUseCaseContext(),
		dto: {
			catalog: options?.catalog ?? DEFAULT_CATALOG,
		},
	});
}
