import type { SpatialNodeRepositoryPortV2 } from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port.v2";
import { TOKENS } from "@backend/di/tokens";
import type { DependencyContainer } from "tsyringe";

export type SpatialRepositoryPortsV2 = {
	spatialNode: SpatialNodeRepositoryPortV2;
};

export function resolveSpatialRepositoryPortsV2(c: DependencyContainer): SpatialRepositoryPortsV2 {
	return {
		spatialNode: c.resolve<SpatialNodeRepositoryPortV2>(TOKENS.SpatialNodeRepositoryPortV2),
	};
}
