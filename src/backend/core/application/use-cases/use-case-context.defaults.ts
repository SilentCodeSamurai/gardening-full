import { defaultWorkspaceRef } from "../resource-refs";
import { catalogPopulateServiceAccount } from "../service-accounts";
import type { UseCaseContext } from "./use-case-context";

/** Actor for populate-default-catalog (`create` parent scope is catalog root inside that use case). */
export function createCatalogPopulateUseCaseContext(): UseCaseContext {
	return {
		actorRef: catalogPopulateServiceAccount,
		workspaceRef: defaultWorkspaceRef(),
	};
}
