import type { HydratedCultivarEntity, HydratedPlantEntity } from "@backend/core/domain/gardening/entities";
import type {
	PlantRepositoryCreateInputDTO,
	PlantRepositoryCreateManyInputDTO,
	PlantRepositoryDeleteInputDTO,
	PlantRepositoryDeleteManyInputDTO,
	PlantRepositoryDeleteManyOutputDTO,
	PlantRepositoryDeleteOutputDTO,
	PlantRepositoryGetByIdInputDTO,
	PlantRepositoryPort,
	PlantRepositoryUpdateInputDTO,
} from "../../ports/repositories/gardening/plant.repository.port";
import { RepositoryValidationError } from "../../ports/repositories/shared/base-repository.errors";
import {
	APPLICATION_RESOURCE_TYPES,
	gardeningPlantRef,
	gardeningSpeciesRef,
} from "../../resource-refs";
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

async function enrichPlantsSpeciesCatalogFlags(
	access: AccessControlApplicationService,
	items: HydratedPlantEntity[],
): Promise<PlantHydratedWithCatalogSpecies[]> {
	if (items.length < 1) return [];
	const flags = await access.getGlobalSharedResourceFlags(
		items.map((p) => gardeningSpeciesRef(String(p.cultivar.species.id))),
	);
	return items.map((row, i) => ({
		...row,
		cultivar: {
			...row.cultivar,
			species: { ...row.cultivar.species, systemCatalog: flags[i] ?? false },
		},
	}));
}

export type PlantCreateUseCaseInput = UseCaseRequest<PlantRepositoryCreateInputDTO>;
export type PlantCreateUseCaseOutput = PlantHydratedWithCatalogSpecies;

/**
 * Creates a single plant using persisted write fields.
 */
export class PlantCreateUseCase implements IUseCase<PlantCreateUseCaseInput, PlantCreateUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly plantRepository: PlantRepositoryPort,
	) {}

	public async execute(input: PlantCreateUseCaseInput): Promise<PlantCreateUseCaseOutput> {
		await this.access.assertCanCreate(input.context, input.context.workspaceRef);
		const created = await this.plantRepository.create(input.dto);
		await this.access.bootstrapResourceAdminForActor(input.context, gardeningPlantRef(String(created.id)));
		const [enriched] = await enrichPlantsSpeciesCatalogFlags(this.access, [created]);
		return enriched;
	}
}

export type PlantCreateManyUseCaseInput = UseCaseRequest<{ rows: PlantRepositoryCreateManyInputDTO }>;
export type PlantCreateManyUseCaseOutput = { items: PlantHydratedWithCatalogSpecies[] };

export class PlantCreateManyUseCase implements IUseCase<PlantCreateManyUseCaseInput, PlantCreateManyUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly plantRepository: PlantRepositoryPort,
	) {}

	public async execute(input: PlantCreateManyUseCaseInput): Promise<PlantCreateManyUseCaseOutput> {
		if (input.dto.rows.length < 1) {
			throw new RepositoryValidationError({
				operation: "createMany",
				validationCode: "invalid-rows",
				context: { rowCount: input.dto.rows.length },
				details: { minAllowed: 1 },
				message: "createMany rows must be at least 1.",
			});
		}
		await this.access.assertCanCreate(input.context, input.context.workspaceRef);
		const created = await this.plantRepository.createMany(input.dto.rows);
		for (const p of created.items) {
			await this.access.bootstrapResourceAdminForActor(input.context, gardeningPlantRef(String(p.id)));
		}
		const items = await enrichPlantsSpeciesCatalogFlags(this.access, created.items);
		return { items };
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
		const mask = await this.access.getReadableResourceMask({
			actorRef: input.context.actorRef,
			resourceType: APPLICATION_RESOURCE_TYPES.plant,
		});
		if (mask.includesAllOfType) {
			const all = await this.plantRepository.getAll();
			return { items: await enrichPlantsSpeciesCatalogFlags(this.access, all.items) };
		}
		if (mask.exactIds.length < 1) return { items: [] };
		const listed = await this.plantRepository.getListByIds({
			ids: mask.exactIds as Parameters<PlantRepositoryPort["getListByIds"]>[0]["ids"],
		});
		return { items: await enrichPlantsSpeciesCatalogFlags(this.access, listed.items) };
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
		const row = await this.plantRepository.getById(input.dto);
		await this.access.assertCanRead(input.context, gardeningPlantRef(String(input.dto.id)));
		const [enriched] = await enrichPlantsSpeciesCatalogFlags(this.access, [row]);
		return enriched;
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
		await this.plantRepository.getById({ id: input.dto.id });
		await this.access.assertCanUpdate(input.context, gardeningPlantRef(String(input.dto.id)));
		const updated = await this.plantRepository.update(input.dto);
		const [enriched] = await enrichPlantsSpeciesCatalogFlags(this.access, [updated]);
		return enriched;
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
		await this.plantRepository.getById({ id: input.dto.id });
		await this.access.assertCanDelete(input.context, gardeningPlantRef(String(input.dto.id)));
		const placement = await this.spatialOperationsService.getPlacementStatusByRef({
			entity: "plant",
			entityId: String(input.dto.id),
		});
		if (placement.isPlaced) {
			throw new PlantDeleteUseCasePlacedEntityError({ id: String(input.dto.id) });
		}
		const deletedId = await this.plantRepository.delete(input.dto);
		await this.spatialOperationsService.deleteUnplacedNodeByRef({
			entity: "plant",
			entityId: String(deletedId),
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
		if (input.dto.ids.length < 1) {
			throw new RepositoryValidationError({
				operation: "deleteMany",
				validationCode: "invalid-ids",
				context: { idCount: input.dto.ids.length },
				details: { minAllowed: 1 },
				message: "deleteMany ids must be at least 1.",
			});
		}
		for (const id of input.dto.ids) {
			await this.plantRepository.getById({ id });
			await this.access.assertCanDelete(input.context, gardeningPlantRef(String(id)));
		}
		const placedIdSet = new Set<string>();
		for (const id of input.dto.ids) {
			const placement = await this.spatialOperationsService.getPlacementStatusByRef({
				entity: "plant",
				entityId: String(id),
			});
			if (placement.isPlaced) placedIdSet.add(String(id));
		}
		if (placedIdSet.size > 0) {
			throw new PlantDeleteManyUseCasePlacedEntityError({ ids: [...placedIdSet].sort() });
		}
		const { deletedIds } = await this.plantRepository.deleteMany({ ids: input.dto.ids });
		for (const deletedId of deletedIds) {
			await this.spatialOperationsService.deleteUnplacedNodeByRef({
				entity: "plant",
				entityId: String(deletedId),
			});
		}
		return { deletedIds };
	}
}
