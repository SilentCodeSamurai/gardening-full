import type {
	LocationRepositoryPort,
	LocationRepositoryCreateInputDTO,
	LocationRepositoryCreateOutputDTO,
	LocationRepositoryDeleteInputDTO,
	LocationRepositoryDeleteManyInputDTO,
	LocationRepositoryDeleteManyOutputDTO,
	LocationRepositoryDeleteOutputDTO,
	LocationRepositoryGetAllOutputDTO,
	LocationRepositoryGetByIdInputDTO,
	LocationRepositoryGetByIdOutputDTO,
	LocationRepositoryUpdateInputDTO,
	LocationRepositoryUpdateOutputDTO,
} from "@backend/core/application/ports/repositories/gardening/location.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { LocationEntity, LocationEntityId } from "@backend/core/domain/gardening/entities";
import type { InMemoryGardeningStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, locationId } from "@backend/infrastructure/integrations/shared/database-ids";

export class LocationInMemoryRepository extends BaseRepositoryErrors implements LocationRepositoryPort {
	constructor(private readonly store: InMemoryGardeningStore) {
		super();
	}

	async create(dto: LocationRepositoryCreateInputDTO): Promise<LocationRepositoryCreateOutputDTO> {
		const now = new Date();
		const id = locationId();
		const row: LocationEntity = {
			id,
			name: dto.name,
			presentation: dto.presentation,
			createdAt: now,
			updatedAt: now,
		};
		this.store.locations.set(idKey(id), row);
		return row;
	}

	async getById(dto: LocationRepositoryGetByIdInputDTO): Promise<LocationRepositoryGetByIdOutputDTO> {
		const row = this.store.locations.get(idKey(dto.id));
		if (!row) this.throwNotFoundError("Location", dto.id);
		return row;
	}

	async getAll(): Promise<LocationRepositoryGetAllOutputDTO> {
		return { items: [...this.store.locations.values()] };
	}

	async update(dto: LocationRepositoryUpdateInputDTO): Promise<LocationRepositoryUpdateOutputDTO> {
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

	async delete(dto: LocationRepositoryDeleteInputDTO): Promise<LocationRepositoryDeleteOutputDTO> {
		const key = idKey(dto.id);
		if (!this.store.locations.has(key)) this.throwNotFoundError("Location", dto.id);
		this.store.unlinkAllEventsFromLocation(dto.id);
		this.store.locations.delete(key);
		return dto.id;
	}

	async deleteMany(dto: LocationRepositoryDeleteManyInputDTO): Promise<LocationRepositoryDeleteManyOutputDTO> {
		const deletedIds: LocationEntityId[] = [];
		for (const id of dto.ids) {
			const key = idKey(id);
			if (!this.store.locations.has(key)) continue;
			this.store.unlinkAllEventsFromLocation(id);
			this.store.locations.delete(key);
			deletedIds.push(id);
		}
		return { deletedIds };
	}
}
