import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type {
	HydratedCultivarEntity,
	HydratedPlantEntity,
	PlantEntityId,
} from "@backend/core/domain/gardening/entities";
import { inject, injectable } from "tsyringe";
import {
	type TransactionManagerPort,
	TransactionManagerPortToken,
} from "../../ports/transaction/transaction-manager.port";
import {
	type PlantRepositoryCreateInputDTO,
	type PlantRepositoryDeleteOutputDTO,
	type PlantRepositoryPort,
	PlantRepositoryPortToken,
	type PlantRepositoryUpdatePatchDTO,
} from "../../ports/repositories/gardening/plant.repository.port";
import { AccessControlApplicationService } from "../../services/access-control/access-control.application-service";
import { SpatialOperationsService } from "../../services/spatial/spatial-operations.service";
import { BaseUseCaseError, UseCaseValidationError } from "../shared/errors";
import { BaseUseCase } from "../shared/base.use-case";
import type { ExcludeWorkspace } from "../shared/types";
import { TransactionalUseCase } from "../shared/transactional.use-case";
import type { UseCaseRequest } from "../use-case-context";

import type { SpeciesWithSystemCatalog } from "./species.use-cases";

/** Hydrated plant as returned by use-cases: species includes `systemCatalog` for UI/i18n. */
export type PlantHydratedWithCatalogSpecies = HydratedPlantEntity & {
	cultivar: HydratedCultivarEntity & { species: SpeciesWithSystemCatalog };
};

type PlantCreatePayload = ExcludeWorkspace<PlantRepositoryCreateInputDTO>;
export type PlantCreateUseCaseInput = UseCaseRequest<PlantCreatePayload>;
export type PlantCreateUseCaseOutput = PlantHydratedWithCatalogSpecies;

function enrichPlantSpeciesCatalogFlags(plant: HydratedPlantEntity): PlantHydratedWithCatalogSpecies {
	return {
		...plant,
		cultivar: {
			...plant.cultivar,
			species: {
				...plant.cultivar.species,
				systemCatalog: WorkspaceVO.isGlobalShared(plant.cultivar.species.workspace),
			},
		},
	};
}

/**
 * Creates a single plant using persisted write fields.
 */
@injectable()
export class PlantCreateUseCase extends BaseUseCase<PlantCreateUseCaseInput, PlantCreateUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(PlantRepositoryPortToken) private readonly plantRepository: PlantRepositoryPort,
	) {
		super();
	}

	protected async execute(input: PlantCreateUseCaseInput): Promise<PlantCreateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		const scope = input.context.activeWorkspaceScope;
		const created = await this.plantRepository.createOne({
			...input.dto,
			workspace: scope,
		});
		return enrichPlantSpeciesCatalogFlags(created);
	}
}

export type PlantCreateManyUseCaseInput = UseCaseRequest<{
	rows: PlantCreatePayload[];
}>;
export type PlantCreateManyUseCaseOutput = { items: PlantHydratedWithCatalogSpecies[] };

@injectable()
export class PlantCreateManyUseCase extends BaseUseCase<PlantCreateManyUseCaseInput, PlantCreateManyUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(PlantRepositoryPortToken) private readonly plantRepository: PlantRepositoryPort,
	) {
		super();
	}

	protected async execute(input: PlantCreateManyUseCaseInput): Promise<PlantCreateManyUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		if (input.dto.rows.length < 1) {
			throw new UseCaseValidationError({
				useCaseName: "PlantCreateManyUseCase",
				validationCode: "invalid-rows",
				context: { rowCount: input.dto.rows.length },
				details: { minAllowed: 1 },
				message: "createMany rows must be at least 1.",
			});
		}
		const scope = input.context.activeWorkspaceScope;
		const created = await this.plantRepository.createMany({
			items: input.dto.rows.map((row) => ({
				...row,
				workspace: scope,
			})),
		});
		return { items: created.items.map(enrichPlantSpeciesCatalogFlags) };
	}
}

export type PlantGetAllUseCaseInput = UseCaseRequest;
export type PlantGetAllUseCaseOutput = { items: PlantHydratedWithCatalogSpecies[] };

@injectable()
export class PlantGetAllUseCase extends BaseUseCase<PlantGetAllUseCaseInput, PlantGetAllUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(PlantRepositoryPortToken) private readonly plantRepository: PlantRepositoryPort,
	) {
		super();
	}
	protected async execute(input: PlantGetAllUseCaseInput): Promise<PlantGetAllUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const scope = input.context.activeWorkspaceScope;
		const all = await this.plantRepository.getMany({ filters: [{ workspace: scope }] });
		return {
			items: all.items.map(enrichPlantSpeciesCatalogFlags),
		};
	}
}

export type PlantGetByIdUseCaseInput = UseCaseRequest<{ id: PlantEntityId }>;
export type PlantGetByIdUseCaseOutput = PlantHydratedWithCatalogSpecies;

@injectable()
export class PlantGetByIdUseCase extends BaseUseCase<PlantGetByIdUseCaseInput, PlantGetByIdUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(PlantRepositoryPortToken) private readonly plantRepository: PlantRepositoryPort,
	) {
		super();
	}
	protected async execute(input: PlantGetByIdUseCaseInput): Promise<PlantGetByIdUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const scope = input.context.activeWorkspaceScope;
		const row = await this.plantRepository.getOne({ filters: [{ id: input.dto.id, workspace: scope }] });
		return enrichPlantSpeciesCatalogFlags(row);
	}
}

type PlantUpdatePayload = ExcludeWorkspace<PlantRepositoryUpdatePatchDTO>;
export type PlantUpdateUseCaseInput = UseCaseRequest<{ id: PlantEntityId } & PlantUpdatePayload>;
export type PlantUpdateUseCaseOutput = PlantHydratedWithCatalogSpecies;

@injectable()
export class PlantUpdateUseCase extends BaseUseCase<PlantUpdateUseCaseInput, PlantUpdateUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(PlantRepositoryPortToken) private readonly plantRepository: PlantRepositoryPort,
	) {
		super();
	}
	protected async execute(input: PlantUpdateUseCaseInput): Promise<PlantUpdateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		const scope = input.context.activeWorkspaceScope;
		const { id, ...patch } = input.dto;
		const updated = await this.plantRepository.updateOne({
			filters: [{ id, workspace: scope }],
			dto: patch,
		});
		return enrichPlantSpeciesCatalogFlags(updated);
	}
}

export type PlantDeleteUseCaseInput = UseCaseRequest<{ id: PlantEntityId }>;
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

@injectable()
export class PlantDeleteUseCase extends TransactionalUseCase<PlantDeleteUseCaseInput, PlantDeleteUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpatialOperationsService) private readonly spatialOperationsService: SpatialOperationsService,
		@inject(PlantRepositoryPortToken) private readonly plantRepository: PlantRepositoryPort,
		@inject(TransactionManagerPortToken) transactionManager: TransactionManagerPort,
	) {
		super(transactionManager);
	}
	protected async execute(input: PlantDeleteUseCaseInput): Promise<PlantDeleteUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const scope = input.context.activeWorkspaceScope;
		const placement = await this.spatialOperationsService.getPlacementStatusByRef({
			ref: { entity: "plant", entityId: String(input.dto.id) },
			workspaces: [scope],
		});
		if (placement.isPlaced) {
			throw new PlantDeleteUseCasePlacedEntityError({ id: String(input.dto.id) });
		}
		const deletedId = await this.plantRepository.deleteOne({
			filters: [{ id: input.dto.id, workspace: scope }],
		});
		await this.spatialOperationsService.deleteUnplacedNodeByRef({
			ref: { entity: "plant", entityId: String(deletedId) },
			workspaces: [scope],
		});
		return deletedId;
	}
}

export type PlantDeleteManyUseCaseInput = UseCaseRequest<{ ids: PlantEntityId[] }>;
export type PlantDeleteManyUseCaseOutput = { deletedIds: PlantEntityId[] };

@injectable()
export class PlantDeleteManyUseCase extends TransactionalUseCase<
	PlantDeleteManyUseCaseInput,
	PlantDeleteManyUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(SpatialOperationsService) private readonly spatialOperationsService: SpatialOperationsService,
		@inject(PlantRepositoryPortToken) private readonly plantRepository: PlantRepositoryPort,
		@inject(TransactionManagerPortToken) transactionManager: TransactionManagerPort,
	) {
		super(transactionManager);
	}

	protected async execute(input: PlantDeleteManyUseCaseInput): Promise<PlantDeleteManyUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		if (input.dto.ids.length < 1) {
			throw new UseCaseValidationError({
				useCaseName: "PlantDeleteManyUseCase",
				validationCode: "invalid-ids",
				context: { idCount: input.dto.ids.length },
				details: { minAllowed: 1 },
				message: "deleteMany ids must be at least 1.",
			});
		}
		const scope = input.context.activeWorkspaceScope;
		const placedIdSet = new Set<string>();
		for (const id of input.dto.ids) {
			const placement = await this.spatialOperationsService.getPlacementStatusByRef({
				ref: { entity: "plant", entityId: String(id) },
				workspaces: [scope],
			});
			if (placement.isPlaced) placedIdSet.add(String(id));
		}
		if (placedIdSet.size > 0) {
			throw new PlantDeleteManyUseCasePlacedEntityError({ ids: [...placedIdSet].sort() });
		}
		const filters = input.dto.ids.map((id) => ({ id, workspace: scope }));
		const { count } = await this.plantRepository.deleteMany({ filters });
		if (count !== input.dto.ids.length) {
			throw new UseCaseValidationError({
				useCaseName: "PlantDeleteManyUseCase",
				validationCode: "partial-delete",
				context: { requested: input.dto.ids.length, deleted: count },
				message: "deleteMany removed fewer rows than requested.",
			});
		}
		for (const deletedId of input.dto.ids) {
			await this.spatialOperationsService.deleteUnplacedNodeByRef({
				ref: { entity: "plant", entityId: String(deletedId) },
				workspaces: [scope],
			});
		}
		return { deletedIds: input.dto.ids };
	}
}
