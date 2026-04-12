import type {
	SpeciesCategoryRepositoryPortV2,
	SpeciesCategoryRepositoryV2CreateInputDTO,
	SpeciesCategoryRepositoryV2CreateManyInputDTO,
	SpeciesCategoryRepositoryV2CreateManyOutputDTO,
	SpeciesCategoryRepositoryV2CreateOutputDTO,
	SpeciesCategoryRepositoryV2DeleteManyOutputDTO,
	SpeciesCategoryRepositoryV2DeleteOutputDTO,
	SpeciesCategoryRepositoryV2FilterClause,
	SpeciesCategoryRepositoryV2GetManyOutputDTO,
	SpeciesCategoryRepositoryV2GetOneOutputDTO,
	SpeciesCategoryRepositoryV2UpdateManyOutputDTO,
	SpeciesCategoryRepositoryV2UpdateOutputDTO,
	SpeciesCategoryRepositoryV2UpdatePatchDTO,
} from "@backend/core/application/ports/repositories/gardening/species-category.repository.port.v2";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { SpeciesCategoryEntity } from "@backend/core/domain/gardening/entities.v2";
import {
	findFirstRowMatchingAnyClause,
	findRowsMatchingAnyClause,
} from "@backend/infrastructure/adapters/repositories/shared/in-memory-v2-entity-filter";
import type { InMemoryStoreV2 } from "@backend/infrastructure/integrations/in-memory-database/client.v2";
import { idKey, speciesCategoryId } from "@backend/infrastructure/integrations/shared/database-ids";

export class SpeciesCategoryInMemoryRepositoryV2
	extends BaseRepositoryErrors
	implements SpeciesCategoryRepositoryPortV2
{
	constructor(private readonly store: InMemoryStoreV2) {
		super();
	}

	private insertRow(dto: SpeciesCategoryRepositoryV2CreateInputDTO): SpeciesCategoryRepositoryV2CreateOutputDTO {
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

	private patchStored(
		existing: SpeciesCategoryEntity,
		dto: SpeciesCategoryRepositoryV2UpdatePatchDTO,
	): SpeciesCategoryEntity {
		return {
			...existing,
			title: dto.title !== undefined ? dto.title : existing.title,
			presentation: dto.presentation !== undefined ? dto.presentation : existing.presentation,
			updatedAt: new Date(),
		};
	}

	async createOne(
		dto: SpeciesCategoryRepositoryV2CreateInputDTO,
	): Promise<SpeciesCategoryRepositoryV2CreateOutputDTO> {
		return this.insertRow(dto);
	}

	async createMany(
		input: SpeciesCategoryRepositoryV2CreateManyInputDTO,
	): Promise<SpeciesCategoryRepositoryV2CreateManyOutputDTO> {
		let count = 0;
		for (const item of input.items) {
			this.insertRow(item);
			count += 1;
		}
		return { count };
	}

	async getOne(input: {
		filters: readonly SpeciesCategoryRepositoryV2FilterClause[];
	}): Promise<SpeciesCategoryRepositoryV2GetOneOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.speciesCategories.values(), input.filters);
		if (!row) this.throwNotFoundError("SpeciesCategory", input.filters);
		return row;
	}

	async getMany(input?: {
		filters?: readonly SpeciesCategoryRepositoryV2FilterClause[];
	}): Promise<SpeciesCategoryRepositoryV2GetManyOutputDTO> {
		if (input?.filters === undefined) {
			return { items: [...this.store.speciesCategories.values()] };
		}
		if (input.filters.length === 0) return { items: [] };
		const rows = findRowsMatchingAnyClause([...this.store.speciesCategories.values()], input.filters);
		return { items: rows };
	}

	async updateOne(input: {
		filters: readonly SpeciesCategoryRepositoryV2FilterClause[];
		dto: SpeciesCategoryRepositoryV2UpdatePatchDTO;
	}): Promise<SpeciesCategoryRepositoryV2UpdateOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.speciesCategories.values(), input.filters);
		if (!row) this.throwNotFoundError("SpeciesCategory", input.filters);
		const updated = this.patchStored(row, input.dto);
		this.store.speciesCategories.set(idKey(updated.id), updated);
		return updated;
	}

	async updateMany(input: {
		filters: readonly SpeciesCategoryRepositoryV2FilterClause[];
		dto: SpeciesCategoryRepositoryV2UpdatePatchDTO;
	}): Promise<SpeciesCategoryRepositoryV2UpdateManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.speciesCategories.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const updated = this.patchStored(row, input.dto);
			this.store.speciesCategories.set(idKey(updated.id), updated);
			count += 1;
		}
		return { count };
	}

	async deleteOne(input: {
		filters: readonly SpeciesCategoryRepositoryV2FilterClause[];
	}): Promise<SpeciesCategoryRepositoryV2DeleteOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.speciesCategories.values(), input.filters);
		if (!row) this.throwNotFoundError("SpeciesCategory", input.filters);
		const key = idKey(row.id);
		for (const s of this.store.species.values()) {
			if (idKey(s.categoryId) === key) {
				this.throwConflictError({
					operation: "delete",
					reason: "species-reference-category",
					context: { categoryId: row.id, speciesId: s.id },
					participants: [
						{ entity: "SpeciesCategory", role: "target", id: row.id as unknown as string },
						{ entity: "Species", role: "blocking-reference", id: s.id as unknown as string },
					],
					message: "Cannot delete species category: species still reference it.",
				});
			}
		}
		this.store.speciesCategories.delete(key);
		return row.id;
	}

	async deleteMany(input: {
		filters: readonly SpeciesCategoryRepositoryV2FilterClause[];
	}): Promise<SpeciesCategoryRepositoryV2DeleteManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.speciesCategories.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const key = idKey(row.id);
			const blocked = [...this.store.species.values()].some((s) => idKey(s.categoryId) === key);
			if (blocked) continue;
			if (this.store.speciesCategories.delete(key)) count += 1;
		}
		return { count };
	}
}
