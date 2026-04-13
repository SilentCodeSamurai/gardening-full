import type {
	DefaultCatalogCategory,
	DefaultCatalogDefinition,
} from "../core/application/use-cases/gardening/default-catalog.config";
import { DEFAULT_CATALOG } from "../core/application/use-cases/gardening/default-catalog.config";
import { PopulateDefaultCatalogUseCase } from "../core/application/use-cases/gardening/populate-default-catalog.use-case";
import type { SubjectVO } from "../core/domain/access/subject.vo";
import { WorkspaceVO } from "../core/domain/access/workspace.vo";
import { appContainer } from "../di/app-container";

export type PopulateDataOptions = {
	actorSubject: SubjectVO;
	catalog?: DefaultCatalogDefinition<readonly DefaultCatalogCategory[]>;
};

export type PopulateDataResult = Awaited<ReturnType<typeof populateData>>;

/**
 * Seeds default catalog data when stores are empty (categories, species, access grants).
 */
export async function populateData(options: PopulateDataOptions) {
	const useCase = appContainer.resolve(PopulateDefaultCatalogUseCase);
	const context = {
		actorSubject: options.actorSubject,
		activeWorkspaceScope: WorkspaceVO.globalShared(),
	};
	return useCase.run({
		context,
		dto: {
			catalog: options?.catalog ?? DEFAULT_CATALOG,
		},
	});
}
