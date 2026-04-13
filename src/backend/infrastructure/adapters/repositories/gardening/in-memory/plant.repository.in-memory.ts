import type {
	PlantRepositoryPort,
	PlantRepositoryCreateInputDTO,
	PlantRepositoryCreateManyInputDTO,
	PlantRepositoryCreateManyOutputDTO,
	PlantRepositoryCreateOutputDTO,
	PlantRepositoryDeleteManyOutputDTO,
	PlantRepositoryDeleteOutputDTO,
	PlantRepositoryFilterClause,
	PlantRepositoryGetManyOutputDTO,
	PlantRepositoryGetOneOutputDTO,
	PlantRepositoryUpdateManyOutputDTO,
	PlantRepositoryUpdateOutputDTO,
	PlantRepositoryUpdatePatchDTO,
} from "@backend/core/application/ports/repositories/gardening/plant.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { HydratedPlantEntity, PlantEntity } from "@backend/core/domain/gardening/entities";
import {
	findFirstRowMatchingAnyClause,
	findRowsMatchingAnyClause,
} from "@backend/infrastructure/adapters/repositories/shared/in-memory-entity-filter";
import { workspaceKeysEqual } from "@backend/infrastructure/adapters/repositories/shared/workspace-key";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, plantId } from "@backend/infrastructure/integrations/shared/database-ids";

export class PlantInMemoryRepository extends BaseRepositoryErrors implements PlantRepositoryPort {
	constructor(private readonly store: InMemoryStore) {
		super();
	}

	private hydrate(row: PlantEntity): HydratedPlantEntity {
		const cultivarRow = this.store.cultivars.get(idKey(row.cultivarId));
		if (!cultivarRow) this.throwNotFoundError("Cultivar", row.cultivarId);
		const speciesRow = this.store.species.get(idKey(cultivarRow.speciesId));
		if (!speciesRow) this.throwNotFoundError("Species", cultivarRow.speciesId);
		return {
			...row,
			cultivar: {
				...cultivarRow,
				species: speciesRow,
			},
		};
	}

	private insertRow(dto: PlantRepositoryCreateInputDTO): PlantRepositoryCreateOutputDTO {
		const cultivarRow = this.store.cultivars.get(idKey(dto.cultivarId));
		if (!cultivarRow) {
			this.throwNotFoundError("Cultivar", dto.cultivarId);
		}
		if (!workspaceKeysEqual(cultivarRow.workspaceKey, dto.workspaceKey)) {
			this.throwValidationError({
				operation: "create",
				validationCode: "cultivar-workspace-mismatch",
				context: { cultivarId: dto.cultivarId, workspaceKey: dto.workspaceKey },
			});
		}
		const now = new Date();
		const id = plantId();
		const row: PlantEntity = {
			...dto,
			id,
			createdAt: now,
			updatedAt: now,
		};
		this.store.plants.set(idKey(id), row);
		return this.hydrate(row);
	}

	private patchStored(existing: PlantEntity, dto: PlantRepositoryUpdatePatchDTO): PlantEntity {
		const nextWorkspaceKey = dto.workspaceKey !== undefined ? dto.workspaceKey : existing.workspaceKey;
		const nextCultivarId = dto.cultivarId !== undefined ? dto.cultivarId : existing.cultivarId;
		return {
			...existing,
			workspaceKey: nextWorkspaceKey,
			title: dto.title !== undefined ? dto.title : existing.title,
			description: dto.description !== undefined ? dto.description : existing.description,
			cultivarId: nextCultivarId,
			updatedAt: new Date(),
		};
	}

	private assertCultivarMatchesWorkspace(
		cultivarId: PlantEntity["cultivarId"],
		workspaceKey: PlantEntity["workspaceKey"],
	): void {
		const cultivarRow = this.store.cultivars.get(idKey(cultivarId));
		if (!cultivarRow) this.throwNotFoundError("Cultivar", cultivarId);
		if (!workspaceKeysEqual(cultivarRow.workspaceKey, workspaceKey)) {
			this.throwValidationError({
				operation: "update",
				validationCode: "cultivar-workspace-mismatch",
				context: { cultivarId, workspaceKey },
			});
		}
	}

	async createOne(dto: PlantRepositoryCreateInputDTO): Promise<PlantRepositoryCreateOutputDTO> {
		return this.insertRow(dto);
	}

	async createMany(input: PlantRepositoryCreateManyInputDTO): Promise<PlantRepositoryCreateManyOutputDTO> {
		const items: HydratedPlantEntity[] = [];
		for (const item of input.items) {
			items.push(this.insertRow(item));
		}
		return { items };
	}

	async getOne(input: {
		filters: readonly PlantRepositoryFilterClause[];
	}): Promise<PlantRepositoryGetOneOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.plants.values(), input.filters);
		if (!row) this.throwNotFoundError("Plant", input.filters);
		return this.hydrate(row);
	}

	async getMany(input?: {
		filters?: readonly PlantRepositoryFilterClause[];
	}): Promise<PlantRepositoryGetManyOutputDTO> {
		if (input?.filters === undefined) {
			return { items: [...this.store.plants.values()].map((r) => this.hydrate(r)) };
		}
		if (input.filters.length === 0) return { items: [] };
		const rows = findRowsMatchingAnyClause([...this.store.plants.values()], input.filters);
		return { items: rows.map((r) => this.hydrate(r)) };
	}

	async updateOne(input: {
		filters: readonly PlantRepositoryFilterClause[];
		dto: PlantRepositoryUpdatePatchDTO;
	}): Promise<PlantRepositoryUpdateOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.plants.values(), input.filters);
		if (!row) this.throwNotFoundError("Plant", input.filters);
		const updated = this.patchStored(row, input.dto);
		this.assertCultivarMatchesWorkspace(updated.cultivarId, updated.workspaceKey);
		this.store.plants.set(idKey(updated.id), updated);
		return this.hydrate(updated);
	}

	async updateMany(input: {
		filters: readonly PlantRepositoryFilterClause[];
		dto: PlantRepositoryUpdatePatchDTO;
	}): Promise<PlantRepositoryUpdateManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.plants.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const updated = this.patchStored(row, input.dto);
			this.assertCultivarMatchesWorkspace(updated.cultivarId, updated.workspaceKey);
			this.store.plants.set(idKey(updated.id), updated);
			count += 1;
		}
		return { count };
	}

	async deleteOne(input: {
		filters: readonly PlantRepositoryFilterClause[];
	}): Promise<PlantRepositoryDeleteOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.plants.values(), input.filters);
		if (!row) this.throwNotFoundError("Plant", input.filters);
		this.store.unlinkAllEventsFromPlant(row.id);
		this.store.plants.delete(idKey(row.id));
		return row.id;
	}

	async deleteMany(input: {
		filters: readonly PlantRepositoryFilterClause[];
	}): Promise<PlantRepositoryDeleteManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.plants.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			this.store.unlinkAllEventsFromPlant(row.id);
			if (this.store.plants.delete(idKey(row.id))) count += 1;
		}
		return { count };
	}
}
