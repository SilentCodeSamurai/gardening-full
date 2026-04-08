import type {
	CultivarRepositoryPort,
	CultivarRepositoryCreateInputDTO,
	CultivarRepositoryCreateOutputDTO,
	CultivarRepositoryDeleteInputDTO,
	CultivarRepositoryDeleteOutputDTO,
	CultivarRepositoryGetAllOutputDTO,
	CultivarRepositoryGetByIdInputDTO,
	CultivarRepositoryGetByIdOutputDTO,
	CultivarRepositoryGetFullByIdInputDTO,
	CultivarRepositoryGetFullByIdOutputDTO,
	CultivarRepositoryUpdateInputDTO,
	CultivarRepositoryUpdateOutputDTO,
} from "@backend/core/application/ports/repositories/gardening/cultivar.repositort.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { CultivarEntity } from "@backend/core/domain/gardening/entities";
import type { InMemoryGardeningStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { cultivarId, idKey } from "@backend/infrastructure/integrations/shared/database-ids";

export class CultivarInMemoryRepository extends BaseRepositoryErrors implements CultivarRepositoryPort {
	constructor(private readonly store: InMemoryGardeningStore) {
		super();
	}

	async create(dto: CultivarRepositoryCreateInputDTO): Promise<CultivarRepositoryCreateOutputDTO> {
		if (!this.store.species.has(idKey(dto.speciesId))) {
			this.throwNotFoundError("Species", dto.speciesId);
		}
		const now = new Date();
		const id = cultivarId();
		const row: CultivarEntity = {
			id,
			speciesId: dto.speciesId,
			characteristics: dto.characteristics,
			presentation: dto.presentation,
			createdAt: now,
			updatedAt: now,
		};
		this.store.cultivars.set(idKey(id), row);
		return row;
	}

	async getById(dto: CultivarRepositoryGetByIdInputDTO): Promise<CultivarRepositoryGetByIdOutputDTO> {
		const row = this.store.cultivars.get(idKey(dto.id));
		if (!row) this.throwNotFoundError("Cultivar", dto.id);
		return row;
	}

	async getFullById(dto: CultivarRepositoryGetFullByIdInputDTO): Promise<CultivarRepositoryGetFullByIdOutputDTO> {
		const cultivar = this.store.cultivars.get(idKey(dto.id));
		if (!cultivar) this.throwNotFoundError("Cultivar", dto.id);
		const species = this.store.species.get(idKey(cultivar.speciesId));
		if (!species) this.throwNotFoundError("Species", cultivar.speciesId);
		return { ...cultivar, species };
	}

	async getAll(): Promise<CultivarRepositoryGetAllOutputDTO> {
		return { items: [...this.store.cultivars.values()] };
	}

	async update(dto: CultivarRepositoryUpdateInputDTO): Promise<CultivarRepositoryUpdateOutputDTO> {
		const key = idKey(dto.id);
		const existing = this.store.cultivars.get(key);
		if (!existing) this.throwNotFoundError("Cultivar", dto.id);
		if (dto.speciesId !== undefined && !this.store.species.has(idKey(dto.speciesId))) {
			this.throwNotFoundError("Species", dto.speciesId);
		}
		const updated: CultivarEntity = {
			...existing,
			...dto,
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: new Date(),
		};
		this.store.cultivars.set(key, updated);
		return updated;
	}

	async delete(dto: CultivarRepositoryDeleteInputDTO): Promise<CultivarRepositoryDeleteOutputDTO> {
		const key = idKey(dto.id);
		if (!this.store.cultivars.has(key)) this.throwNotFoundError("Cultivar", dto.id);
		for (const plant of this.store.plants.values()) {
			if (idKey(plant.cultivarId) === key) {
				this.throwConflictError({
					operation: "delete",
					reason: "plants-reference-cultivar",
					context: { cultivarId: dto.id, plantId: plant.id },
					participants: [
						{ entity: "Cultivar", role: "target", id: dto.id },
						{ entity: "Plant", role: "blocking-reference", id: plant.id },
					],
					message: "Cannot delete cultivar: plants still reference it.",
				});
			}
		}
		this.store.cultivars.delete(key);
		return dto.id;
	}
}
