import type {
	GardeningEventRepositoryPortV2,
	GardeningEventRepositoryV2CreateInputDTO,
	GardeningEventRepositoryV2CreateManyInputDTO,
	GardeningEventRepositoryV2CreateManyOutputDTO,
	GardeningEventRepositoryV2CreateOutputDTO,
	GardeningEventRepositoryV2DeleteManyOutputDTO,
	GardeningEventRepositoryV2DeleteOutputDTO,
	GardeningEventRepositoryV2FilterClause,
	GardeningEventRepositoryV2ForLocationFilterClause,
	GardeningEventRepositoryV2ForPlantFilterClause,
	GardeningEventRepositoryV2GetBindingsOutputDTO,
	GardeningEventRepositoryV2GetManyOutputDTO,
	GardeningEventRepositoryV2GetOneOutputDTO,
	GardeningEventRepositoryV2UpdateManyOutputDTO,
	GardeningEventRepositoryV2UpdateOutputDTO,
	GardeningEventRepositoryV2UpdatePatchDTO,
} from "@backend/core/application/ports/repositories/gardening/gardening-event.repository.port.v2";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { GardeningEventEntity, LocationEntityId, PlantEntityId } from "@backend/core/domain/gardening/entities.v2";
import {
	findFirstRowMatchingAnyClause,
	findRowsMatchingAnyClause,
} from "@backend/infrastructure/adapters/repositories/shared/in-memory-v2-entity-filter";
import type { InMemoryStoreV2 } from "@backend/infrastructure/integrations/in-memory-database/client.v2";
import { gardeningEventId, idKey } from "@backend/infrastructure/integrations/shared/database-ids";

export class GardeningEventInMemoryRepositoryV2 extends BaseRepositoryErrors implements GardeningEventRepositoryPortV2 {
	constructor(private readonly store: InMemoryStoreV2) {
		super();
	}

	private insertRow(dto: GardeningEventRepositoryV2CreateInputDTO): GardeningEventRepositoryV2CreateOutputDTO {
		const now = new Date();
		const id = gardeningEventId();
		const row: GardeningEventEntity = {
			id,
			action: dto.action,
			createdAt: now,
			updatedAt: now,
		};
		this.store.gardeningEvents.set(idKey(id), row);
		return row;
	}

	private patchStored(
		existing: GardeningEventEntity,
		dto: GardeningEventRepositoryV2UpdatePatchDTO,
	): GardeningEventEntity {
		return {
			...existing,
			action: dto.action !== undefined ? dto.action : existing.action,
			updatedAt: new Date(),
		};
	}

	private resolveStoredFromFilters(
		filters: readonly GardeningEventRepositoryV2FilterClause[],
	): GardeningEventEntity {
		const row = findFirstRowMatchingAnyClause(this.store.gardeningEvents.values(), filters);
		if (!row) this.throwNotFoundError("GardeningEvent", filters);
		return row;
	}

	async createOne(dto: GardeningEventRepositoryV2CreateInputDTO): Promise<GardeningEventRepositoryV2CreateOutputDTO> {
		return this.insertRow(dto);
	}

	async createMany(
		input: GardeningEventRepositoryV2CreateManyInputDTO,
	): Promise<GardeningEventRepositoryV2CreateManyOutputDTO> {
		let count = 0;
		for (const item of input.items) {
			this.insertRow(item);
			count += 1;
		}
		return { count };
	}

	async getOne(input: {
		filters: readonly GardeningEventRepositoryV2FilterClause[];
	}): Promise<GardeningEventRepositoryV2GetOneOutputDTO> {
		return this.resolveStoredFromFilters(input.filters);
	}

	async getMany(input?: {
		filters?: readonly GardeningEventRepositoryV2FilterClause[];
	}): Promise<GardeningEventRepositoryV2GetManyOutputDTO> {
		if (input?.filters === undefined) {
			return { items: [...this.store.gardeningEvents.values()] };
		}
		if (input.filters.length === 0) return { items: [] };
		const rows = findRowsMatchingAnyClause([...this.store.gardeningEvents.values()], input.filters);
		return { items: rows };
	}

	async updateOne(input: {
		filters: readonly GardeningEventRepositoryV2FilterClause[];
		dto: GardeningEventRepositoryV2UpdatePatchDTO;
	}): Promise<GardeningEventRepositoryV2UpdateOutputDTO> {
		const row = this.resolveStoredFromFilters(input.filters);
		const updated = this.patchStored(row, input.dto);
		this.store.gardeningEvents.set(idKey(updated.id), updated);
		return updated;
	}

	async updateMany(input: {
		filters: readonly GardeningEventRepositoryV2FilterClause[];
		dto: GardeningEventRepositoryV2UpdatePatchDTO;
	}): Promise<GardeningEventRepositoryV2UpdateManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.gardeningEvents.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const updated = this.patchStored(row, input.dto);
			this.store.gardeningEvents.set(idKey(updated.id), updated);
			count += 1;
		}
		return { count };
	}

	async deleteOne(input: {
		filters: readonly GardeningEventRepositoryV2FilterClause[];
	}): Promise<GardeningEventRepositoryV2DeleteOutputDTO> {
		const row = this.resolveStoredFromFilters(input.filters);
		this.store.clearAllLinksForEvent(row.id);
		this.store.gardeningEvents.delete(idKey(row.id));
		return row.id;
	}

	async deleteMany(input: {
		filters: readonly GardeningEventRepositoryV2FilterClause[];
	}): Promise<GardeningEventRepositoryV2DeleteManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.gardeningEvents.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			this.store.clearAllLinksForEvent(row.id);
			if (this.store.gardeningEvents.delete(idKey(row.id))) count += 1;
		}
		return { count };
	}

	async getManyForPlant(input: {
		filters: readonly GardeningEventRepositoryV2ForPlantFilterClause[];
	}): Promise<GardeningEventRepositoryV2GetManyOutputDTO> {
		const items: GardeningEventEntity[] = [];
		const seen = new Set<string>();
		for (const clause of input.filters) {
			const eventIds = this.store.plantToEvents.get(idKey(clause.plantId)) ?? new Set();
			for (const eid of eventIds) {
				const row = this.store.gardeningEvents.get(eid);
				if (!row) continue;
				const k = idKey(row.id);
				if (seen.has(k)) continue;
				seen.add(k);
				items.push(row);
			}
		}
		items.sort((a, b) => idKey(a.id).localeCompare(idKey(b.id)));
		return { items };
	}

	async getManyForLocation(input: {
		filters: readonly GardeningEventRepositoryV2ForLocationFilterClause[];
	}): Promise<GardeningEventRepositoryV2GetManyOutputDTO> {
		const items: GardeningEventEntity[] = [];
		const seen = new Set<string>();
		for (const clause of input.filters) {
			const eventIds = this.store.locationToEvents.get(idKey(clause.locationId)) ?? new Set();
			for (const eid of eventIds) {
				const row = this.store.gardeningEvents.get(eid);
				if (!row) continue;
				const k = idKey(row.id);
				if (seen.has(k)) continue;
				seen.add(k);
				items.push(row);
			}
		}
		items.sort((a, b) => idKey(a.id).localeCompare(idKey(b.id)));
		return { items };
	}

	async bindToPlantOne(input: {
		filters: readonly GardeningEventRepositoryV2FilterClause[];
		plantId: PlantEntityId;
	}): Promise<GardeningEventEntity> {
		const row = this.resolveStoredFromFilters(input.filters);
		if (!this.store.plants.has(idKey(input.plantId))) this.throwNotFoundError("Plant", input.plantId);
		this.store.linkEventToPlant(row.id, input.plantId);
		return row;
	}

	async bindToLocationOne(input: {
		filters: readonly GardeningEventRepositoryV2FilterClause[];
		locationId: LocationEntityId;
	}): Promise<GardeningEventEntity> {
		const row = this.resolveStoredFromFilters(input.filters);
		if (!this.store.locations.has(idKey(input.locationId))) this.throwNotFoundError("Location", input.locationId);
		this.store.linkEventToLocation(row.id, input.locationId);
		return row;
	}

	async getBindingsOne(input: {
		filters: readonly GardeningEventRepositoryV2FilterClause[];
	}): Promise<GardeningEventRepositoryV2GetBindingsOutputDTO> {
		const row = this.resolveStoredFromFilters(input.filters);
		return this.store.getBindingsForEvent(row.id);
	}
}
