import type {
	LocationRepositoryCreateInputDTO,
	LocationRepositoryCreateOutputDTO,
	LocationRepositoryDeleteInputDTO,
	LocationRepositoryDeleteManyInputDTO,
	LocationRepositoryDeleteManyOutputDTO,
	LocationRepositoryDeleteOutputDTO,
	LocationRepositoryGetAllOutputDTO,
	LocationRepositoryGetByIdInputDTO,
	LocationRepositoryGetByIdOutputDTO,
	LocationRepositoryPort,
	LocationRepositoryUpdateInputDTO,
	LocationRepositoryUpdateOutputDTO,
} from "@backend/core/application/ports/repositories/gardening/location.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { LocationEntity, LocationEntityId } from "@backend/core/domain/gardening/entities";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, locationId } from "@backend/infrastructure/integrations/shared/database-ids";

export class LocationInMemoryRepository extends BaseRepositoryErrors implements LocationRepositoryPort {
	constructor(private readonly store: InMemoryStore) {
		super();
	}

	private insertRow(dto: LocationRepositoryCreateInputDTO): LocationRepositoryCreateOutputDTO {
		const now = new Date();
		const id = locationId();
		const row: LocationEntity = {
			id,
			workspaceKey: dto.workspaceKey,
			name: dto.name,
			presentation: dto.presentation,
			createdAt: now,
			updatedAt: now,
		};
		this.store.locations.set(idKey(id), row);
		return row;
	}

	private loadById(dto: LocationRepositoryGetByIdInputDTO): LocationRepositoryGetByIdOutputDTO {
		const row = this.store.locations.get(idKey(dto.id));
		if (!row) this.throwNotFoundError("Location", dto.id);
		return row;
	}

	private listInWorkspaces(
		workspaceKeys: readonly LocationEntity["workspaceKey"][],
	): LocationRepositoryGetAllOutputDTO {
		const allowed = new Set(workspaceKeys.map((key) => String(key)));
		return { items: [...this.store.locations.values()].filter((x) => allowed.has(String(x.workspaceKey))) };
	}

	private patchRow(dto: LocationRepositoryUpdateInputDTO): LocationRepositoryUpdateOutputDTO {
		const key = idKey(dto.id);
		const existing = this.store.locations.get(key);
		if (!existing) this.throwNotFoundError("Location", dto.id);
		const updated: LocationEntity = {
			...existing,
			...dto,
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: new Date(),
			name: dto.name ?? existing.name,
		};
		this.store.locations.set(key, updated);
		return updated;
	}

	private removeRow(dto: LocationRepositoryDeleteInputDTO): LocationRepositoryDeleteOutputDTO {
		const key = idKey(dto.id);
		if (!this.store.locations.has(key)) this.throwNotFoundError("Location", dto.id);
		this.store.unlinkAllEventsFromLocation(dto.id);
		this.store.locations.delete(key);
		return dto.id;
	}

	private removeManyInWorkspaces(
		workspaceKeys: readonly LocationEntity["workspaceKey"][],
		dto: LocationRepositoryDeleteManyInputDTO,
	): LocationRepositoryDeleteManyOutputDTO {
		const allowed = new Set(workspaceKeys.map((key) => String(key)));
		const deletedIds: LocationEntityId[] = [];
		for (const id of dto.ids) {
			const key = idKey(id);
			const row = this.store.locations.get(key);
			if (!row || !allowed.has(String(row.workspaceKey))) continue;
			this.store.unlinkAllEventsFromLocation(id);
			this.store.locations.delete(key);
			deletedIds.push(id);
		}
		return { deletedIds };
	}

	async deleteManyScoped(input: {
		workspaceKeys: readonly LocationEntity["workspaceKey"][];
		dto: LocationRepositoryDeleteManyInputDTO;
	}): Promise<LocationRepositoryDeleteManyOutputDTO> {
		return this.removeManyInWorkspaces(input.workspaceKeys, input.dto);
	}

	async createScoped(input: { dto: LocationRepositoryCreateInputDTO }): Promise<LocationRepositoryCreateOutputDTO> {
		return this.insertRow(input.dto);
	}

	async getAllScoped(input: {
		workspaceKeys: readonly LocationEntity["workspaceKey"][];
	}): Promise<LocationRepositoryGetAllOutputDTO> {
		return this.listInWorkspaces(input.workspaceKeys);
	}

	async getByIdScoped(input: {
		workspaceKey: LocationEntity["workspaceKey"];
		dto: LocationRepositoryGetByIdInputDTO;
	}): Promise<LocationRepositoryGetByIdOutputDTO> {
		const row = this.loadById(input.dto);
		if (String(row.workspaceKey) !== String(input.workspaceKey)) {
			this.throwNotFoundError("Location", input.dto.id);
		}
		return row;
	}

	async updateByIdScoped(input: {
		workspaceKey: LocationEntity["workspaceKey"];
		dto: LocationRepositoryUpdateInputDTO;
	}): Promise<LocationRepositoryUpdateOutputDTO> {
		await this.getByIdScoped({ workspaceKey: input.workspaceKey, dto: { id: input.dto.id } });
		return this.patchRow(input.dto);
	}

	async deleteByIdScoped(input: {
		workspaceKey: LocationEntity["workspaceKey"];
		dto: LocationRepositoryDeleteInputDTO;
	}): Promise<LocationRepositoryDeleteOutputDTO> {
		await this.getByIdScoped({ workspaceKey: input.workspaceKey, dto: input.dto });
		return this.removeRow(input.dto);
	}
}
