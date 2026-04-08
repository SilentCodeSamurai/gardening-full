import type {
	SpeciesRepositoryPort,
	SpeciesRepositoryCreateInputDTO,
	SpeciesRepositoryCreateOutputDTO,
	SpeciesRepositoryDeleteInputDTO,
	SpeciesRepositoryDeleteOutputDTO,
	SpeciesRepositoryGetAllOutputDTO,
	SpeciesRepositoryGetByIdInputDTO,
	SpeciesRepositoryGetByIdOutputDTO,
	SpeciesRepositoryUpdateInputDTO,
	SpeciesRepositoryUpdateOutputDTO,
} from "@backend/core/application/ports/repositories/gardening/species.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { SpeciesEntity } from "@backend/core/domain/gardening/entities";
import type { InMemoryGardeningStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, speciesId } from "@backend/infrastructure/integrations/shared/database-ids";

export class SpeciesInMemoryRepository extends BaseRepositoryErrors implements SpeciesRepositoryPort {
	constructor(private readonly store: InMemoryGardeningStore) {
		super();
	}

	async create(dto: SpeciesRepositoryCreateInputDTO): Promise<SpeciesRepositoryCreateOutputDTO> {
		if (!this.store.speciesCategories.has(idKey(dto.categoryId))) {
			this.throwNotFoundError("SpeciesCategory", dto.categoryId);
		}
		const now = new Date();
		const id = speciesId();
		const row: SpeciesEntity = {
			id,
			categoryId: dto.categoryId,
			characteristics: dto.characteristics,
			isDefault: dto.isDefault ?? false,
			presentation: dto.presentation,
			createdAt: now,
			updatedAt: now,
		};
		this.store.species.set(idKey(id), row);
		return row;
	}

	async getById(dto: SpeciesRepositoryGetByIdInputDTO): Promise<SpeciesRepositoryGetByIdOutputDTO> {
		const row = this.store.species.get(idKey(dto.id));
		if (!row) this.throwNotFoundError("Species", dto.id);
		return row;
	}

	async getAll(): Promise<SpeciesRepositoryGetAllOutputDTO> {
		return { items: [...this.store.species.values()] };
	}

	async update(dto: SpeciesRepositoryUpdateInputDTO): Promise<SpeciesRepositoryUpdateOutputDTO> {
		const key = idKey(dto.id);
		const existing = this.store.species.get(key);
		if (!existing) this.throwNotFoundError("Species", dto.id);
		if (dto.categoryId !== undefined && !this.store.speciesCategories.has(idKey(dto.categoryId))) {
			this.throwNotFoundError("SpeciesCategory", dto.categoryId);
		}
		const updated: SpeciesEntity = {
			...existing,
			...dto,
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: new Date(),
		};
		this.store.species.set(key, updated);
		return updated;
	}

	async delete(dto: SpeciesRepositoryDeleteInputDTO): Promise<SpeciesRepositoryDeleteOutputDTO> {
		const key = idKey(dto.id);
		if (!this.store.species.has(key)) this.throwNotFoundError("Species", dto.id);
		for (const c of this.store.cultivars.values()) {
			if (idKey(c.speciesId) === key) {
				this.throwConflictError({
					operation: "delete",
					reason: "cultivars-reference-species",
					context: { speciesId: dto.id, cultivarId: c.id },
					participants: [
						{ entity: "Species", role: "target", id: dto.id },
						{ entity: "Cultivar", role: "blocking-reference", id: c.id },
					],
					message: "Cannot delete species: cultivars still reference it.",
				});
			}
		}
		this.store.species.delete(key);
		return dto.id;
	}
}
