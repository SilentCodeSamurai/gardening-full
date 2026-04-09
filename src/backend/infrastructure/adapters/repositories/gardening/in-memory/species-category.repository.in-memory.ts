import type {
	SpeciesCategoryRepositoryCreateInputDTO,
	SpeciesCategoryRepositoryCreateOutputDTO,
	SpeciesCategoryRepositoryDeleteInputDTO,
	SpeciesCategoryRepositoryDeleteOutputDTO,
	SpeciesCategoryRepositoryGetAllOutputDTO,
	SpeciesCategoryRepositoryGetByIdInputDTO,
	SpeciesCategoryRepositoryGetByIdOutputDTO,
	SpeciesCategoryRepositoryPort,
	SpeciesCategoryRepositoryUpdateInputDTO,
	SpeciesCategoryRepositoryUpdateOutputDTO,
} from "@backend/core/application/ports/repositories/gardening/species-category.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { SpeciesCategoryEntity } from "@backend/core/domain/gardening/entities";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, speciesCategoryId } from "@backend/infrastructure/integrations/shared/database-ids";

export class SpeciesCategoryInMemoryRepository extends BaseRepositoryErrors implements SpeciesCategoryRepositoryPort {
	constructor(private readonly store: InMemoryStore) {
		super();
	}

	async create(dto: SpeciesCategoryRepositoryCreateInputDTO): Promise<SpeciesCategoryRepositoryCreateOutputDTO> {
		const now = new Date();
		const id = speciesCategoryId();
		const row: SpeciesCategoryEntity = {
			id,
			title: dto.title,
			presentation: dto.presentation,
			createdAt: now,
			updatedAt: now,
		};
		this.store.speciesCategories.set(idKey(id), row);
		return row;
	}

	async getById(dto: SpeciesCategoryRepositoryGetByIdInputDTO): Promise<SpeciesCategoryRepositoryGetByIdOutputDTO> {
		const row = this.store.speciesCategories.get(idKey(dto.id));
		if (!row) this.throwNotFoundError("SpeciesCategory", dto.id);
		return row;
	}

	async getAll(): Promise<SpeciesCategoryRepositoryGetAllOutputDTO> {
		return { items: [...this.store.speciesCategories.values()] };
	}

	async update(dto: SpeciesCategoryRepositoryUpdateInputDTO): Promise<SpeciesCategoryRepositoryUpdateOutputDTO> {
		const key = idKey(dto.id);
		const existing = this.store.speciesCategories.get(key);
		if (!existing) this.throwNotFoundError("SpeciesCategory", dto.id);
		const updated: SpeciesCategoryEntity = {
			...existing,
			...dto,
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: new Date(),
		};
		this.store.speciesCategories.set(key, updated);
		return updated;
	}

	async delete(dto: SpeciesCategoryRepositoryDeleteInputDTO): Promise<SpeciesCategoryRepositoryDeleteOutputDTO> {
		const key = idKey(dto.id);
		const existing = this.store.speciesCategories.get(key);
		if (!existing) this.throwNotFoundError("SpeciesCategory", dto.id);
		for (const s of this.store.species.values()) {
			if (idKey(s.categoryId) === key) {
				this.throwConflictError({
					operation: "delete",
					reason: "species-reference-category",
					context: { categoryId: dto.id, speciesId: s.id },
					participants: [
						{ entity: "SpeciesCategory", role: "target", id: dto.id },
						{ entity: "Species", role: "blocking-reference", id: s.id },
					],
					message: "Cannot delete species category: species still reference it.",
				});
			}
		}
		this.store.speciesCategories.delete(key);
		return dto.id;
	}
}
