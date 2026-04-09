import type {
	PlantRepositoryCreateInputDTO,
	PlantRepositoryCreateManyInputDTO,
	PlantRepositoryCreateManyOutputDTO,
	PlantRepositoryCreateOutputDTO,
	PlantRepositoryDeleteInputDTO,
	PlantRepositoryDeleteManyInputDTO,
	PlantRepositoryDeleteManyOutputDTO,
	PlantRepositoryDeleteOutputDTO,
	PlantRepositoryGetAllOutputDTO,
	PlantRepositoryGetByCultivarIdInputDTO,
	PlantRepositoryGetByCultivarIdOutputDTO,
	PlantRepositoryGetByIdInputDTO,
	PlantRepositoryGetByIdOutputDTO,
	PlantRepositoryGetListByIdsInputDTO,
	PlantRepositoryGetListByIdsOutputDTO,
	PlantRepositoryPort,
	PlantRepositoryUpdateInputDTO,
	PlantRepositoryUpdateOutputDTO,
} from "@backend/core/application/ports/repositories/gardening/plant.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { HydratedPlantEntity, PlantEntity, PlantEntityId } from "@backend/core/domain/gardening/entities";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, plantId } from "@backend/infrastructure/integrations/shared/database-ids";

export class PlantInMemoryRepository extends BaseRepositoryErrors implements PlantRepositoryPort {
	constructor(private readonly store: InMemoryStore) {
		super();
	}

	private hydratePlant(row: PlantEntity): HydratedPlantEntity {
		const cultivar = this.store.cultivars.get(idKey(row.cultivarId));
		if (!cultivar) this.throwNotFoundError("Cultivar", row.cultivarId);
		const species = this.store.species.get(idKey(cultivar.speciesId));
		if (!species) this.throwNotFoundError("Species", cultivar.speciesId);
		return {
			...row,
			cultivar: {
				...cultivar,
				species,
			},
		};
	}

	async create(dto: PlantRepositoryCreateInputDTO): Promise<PlantRepositoryCreateOutputDTO> {
		if (!this.store.cultivars.has(idKey(dto.cultivarId))) {
			this.throwNotFoundError("Cultivar", dto.cultivarId);
		}
		const now = new Date();
		const id = plantId();
		const row: PlantEntity = {
			id,
			title: dto.title,
			description: dto.description,
			cultivarId: dto.cultivarId,
			createdAt: now,
			updatedAt: now,
		};
		this.store.plants.set(idKey(id), row);
		return this.hydratePlant(row);
	}

	async createMany(rows: PlantRepositoryCreateManyInputDTO): Promise<PlantRepositoryCreateManyOutputDTO> {
		const items: HydratedPlantEntity[] = [];
		for (const dto of rows) {
			if (!this.store.cultivars.has(idKey(dto.cultivarId))) {
				this.throwNotFoundError("Cultivar", dto.cultivarId);
			}
			const now = new Date();
			const id = plantId();
			const row: PlantEntity = {
				id,
				title: dto.title,
				description: dto.description,
				cultivarId: dto.cultivarId,
				createdAt: now,
				updatedAt: now,
			};
			this.store.plants.set(idKey(id), row);
			items.push(this.hydratePlant(row));
		}
		return { items };
	}

	async getById(dto: PlantRepositoryGetByIdInputDTO): Promise<PlantRepositoryGetByIdOutputDTO> {
		const row = this.store.plants.get(idKey(dto.id));
		if (!row) this.throwNotFoundError("Plant", dto.id);
		return this.hydratePlant(row);
	}

	async getListByIds(dto: PlantRepositoryGetListByIdsInputDTO): Promise<PlantRepositoryGetListByIdsOutputDTO> {
		const items: HydratedPlantEntity[] = [];
		for (const pid of dto.ids) {
			const p = this.store.plants.get(idKey(pid));
			if (p) items.push(this.hydratePlant(p));
		}
		return { items };
	}

	async getAll(): Promise<PlantRepositoryGetAllOutputDTO> {
		return { items: [...this.store.plants.values()].map((row) => this.hydratePlant(row)) };
	}

	async update(dto: PlantRepositoryUpdateInputDTO): Promise<PlantRepositoryUpdateOutputDTO> {
		const key = idKey(dto.id);
		const existing = this.store.plants.get(key);
		if (!existing) this.throwNotFoundError("Plant", dto.id);
		const nextCultivarId = dto.cultivarId !== undefined ? dto.cultivarId : existing.cultivarId;
		if (!this.store.cultivars.has(idKey(nextCultivarId))) {
			this.throwNotFoundError("Cultivar", nextCultivarId);
		}
		const updated: PlantEntity = {
			...existing,
			title: dto.title ?? existing.title,
			description: dto.description ?? existing.description,
			cultivarId: nextCultivarId,
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: new Date(),
		};
		this.store.plants.set(key, updated);
		return this.hydratePlant(updated);
	}

	async getByCultivarId(
		dto: PlantRepositoryGetByCultivarIdInputDTO,
	): Promise<PlantRepositoryGetByCultivarIdOutputDTO> {
		const ck = idKey(dto.cultivarId);
		const items = [...this.store.plants.values()]
			.filter((p) => idKey(p.cultivarId) === ck)
			.map((row) => this.hydratePlant(row));
		return { items };
	}

	// Spatial separation: placement and tree structure are owned by Spatial nodes.

	async delete(dto: PlantRepositoryDeleteInputDTO): Promise<PlantRepositoryDeleteOutputDTO> {
		const key = idKey(dto.id);
		if (!this.store.plants.has(key)) this.throwNotFoundError("Plant", dto.id);
		this.store.unlinkAllEventsFromPlant(dto.id);
		this.store.plants.delete(key);
		return dto.id;
	}

	async deleteMany(dto: PlantRepositoryDeleteManyInputDTO): Promise<PlantRepositoryDeleteManyOutputDTO> {
		const deletedIds: PlantEntityId[] = [];
		for (const id of dto.ids) {
			const key = idKey(id);
			if (!this.store.plants.has(key)) continue;
			this.store.unlinkAllEventsFromPlant(id);
			this.store.plants.delete(key);
			deletedIds.push(id);
		}
		return { deletedIds };
	}
}
