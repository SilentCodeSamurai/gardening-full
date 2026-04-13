import type { SpatialNodeRepositoryPort } from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port";
import { TOKENS } from "@backend/di/tokens";
import type { DependencyContainer } from "tsyringe";

export type SpatialRepositoryPorts = {
	spatialNode: SpatialNodeRepositoryPort;
};

export function resolveSpatialRepositoryPorts(c: DependencyContainer): SpatialRepositoryPorts {
	return {
		spatialNode: c.resolve<SpatialNodeRepositoryPort>(TOKENS.SpatialNodeRepositoryPort),
	};
}
