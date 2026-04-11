import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type {
	HydratedCultivarEntity,
	HydratedPlantEntity,
} from "@backend/core/domain/gardening/entities";
import type {
	PlantRepositoryCreateInputDTO,
	PlantRepositoryDeleteInputDTO,
	PlantRepositoryDeleteManyInputDTO,
	PlantRepositoryDeleteManyOutputDTO,
	PlantRepositoryDeleteOutputDTO,
	PlantRepositoryGetByIdInputDTO,
	PlantRepositoryPort,
	PlantRepositoryUpdateInputDTO,
} from "../../ports/repositories/gardening/plant.repository.port";
import { RepositoryValidationError } from "../../ports/repositories/shared/base-repository.errors";
import type { AccessControlApplicationService } from "../../services/access-control/access-control.application-service";
import type { SpatialOperationsService } from "../../services/spatial/spatial-operations.service";
import { BaseUseCaseError } from "../shared/errors";
import type { IUseCase } from "../shared/use-case.interface";
import type { UseCaseRequest } from "../use-case-context";

import type { SpeciesWithSystemCatalog } from "./species.crud-use-cases";

/** Hydrated plant as returned by use-cases: species includes `systemCatalog` for UI/i18n. */
export type PlantHydratedWithCatalogSpecies = HydratedPlantEntity & {
	cultivar: HydratedCultivarEntity & { species: SpeciesWithSystemCatalog };
};

type PlantCreatePayload = Omit<PlantRepositoryCreateInputDTO, "workspaceKey">;
export type PlantCreateUseCaseInput = UseCaseRequest<PlantCreatePayload>;
export type PlantCreateUseCaseOutput = PlantHydratedWithCatalogSpecies;

function enrichPlantSpeciesCatalogFlags(plant: HydratedPlantEntity): PlantHydratedWithCatalogSpecies {
	return {
		...plant,
		cultivar: {
			...plant.cultivar,
			species: { ...plant.cultivar.species, systemCatalog: WorkspaceVO.isGlobalSharedKey(plant.cultivar.species.workspaceKey) },
		},
	};
}

/**
 * Creates a single plant using persisted write fields.
 */
export class PlantCreateUseCase implements IUseCase<PlantCreateUseCaseInput, PlantCreateUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly plantRepository: PlantRepositoryPort,
	) {}

	public async execute(input: PlantCreateUseCaseInput): Promise<PlantCreateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		const created = await this.plantRepository.createScoped({
			dto: {
				...input.dto,
				workspaceKey: input.context.activeWorkspaceScope.toKey(),
			},
		});
		return enrichPlantSpeciesCatalogFlags(created);
	}
}

export type PlantCreateManyUseCaseInput = UseCaseRequest<{
	rows: PlantCreatePayload[];
}>;
export type PlantCreateManyUseCaseOutput = { items: PlantHydratedWithCatalogSpecies[] };

export class PlantCreateManyUseCase implements IUseCase<PlantCreateManyUseCaseInput, PlantCreateManyUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly plantRepository: PlantRepositoryPort,
	) {}

	public async execute(input: PlantCreateManyUseCaseInput): Promise<PlantCreateManyUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		if (input.dto.rows.length < 1) {
			throw new RepositoryValidationError({
				operation: "createMany",
				validationCode: "invalid-rows",
				context: { rowCount: input.dto.rows.length },
				details: { minAllowed: 1 },
				message: "createMany rows must be at least 1.",
			});
		}
		const created = await this.plantRepository.createManyScoped({
			dto: {
				rows: input.dto.rows.map((row) => ({
					...row,
					workspaceKey: input.context.activeWorkspaceScope.toKey(),
				})),
			},
		});
		return { items: created.items.map(enrichPlantSpeciesCatalogFlags) };
	}
}

export type PlantGetAllUseCaseInput = UseCaseRequest;
export type PlantGetAllUseCaseOutput = { items: PlantHydratedWithCatalogSpecies[] };

export class PlantGetAllUseCase implements IUseCase<PlantGetAllUseCaseInput, PlantGetAllUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly plantRepository: PlantRepositoryPort,
	) {}
	public async execute(input: PlantGetAllUseCaseInput): Promise<PlantGetAllUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const all = await this.plantRepository.getAllScoped({
			workspaceKeys: [input.context.activeWorkspaceScope.toKey()],
		});
		return {
			items: all.items.map(enrichPlantSpeciesCatalogFlags),
		};
	}
}

export type PlantGetByIdUseCaseInput = UseCaseRequest<PlantRepositoryGetByIdInputDTO>;
export type PlantGetByIdUseCaseOutput = PlantHydratedWithCatalogSpecies;

export class PlantGetByIdUseCase implements IUseCase<PlantGetByIdUseCaseInput, PlantGetByIdUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly plantRepository: PlantRepositoryPort,
	) {}
	public async execute(input: PlantGetByIdUseCaseInput): Promise<PlantGetByIdUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const wk = input.context.activeWorkspaceScope.toKey();
		const row = await this.plantRepository.getByIdScoped({ workspaceKey: wk, dto: input.dto });
		return enrichPlantSpeciesCatalogFlags(row);
	}
}

export type PlantUpdateUseCaseInput = UseCaseRequest<PlantRepositoryUpdateInputDTO>;
export type PlantUpdateUseCaseOutput = PlantHydratedWithCatalogSpecies;

export class PlantUpdateUseCase implements IUseCase<PlantUpdateUseCaseInput, PlantUpdateUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly plantRepository: PlantRepositoryPort,
	) {}
	public async execute(input: PlantUpdateUseCaseInput): Promise<PlantUpdateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		const wk = input.context.activeWorkspaceScope.toKey();
		const updated = await this.plantRepository.updateByIdScoped({
			workspaceKey: wk,
			dto: input.dto,
		});
		return enrichPlantSpeciesCatalogFlags(updated);
	}
}

export type PlantDeleteUseCaseInput = UseCaseRequest<PlantRepositoryDeleteInputDTO>;
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

export class PlantDeleteUseCase implements IUseCase<PlantDeleteUseCaseInput, PlantDeleteUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly plantRepository: PlantRepositoryPort,
		private readonly spatialOperationsService: SpatialOperationsService,
	) {}
	public async execute(input: PlantDeleteUseCaseInput): Promise<PlantDeleteUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const wk = input.context.activeWorkspaceScope.toKey();
		const placement = await this.spatialOperationsService.getPlacementStatusByRef({
			ref: { entity: "plant", entityId: String(input.dto.id) },
			workspaceKeys: [wk],
		});
		if (placement.isPlaced) {
			throw new PlantDeleteUseCasePlacedEntityError({ id: String(input.dto.id) });
		}
		const deletedId = await this.plantRepository.deleteByIdScoped({
			workspaceKey: wk,
			dto: input.dto,
		});
		await this.spatialOperationsService.deleteUnplacedNodeByRef({
			ref: { entity: "plant", entityId: String(deletedId) },
			workspaceKeys: [wk],
		});
		return deletedId;
	}
}

export type PlantDeleteManyUseCaseInput = UseCaseRequest<PlantRepositoryDeleteManyInputDTO>;
export type PlantDeleteManyUseCaseOutput = PlantRepositoryDeleteManyOutputDTO;

export class PlantDeleteManyUseCase implements IUseCase<PlantDeleteManyUseCaseInput, PlantDeleteManyUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly plantRepository: PlantRepositoryPort,
		private readonly spatialOperationsService: SpatialOperationsService,
	) {}

	public async execute(input: PlantDeleteManyUseCaseInput): Promise<PlantDeleteManyUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		if (input.dto.ids.length < 1) {
			throw new RepositoryValidationError({
				operation: "deleteMany",
				validationCode: "invalid-ids",
				context: { idCount: input.dto.ids.length },
				details: { minAllowed: 1 },
				message: "deleteMany ids must be at least 1.",
			});
		}
		const wk = input.context.activeWorkspaceScope.toKey();
		const placedIdSet = new Set<string>();
		for (const id of input.dto.ids) {
			const placement = await this.spatialOperationsService.getPlacementStatusByRef({
				ref: { entity: "plant", entityId: String(id) },
				workspaceKeys: [wk],
			});
			if (placement.isPlaced) placedIdSet.add(String(id));
		}
		if (placedIdSet.size > 0) {
			throw new PlantDeleteManyUseCasePlacedEntityError({ ids: [...placedIdSet].sort() });
		}
		const { deletedIds } = await this.plantRepository.deleteManyScoped({
			workspaceKeys: [wk],
			dto: { ids: input.dto.ids },
		});
		for (const deletedId of deletedIds) {
			await this.spatialOperationsService.deleteUnplacedNodeByRef({
				ref: { entity: "plant", entityId: String(deletedId) },
				workspaceKeys: [wk],
			});
		}
		return { deletedIds };
	}
}
