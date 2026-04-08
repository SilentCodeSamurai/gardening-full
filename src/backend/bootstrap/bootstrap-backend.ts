import {
	DEFAULT_CATALOG,
	type DefaultCatalogCategory,
	type DefaultCatalogDefinition,
} from "@backend/core/application/use-cases/gardening/default-catalog.config";
import { PopulateDefaultCatalogUseCase } from "@backend/core/application/use-cases/gardening/populate-default-catalog.use-case";
import { appContainer } from "@backend/di/app-container";

export type BootstrapBackendOptions = {
	catalog?: DefaultCatalogDefinition<readonly DefaultCatalogCategory[]>;
};

export async function bootstrapBackend(options?: BootstrapBackendOptions) {
	const useCase = appContainer.resolve(PopulateDefaultCatalogUseCase);
	return useCase.execute({ catalog: options?.catalog ?? DEFAULT_CATALOG });
}
