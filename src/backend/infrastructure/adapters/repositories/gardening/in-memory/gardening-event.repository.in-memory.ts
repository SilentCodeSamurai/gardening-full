import type {
	GardeningEventRepositoryPort,
	GardeningEventRepositoryBindToLocationInputDTO,
	GardeningEventRepositoryBindToLocationOutputDTO,
	GardeningEventRepositoryBindToPlantInputDTO,
	GardeningEventRepositoryBindToPlantOutputDTO,
	GardeningEventRepositoryCreateInputDTO,
	GardeningEventRepositoryCreateOutputDTO,
	GardeningEventRepositoryDeleteInputDTO,
	GardeningEventRepositoryDeleteOutputDTO,
	GardeningEventRepositoryGetAllOutputDTO,
	GardeningEventRepositoryGetByIdInputDTO,
	GardeningEventRepositoryGetByIdOutputDTO,
	GardeningEventRepositoryGetForLocationInputDTO,
	GardeningEventRepositoryGetForLocationOutputDTO,
	GardeningEventRepositoryGetForPlantInputDTO,
	GardeningEventRepositoryGetForPlantOutputDTO,
	GardeningEventRepositoryGetBindingsForEventInputDTO,
	GardeningEventRepositoryGetBindingsForEventOutputDTO,
	GardeningEventRepositoryUpdateInputDTO,
	GardeningEventRepositoryUpdateOutputDTO,
} from "@backend/core/application/ports/repositories/gardening/gardening-event.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { GardeningEventEntity } from "@backend/core/domain/gardening/entities";
import type { InMemoryGardeningStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { gardeningEventId, idKey } from "@backend/infrastructure/integrations/shared/database-ids";

export class GardeningEventInMemoryRepository extends BaseRepositoryErrors implements GardeningEventRepositoryPort {
	constructor(private readonly store: InMemoryGardeningStore) {
		super();
	}

	async create(dto: GardeningEventRepositoryCreateInputDTO): Promise<GardeningEventRepositoryCreateOutputDTO> {
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

	async getById(dto: GardeningEventRepositoryGetByIdInputDTO): Promise<GardeningEventRepositoryGetByIdOutputDTO> {
		const row = this.store.gardeningEvents.get(idKey(dto.id));
		if (!row) this.throwNotFoundError("GardeningEvent", dto.id);
		return row;
	}

	async getAll(): Promise<GardeningEventRepositoryGetAllOutputDTO> {
		return { items: [...this.store.gardeningEvents.values()] };
	}

	async update(dto: GardeningEventRepositoryUpdateInputDTO): Promise<GardeningEventRepositoryUpdateOutputDTO> {
		const key = idKey(dto.id);
		const existing = this.store.gardeningEvents.get(key);
		if (!existing) this.throwNotFoundError("GardeningEvent", dto.id);
		const updated: GardeningEventEntity = {
			...existing,
			...dto,
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: new Date(),
		};
		this.store.gardeningEvents.set(key, updated);
		return updated;
	}

	async delete(dto: GardeningEventRepositoryDeleteInputDTO): Promise<GardeningEventRepositoryDeleteOutputDTO> {
		const key = idKey(dto.id);
		if (!this.store.gardeningEvents.has(key)) this.throwNotFoundError("GardeningEvent", dto.id);
		this.store.clearAllLinksForEvent(dto.id);
		this.store.gardeningEvents.delete(key);
		return dto.id;
	}

	async bindToPlant(
		input: GardeningEventRepositoryBindToPlantInputDTO,
	): Promise<GardeningEventRepositoryBindToPlantOutputDTO> {
		const ev = this.store.gardeningEvents.get(idKey(input.id));
		if (!ev) this.throwNotFoundError("GardeningEvent", input.id);
		if (!this.store.plants.has(idKey(input.plantId))) this.throwNotFoundError("Plant", input.plantId);
		this.store.linkEventToPlant(input.id, input.plantId);
		return ev;
	}

	async bindToLocation(
		input: GardeningEventRepositoryBindToLocationInputDTO,
	): Promise<GardeningEventRepositoryBindToLocationOutputDTO> {
		const ev = this.store.gardeningEvents.get(idKey(input.id));
		if (!ev) this.throwNotFoundError("GardeningEvent", input.id);
		if (!this.store.locations.has(idKey(input.locationId))) this.throwNotFoundError("Location", input.locationId);
		this.store.linkEventToLocation(input.id, input.locationId);
		return ev;
	}

	async getForPlant(
		input: GardeningEventRepositoryGetForPlantInputDTO,
	): Promise<GardeningEventRepositoryGetForPlantOutputDTO> {
		const eventIds = this.store.plantToEvents.get(idKey(input.plantId)) ?? new Set();
		const items = [...eventIds]
			.map((eid) => this.store.gardeningEvents.get(eid))
			.filter((e): e is GardeningEventEntity => e !== undefined)
			.sort((a, b) => idKey(a.id).localeCompare(idKey(b.id)));
		return { items };
	}

	async getForLocation(
		input: GardeningEventRepositoryGetForLocationInputDTO,
	): Promise<GardeningEventRepositoryGetForLocationOutputDTO> {
		const eventIds = this.store.locationToEvents.get(idKey(input.locationId)) ?? new Set();
		const items = [...eventIds]
			.map((eid) => this.store.gardeningEvents.get(eid))
			.filter((e): e is GardeningEventEntity => e !== undefined)
			.sort((a, b) => idKey(a.id).localeCompare(idKey(b.id)));
		return { items };
	}

	async getBindingsForEvent(
		input: GardeningEventRepositoryGetBindingsForEventInputDTO,
	): Promise<GardeningEventRepositoryGetBindingsForEventOutputDTO> {
		await this.getById({ id: input.id });
		return this.store.getBindingsForEvent(input.id);
	}
}
