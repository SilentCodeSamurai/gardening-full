import type {
	PlantRepositoryPort,
	PlantRepositoryCreateInputDTO,
	PlantRepositoryCreateManyInputDTO,
	PlantRepositoryCreateManyOutputDTO,
	PlantRepositoryCreateOutputDTO,
	PlantRepositoryDeleteInputDTO,
	PlantRepositoryDeleteManyInputDTO,
	PlantRepositoryDeleteManyOutputDTO,
	PlantRepositoryDeleteOutputDTO,
	PlantRepositoryGetAllOutputDTO,
	PlantRepositoryGetByIdInputDTO,
	PlantRepositoryGetByIdOutputDTO,
	PlantRepositoryUpdateInputDTO,
	PlantRepositoryUpdateOutputDTO,
} from "../../ports/repositories/gardening/plant.repository.port";
import { RepositoryValidationError } from "../../ports/repositories/shared/base-repository.errors";
import { BaseUseCaseError } from "../shared/errors";
import type { IUseCase } from "../shared/use-case.interface";
import type { SpatialOperationsService } from "../../services/spatial/spatial-operations.service";

export type PlantCreateUseCaseInput = PlantRepositoryCreateInputDTO;
export type PlantCreateUseCaseOutput = PlantRepositoryCreateOutputDTO;

/**
 * Creates a single plant using persisted write fields.
 *
 * @param input - {@link PlantCreateUseCaseInput} - The input data for the use case.
 * @returns - {@link PlantCreateUseCaseOutput} - The output data for the use case.
 */
export class PlantCreateUseCase implements IUseCase<PlantCreateUseCaseInput, PlantCreateUseCaseOutput> {
	constructor(private readonly plantRepository: PlantRepositoryPort) {}

	public async execute(dto: PlantCreateUseCaseInput): Promise<PlantCreateUseCaseOutput> {
		return this.plantRepository.create(dto);
	}
}

export type PlantCreateManyUseCaseInput = {
	/** Required; each row is one plant. */
	rows: PlantRepositoryCreateManyInputDTO;
};
export type PlantCreateManyUseCaseOutput = PlantRepositoryCreateManyOutputDTO;

/**
 * Creates multiple plants using persisted write fields.
 *
 * @param input - {@link PlantCreateManyUseCaseInput} - The input data for the use case.
 * @returns - {@link PlantCreateManyUseCaseOutput} - The output data for the use case.
 */
export class PlantCreateManyUseCase implements IUseCase<PlantCreateManyUseCaseInput, PlantCreateManyUseCaseOutput> {
	constructor(private readonly plantRepository: PlantRepositoryPort) {}

	public async execute(input: PlantCreateManyUseCaseInput): Promise<PlantCreateManyUseCaseOutput> {
		if (input.rows.length < 1) {
			throw new RepositoryValidationError({
				operation: "createMany",
				validationCode: "invalid-rows",
				context: { rowCount: input.rows.length },
				details: { minAllowed: 1 },
				message: "createMany rows must be at least 1.",
			});
		}
		return this.plantRepository.createMany(input.rows);
	}
}

export type PlantGetAllUseCaseOutput = PlantRepositoryGetAllOutputDTO;

export class PlantGetAllUseCase implements IUseCase<void, PlantGetAllUseCaseOutput> {
	constructor(private readonly plantRepository: PlantRepositoryPort) {}
	public async execute(): Promise<PlantGetAllUseCaseOutput> {
		return this.plantRepository.getAll();
	}
}

export type PlantGetByIdUseCaseInput = PlantRepositoryGetByIdInputDTO;
export type PlantGetByIdUseCaseOutput = PlantRepositoryGetByIdOutputDTO;

export class PlantGetByIdUseCase implements IUseCase<PlantGetByIdUseCaseInput, PlantGetByIdUseCaseOutput> {
	constructor(private readonly plantRepository: PlantRepositoryPort) {}
	public async execute(input: PlantGetByIdUseCaseInput): Promise<PlantGetByIdUseCaseOutput> {
		return this.plantRepository.getById(input);
	}
}

export type PlantUpdateUseCaseInput = PlantRepositoryUpdateInputDTO;
export type PlantUpdateUseCaseOutput = PlantRepositoryUpdateOutputDTO;

export class PlantUpdateUseCase implements IUseCase<PlantUpdateUseCaseInput, PlantUpdateUseCaseOutput> {
	constructor(private readonly plantRepository: PlantRepositoryPort) {}
	public async execute(input: PlantUpdateUseCaseInput): Promise<PlantUpdateUseCaseOutput> {
		return this.plantRepository.update(input);
	}
}

export type PlantDeleteUseCaseInput = PlantRepositoryDeleteInputDTO;
export type PlantDeleteUseCaseOutput = PlantRepositoryDeleteOutputDTO;

export class PlantDeleteUseCasePlacedEntityError extends BaseUseCaseError {
	constructor(params: { id: string }) {
		super({
			message: "This plant is placed. Remove it in the editor first.",
			useCaseName: "PlantDeleteUseCase",
			context: params,
		});
	}
}

export class PlantDeleteManyUseCasePlacedEntityError extends BaseUseCaseError {
	constructor(params: { ids: string[] }) {
		super({
			message: "The selection includes placed items. Remove them in the editor first.",
			useCaseName: "PlantDeleteManyUseCase",
			context: params,
		});
	}
}

/**
 * Deletes a plant.
 *
 * @param input - {@link PlantDeleteUseCaseInput} - The input data for the use case.
 * @returns - {@link PlantDeleteUseCaseOutput} - The output data for the use case.
 */
export class PlantDeleteUseCase implements IUseCase<PlantDeleteUseCaseInput, PlantDeleteUseCaseOutput> {
	constructor(
		private readonly plantRepository: PlantRepositoryPort,
		private readonly spatialOperationsService: SpatialOperationsService,
	) {}
	public async execute(input: PlantDeleteUseCaseInput): Promise<PlantDeleteUseCaseOutput> {
		const placement = await this.spatialOperationsService.getPlacementStatusByRef({
			entity: "plant",
			entityId: String(input.id),
		});
		if (placement.isPlaced) {
			throw new PlantDeleteUseCasePlacedEntityError({ id: String(input.id) });
		}
		const deletedId = await this.plantRepository.delete(input);
		await this.spatialOperationsService.deleteUnplacedNodeByRef({
			entity: "plant",
			entityId: String(deletedId),
		});
		return deletedId;
	}
}

export type PlantDeleteManyUseCaseInput = PlantRepositoryDeleteManyInputDTO;
export type PlantDeleteManyUseCaseOutput = PlantRepositoryDeleteManyOutputDTO;

/**
 * Deletes many plants. Fails if any requested id is placed in the spatial layout.
 * Repository skips ids that have no plant row; only {@link PlantDeleteManyUseCaseOutput.deletedIds} are removed.
 */
export class PlantDeleteManyUseCase implements IUseCase<PlantDeleteManyUseCaseInput, PlantDeleteManyUseCaseOutput> {
	constructor(
		private readonly plantRepository: PlantRepositoryPort,
		private readonly spatialOperationsService: SpatialOperationsService,
	) {}

	public async execute(input: PlantDeleteManyUseCaseInput): Promise<PlantDeleteManyUseCaseOutput> {
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
				entity: "plant",
				entityId: String(id),
			});
			if (placement.isPlaced) placedIdSet.add(String(id));
		}
		if (placedIdSet.size > 0) {
			throw new PlantDeleteManyUseCasePlacedEntityError({ ids: [...placedIdSet].sort() });
		}
		const { deletedIds } = await this.plantRepository.deleteMany({ ids: input.ids });
		for (const deletedId of deletedIds) {
			await this.spatialOperationsService.deleteUnplacedNodeByRef({
				entity: "plant",
				entityId: String(deletedId),
			});
		}
		return { deletedIds };
	}
}
