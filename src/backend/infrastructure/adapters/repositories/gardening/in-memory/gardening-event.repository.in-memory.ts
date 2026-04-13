import type {
	GardeningEventRepositoryCreateInputDTO,
	GardeningEventRepositoryCreateManyInputDTO,
	GardeningEventRepositoryCreateManyOutputDTO,
	GardeningEventRepositoryCreateOutputDTO,
	GardeningEventRepositoryDeleteManyOutputDTO,
	GardeningEventRepositoryDeleteOutputDTO,
	GardeningEventRepositoryFilterClause,
	GardeningEventRepositoryForLocationFilterClause,
	GardeningEventRepositoryForPlantFilterClause,
	GardeningEventRepositoryGetBindingsOutputDTO,
	GardeningEventRepositoryGetManyOutputDTO,
	GardeningEventRepositoryGetOneOutputDTO,
	GardeningEventRepositoryPort,
	GardeningEventRepositoryUpdateManyOutputDTO,
	GardeningEventRepositoryUpdateOutputDTO,
	GardeningEventRepositoryUpdatePatchDTO,
} from "@backend/core/application/ports/repositories/gardening/gardening-event.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { GardeningEventEntity, LocationEntityId, PlantEntityId } from "@backend/core/domain/gardening/entities";
import {
	findFirstRowMatchingAnyClause,
	findRowsMatchingAnyClause,
} from "@backend/infrastructure/adapters/repositories/shared/in-memory-entity-filter";
import { InMemoryTransactionManagerAdapter } from "@backend/infrastructure/adapters/transaction/in-memory-transaction-manager.adapter";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { gardeningEventId, idKey } from "@backend/infrastructure/integrations/shared/database-ids";
import { inject, injectable } from "tsyringe";

@injectable()
export class GardeningEventInMemoryRepository extends BaseRepositoryErrors implements GardeningEventRepositoryPort {
	constructor(
		@inject(InMemoryTransactionManagerAdapter)
		private readonly transactionManager: InMemoryTransactionManagerAdapter,
	) {
		super();
	}

	private insertRow(dto: GardeningEventRepositoryCreateInputDTO): GardeningEventRepositoryCreateOutputDTO {
		const now = new Date();
		const id = gardeningEventId();
		const row: GardeningEventEntity = {
			...dto,
			id,
			createdAt: now,
			updatedAt: now,
		};
		this.store.gardeningEvents.set(idKey(id), row);
		return row;
	}

	private patchStored(
		existing: GardeningEventEntity,
		dto: GardeningEventRepositoryUpdatePatchDTO,
	): GardeningEventEntity {
		return {
			...existing,
			workspace: dto.workspace !== undefined ? dto.workspace : existing.workspace,
			action: dto.action !== undefined ? dto.action : existing.action,
			updatedAt: new Date(),
		};
	}

	private resolveStoredFromFilters(filters: readonly GardeningEventRepositoryFilterClause[]): GardeningEventEntity {
		const row = findFirstRowMatchingAnyClause(this.store.gardeningEvents.values(), filters);
		if (!row) this.throwNotFoundError("GardeningEvent", filters);
		return row;
	}

	async createOne(dto: GardeningEventRepositoryCreateInputDTO): Promise<GardeningEventRepositoryCreateOutputDTO> {
		return this.insertRow(dto);
	}

	async createMany(
		input: GardeningEventRepositoryCreateManyInputDTO,
	): Promise<GardeningEventRepositoryCreateManyOutputDTO> {
		let count = 0;
		for (const item of input.items) {
			this.insertRow(item);
			count += 1;
		}
		return { count };
	}

	async getOne(input: {
		filters: readonly GardeningEventRepositoryFilterClause[];
	}): Promise<GardeningEventRepositoryGetOneOutputDTO> {
		return this.resolveStoredFromFilters(input.filters);
	}

	async getMany(input?: {
		filters?: readonly GardeningEventRepositoryFilterClause[];
	}): Promise<GardeningEventRepositoryGetManyOutputDTO> {
		if (input?.filters === undefined) {
			return { items: [...this.store.gardeningEvents.values()] };
		}
		if (input.filters.length === 0) return { items: [] };
		const rows = findRowsMatchingAnyClause([...this.store.gardeningEvents.values()], input.filters);
		return { items: rows };
	}

	async updateOne(input: {
		filters: readonly GardeningEventRepositoryFilterClause[];
		dto: GardeningEventRepositoryUpdatePatchDTO;
	}): Promise<GardeningEventRepositoryUpdateOutputDTO> {
		const row = this.resolveStoredFromFilters(input.filters);
		const updated = this.patchStored(row, input.dto);
		this.store.gardeningEvents.set(idKey(updated.id), updated);
		return updated;
	}

	async updateMany(input: {
		filters: readonly GardeningEventRepositoryFilterClause[];
		dto: GardeningEventRepositoryUpdatePatchDTO;
	}): Promise<GardeningEventRepositoryUpdateManyOutputDTO> {
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
		filters: readonly GardeningEventRepositoryFilterClause[];
	}): Promise<GardeningEventRepositoryDeleteOutputDTO> {
		const row = this.resolveStoredFromFilters(input.filters);
		this.store.clearAllLinksForEvent(row.id);
		this.store.gardeningEvents.delete(idKey(row.id));
		return row.id;
	}

	async deleteMany(input: {
		filters: readonly GardeningEventRepositoryFilterClause[];
	}): Promise<GardeningEventRepositoryDeleteManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.gardeningEvents.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			this.store.clearAllLinksForEvent(row.id);
			if (this.store.gardeningEvents.delete(idKey(row.id))) count += 1;
		}
		return { count };
	}

	async getManyForPlant(input: {
		filters: readonly GardeningEventRepositoryForPlantFilterClause[];
	}): Promise<GardeningEventRepositoryGetManyOutputDTO> {
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
		filters: readonly GardeningEventRepositoryForLocationFilterClause[];
	}): Promise<GardeningEventRepositoryGetManyOutputDTO> {
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
		filters: readonly GardeningEventRepositoryFilterClause[];
		plantId: PlantEntityId;
	}): Promise<GardeningEventEntity> {
		const row = this.resolveStoredFromFilters(input.filters);
		const plant = this.store.plants.get(idKey(input.plantId));
		if (!plant) this.throwNotFoundError("Plant", input.plantId);
		this.store.linkEventToPlant(row.id, input.plantId);
		return row;
	}

	async bindToLocationOne(input: {
		filters: readonly GardeningEventRepositoryFilterClause[];
		locationId: LocationEntityId;
	}): Promise<GardeningEventEntity> {
		const row = this.resolveStoredFromFilters(input.filters);
		const location = this.store.locations.get(idKey(input.locationId));
		if (!location) this.throwNotFoundError("Location", input.locationId);
		this.store.linkEventToLocation(row.id, input.locationId);
		return row;
	}

	async getBindingsOne(input: {
		filters: readonly GardeningEventRepositoryFilterClause[];
	}): Promise<GardeningEventRepositoryGetBindingsOutputDTO> {
		const row = this.resolveStoredFromFilters(input.filters);
		return this.store.getBindingsForEvent(row.id);
	}

	private get store(): InMemoryStore {
		return this.transactionManager.session;
	}
}
