import type { LocationEntity, LocationEntityId } from "@backend/core/domain/gardening/entities";
import type {
	LocationRepositoryCreateInputDTO,
	LocationRepositoryDeleteManyInputDTO,
	LocationRepositoryDeleteManyOutputDTO,
	LocationRepositoryPort,
	LocationRepositoryUpdateInputDTO,
} from "../../ports/repositories/gardening/location.repository.port";
import type { ItemsContainer } from "@backend/shared/types";
import { RepositoryValidationError } from "../../ports/repositories/shared/base-repository.errors";
import { BaseUseCaseError } from "../shared/errors";
import type { IUseCase } from "../shared/use-case.interface";
import type { SpatialOperationsService } from "../../services/spatial/spatial-operations.service";

export type LocationCreateUseCaseInput = LocationRepositoryCreateInputDTO;
export type LocationCreateUseCaseOutput = LocationEntity;

export class LocationCreateUseCase implements IUseCase<LocationCreateUseCaseInput, LocationCreateUseCaseOutput> {
	constructor(private readonly locationRepository: LocationRepositoryPort) {}

	public async execute(input: LocationCreateUseCaseInput): Promise<LocationCreateUseCaseOutput> {
		return this.locationRepository.create(input);
	}
}

export type LocationGetByIdUseCaseInput = {
	id: LocationEntityId;
};
export type LocationGetByIdUseCaseOutput = LocationEntity;

export class LocationGetByIdUseCase implements IUseCase<LocationGetByIdUseCaseInput, LocationGetByIdUseCaseOutput> {
	constructor(private readonly locationRepository: LocationRepositoryPort) {}

	public async execute(input: LocationGetByIdUseCaseInput): Promise<LocationGetByIdUseCaseOutput> {
		return this.locationRepository.getById(input);
	}
}

export type LocationGetAllUseCaseOutput = ItemsContainer<LocationEntity>;

export class LocationGetAllUseCase implements IUseCase<void, LocationGetAllUseCaseOutput> {
	constructor(private readonly locationRepository: LocationRepositoryPort) {}

	public async execute(): Promise<LocationGetAllUseCaseOutput> {
		return this.locationRepository.getAll();
	}
}

export type LocationUpdateUseCaseInput = LocationRepositoryUpdateInputDTO;
export type LocationUpdateUseCaseOutput = LocationEntity;

export class LocationUpdateUseCase implements IUseCase<LocationUpdateUseCaseInput, LocationUpdateUseCaseOutput> {
	constructor(private readonly locationRepository: LocationRepositoryPort) {}

	public async execute(input: LocationUpdateUseCaseInput): Promise<LocationUpdateUseCaseOutput> {
		return this.locationRepository.update(input);
	}
}

export type LocationDeleteUseCaseInput = {
	id: LocationEntityId;
};
export type LocationDeleteUseCaseOutput = LocationEntityId;

export class LocationDeleteUseCasePlacedEntityError extends BaseUseCaseError {
	constructor(params: { id: string }) {
		super({
			message: "This location is placed. Remove it in the editor first.",
			useCaseName: "LocationDeleteUseCase",
			context: params,
		});
	}
}

export class LocationDeleteManyUseCasePlacedEntityError extends BaseUseCaseError {
	constructor(params: { ids: string[] }) {
		super({
			message: "The selection includes placed items. Remove them in the editor first.",
			useCaseName: "LocationDeleteManyUseCase",
			context: params,
		});
	}
}

export class LocationDeleteUseCase implements IUseCase<LocationDeleteUseCaseInput, LocationDeleteUseCaseOutput> {
	constructor(
		private readonly locationRepository: LocationRepositoryPort,
		private readonly spatialOperationsService: SpatialOperationsService,
	) {}

	public async execute(input: LocationDeleteUseCaseInput): Promise<LocationDeleteUseCaseOutput> {
		const placement = await this.spatialOperationsService.getPlacementStatusByRef({
			entity: "location",
			entityId: String(input.id),
		});
		if (placement.isPlaced) {
			throw new LocationDeleteUseCasePlacedEntityError({ id: String(input.id) });
		}
		const deletedId = await this.locationRepository.delete(input);
		await this.spatialOperationsService.deleteUnplacedNodeByRef({
			entity: "location",
			entityId: String(deletedId),
		});
		return deletedId;
	}
}

export type LocationDeleteManyUseCaseInput = LocationRepositoryDeleteManyInputDTO;
export type LocationDeleteManyUseCaseOutput = LocationRepositoryDeleteManyOutputDTO;

/**
 * Deletes many locations. Fails if any requested id is placed in the spatial layout.
 * Repository skips ids that have no location row; only {@link LocationDeleteManyUseCaseOutput.deletedIds} are removed.
 */
export class LocationDeleteManyUseCase
	implements IUseCase<LocationDeleteManyUseCaseInput, LocationDeleteManyUseCaseOutput>
{
	constructor(
		private readonly locationRepository: LocationRepositoryPort,
		private readonly spatialOperationsService: SpatialOperationsService,
	) {}

	public async execute(input: LocationDeleteManyUseCaseInput): Promise<LocationDeleteManyUseCaseOutput> {
		if (input.ids.length < 1) {
			throw new RepositoryValidationError({
				operation: "deleteMany",
				validationCode: "invalid-ids",
				context: { idCount: input.ids.length },
				details: { minAllowed: 1 },
				message: "deleteMany ids must be at least 1.",
			});
		}
		const placedIdSet = new Set<string>();
		for (const id of input.ids) {
			const placement = await this.spatialOperationsService.getPlacementStatusByRef({
				entity: "location",
				entityId: String(id),
			});
			if (placement.isPlaced) placedIdSet.add(String(id));
		}
		if (placedIdSet.size > 0) {
			throw new LocationDeleteManyUseCasePlacedEntityError({ ids: [...placedIdSet].sort() });
		}
		const { deletedIds } = await this.locationRepository.deleteMany({ ids: input.ids });
		for (const deletedId of deletedIds) {
			await this.spatialOperationsService.deleteUnplacedNodeByRef({
				entity: "location",
				entityId: String(deletedId),
			});
		}
		return { deletedIds };
	}
}
