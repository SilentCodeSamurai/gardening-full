import type { DependencyContainer, InjectionToken } from "tsyringe";
import { AccessControlApplicationService } from "../core/application/services/access-control/access-control.application-service";
import { SpatialOperationsService } from "../core/application/services/spatial/spatial-operations.service";

const injectableApplicationServices = [
	AccessControlApplicationService,
	SpatialOperationsService,
] as const;

/** Registers application services (constructor injection via @injectable). */
export function registerApplicationServices(c: DependencyContainer): void {
	for (const cls of injectableApplicationServices) {
		c.register(cls as InjectionToken<object>, { useClass: cls });
	}
}
