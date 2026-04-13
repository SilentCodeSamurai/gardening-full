import {
	type SpatialNodeRepositoryPort,
	SpatialNodeRepositoryPortToken,
} from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port";
import type { DependencyContainer } from "tsyringe";

export type SpatialRepositoryPorts = {
	spatialNode: SpatialNodeRepositoryPort;
};

export function resolveSpatialRepositoryPorts(c: DependencyContainer): SpatialRepositoryPorts {
	return {
		spatialNode: c.resolve(SpatialNodeRepositoryPortToken),
	};
}
