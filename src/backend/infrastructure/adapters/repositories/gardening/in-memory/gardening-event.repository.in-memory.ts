import type {
	GardeningEventRepositoryBindToLocationInputDTO,
	GardeningEventRepositoryBindToLocationOutputDTO,
	GardeningEventRepositoryBindToPlantInputDTO,
	GardeningEventRepositoryBindToPlantOutputDTO,
	GardeningEventRepositoryCreateInputDTO,
	GardeningEventRepositoryCreateOutputDTO,
	GardeningEventRepositoryDeleteInputDTO,
	GardeningEventRepositoryDeleteOutputDTO,
	GardeningEventRepositoryGetAllOutputDTO,
	GardeningEventRepositoryGetBindingsForEventInputDTO,
	GardeningEventRepositoryGetBindingsForEventOutputDTO,
	GardeningEventRepositoryGetByIdInputDTO,
	GardeningEventRepositoryGetByIdOutputDTO,
	GardeningEventRepositoryGetForLocationInputDTO,
	GardeningEventRepositoryGetForLocationOutputDTO,
	GardeningEventRepositoryGetForPlantInputDTO,
	GardeningEventRepositoryGetForPlantOutputDTO,
	GardeningEventRepositoryPort,
	GardeningEventRepositoryUpdateInputDTO,
	GardeningEventRepositoryUpdateOutputDTO,
} from "@backend/core/application/ports/repositories/gardening/gardening-event.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { GardeningEventEntity } from "@backend/core/domain/gardening/entities";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { gardeningEventId, idKey } from "@backend/infrastructure/integrations/shared/database-ids";

export class GardeningEventInMemoryRepository extends BaseRepositoryErrors implements GardeningEventRepositoryPort {
	constructor(private readonly store: InMemoryStore) {
		super();
	}

	private insertRow(dto: GardeningEventRepositoryCreateInputDTO): GardeningEventRepositoryCreateOutputDTO {
		const now = new Date();
		const id = gardeningEventId();
		const row: GardeningEventEntity = {
			id,
			workspaceKey: dto.workspaceKey,
			action: dto.action,
			createdAt: now,
			updatedAt: now,
		};
		this.store.gardeningEvents.set(idKey(id), row);
		return row;
	}

	private loadById(dto: GardeningEventRepositoryGetByIdInputDTO): GardeningEventRepositoryGetByIdOutputDTO {
		const row = this.store.gardeningEvents.get(idKey(dto.id));
		if (!row) this.throwNotFoundError("GardeningEvent", dto.id);
		return row;
	}

	private listInWorkspaces(
		workspaceKeys: readonly GardeningEventEntity["workspaceKey"][],
	): GardeningEventRepositoryGetAllOutputDTO {
		const allowed = new Set(workspaceKeys.map((key) => String(key)));
		return { items: [...this.store.gardeningEvents.values()].filter((x) => allowed.has(String(x.workspaceKey))) };
	}

	private patchRow(dto: GardeningEventRepositoryUpdateInputDTO): GardeningEventRepositoryUpdateOutputDTO {
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

	private removeRow(dto: GardeningEventRepositoryDeleteInputDTO): GardeningEventRepositoryDeleteOutputDTO {
		const key = idKey(dto.id);
		if (!this.store.gardeningEvents.has(key)) this.throwNotFoundError("GardeningEvent", dto.id);
		this.store.clearAllLinksForEvent(dto.id);
		this.store.gardeningEvents.delete(key);
		return dto.id;
	}

	async bindToPlantScoped(input: {
		workspaceKey: GardeningEventEntity["workspaceKey"];
		dto: GardeningEventRepositoryBindToPlantInputDTO;
	}): Promise<GardeningEventRepositoryBindToPlantOutputDTO> {
		const ev = this.loadById({ id: input.dto.id });
		if (String(ev.workspaceKey) !== String(input.workspaceKey)) {
			this.throwNotFoundError("GardeningEvent", input.dto.id);
		}
		if (!this.store.plants.has(idKey(input.dto.plantId))) this.throwNotFoundError("Plant", input.dto.plantId);
		this.store.linkEventToPlant(input.dto.id, input.dto.plantId);
		return ev;
	}

	async bindToLocationScoped(input: {
		workspaceKey: GardeningEventEntity["workspaceKey"];
		dto: GardeningEventRepositoryBindToLocationInputDTO;
	}): Promise<GardeningEventRepositoryBindToLocationOutputDTO> {
		const ev = this.loadById({ id: input.dto.id });
		if (String(ev.workspaceKey) !== String(input.workspaceKey)) {
			this.throwNotFoundError("GardeningEvent", input.dto.id);
		}
		if (!this.store.locations.has(idKey(input.dto.locationId))) {
			this.throwNotFoundError("Location", input.dto.locationId);
		}
		this.store.linkEventToLocation(input.dto.id, input.dto.locationId);
		return ev;
	}

	async getForPlantScoped(input: {
		workspaceKeys: readonly GardeningEventEntity["workspaceKey"][];
		dto: GardeningEventRepositoryGetForPlantInputDTO;
	}): Promise<GardeningEventRepositoryGetForPlantOutputDTO> {
		const allowed = new Set(input.workspaceKeys.map((key) => String(key)));
		const eventIds = this.store.plantToEvents.get(idKey(input.dto.plantId)) ?? new Set();
		const items = [...eventIds]
			.map((eid) => this.store.gardeningEvents.get(eid))
			.filter((e): e is GardeningEventEntity => e !== undefined)
			.filter((e) => allowed.has(String(e.workspaceKey)))
			.sort((a, b) => idKey(a.id).localeCompare(idKey(b.id)));
		return { items };
	}

	async getForLocationScoped(input: {
		workspaceKeys: readonly GardeningEventEntity["workspaceKey"][];
		dto: GardeningEventRepositoryGetForLocationInputDTO;
	}): Promise<GardeningEventRepositoryGetForLocationOutputDTO> {
		const allowed = new Set(input.workspaceKeys.map((key) => String(key)));
		const eventIds = this.store.locationToEvents.get(idKey(input.dto.locationId)) ?? new Set();
		const items = [...eventIds]
			.map((eid) => this.store.gardeningEvents.get(eid))
			.filter((e): e is GardeningEventEntity => e !== undefined)
			.filter((e) => allowed.has(String(e.workspaceKey)))
			.sort((a, b) => idKey(a.id).localeCompare(idKey(b.id)));
		return { items };
	}

	async getBindingsForEventScoped(input: {
		workspaceKey: GardeningEventEntity["workspaceKey"];
		dto: GardeningEventRepositoryGetBindingsForEventInputDTO;
	}): Promise<GardeningEventRepositoryGetBindingsForEventOutputDTO> {
		const row = await this.getByIdScoped({ workspaceKey: input.workspaceKey, dto: { id: input.dto.id } });
		return this.store.getBindingsForEvent(row.id);
	}

	async createScoped(
		input: { dto: GardeningEventRepositoryCreateInputDTO },
	): Promise<GardeningEventRepositoryCreateOutputDTO> {
		return this.insertRow(input.dto);
	}

	async getAllScoped(input: {
		workspaceKeys: readonly GardeningEventEntity["workspaceKey"][];
	}): Promise<GardeningEventRepositoryGetAllOutputDTO> {
		return this.listInWorkspaces(input.workspaceKeys);
	}

	async getByIdScoped(input: {
		workspaceKey: GardeningEventEntity["workspaceKey"];
		dto: GardeningEventRepositoryGetByIdInputDTO;
	}): Promise<GardeningEventRepositoryGetByIdOutputDTO> {
		const row = this.loadById(input.dto);
		if (String(row.workspaceKey) !== String(input.workspaceKey)) {
			this.throwNotFoundError("GardeningEvent", input.dto.id);
		}
		return row;
	}

	async updateByIdScoped(input: {
		workspaceKey: GardeningEventEntity["workspaceKey"];
		dto: GardeningEventRepositoryUpdateInputDTO;
	}): Promise<GardeningEventRepositoryUpdateOutputDTO> {
		await this.getByIdScoped({ workspaceKey: input.workspaceKey, dto: { id: input.dto.id } });
		return this.patchRow(input.dto);
	}

	async deleteByIdScoped(input: {
		workspaceKey: GardeningEventEntity["workspaceKey"];
		dto: GardeningEventRepositoryDeleteInputDTO;
	}): Promise<GardeningEventRepositoryDeleteOutputDTO> {
		await this.getByIdScoped({ workspaceKey: input.workspaceKey, dto: input.dto });
		return this.removeRow(input.dto);
	}
}
