import type {
	SpeciesCategoryRepositoryPort,
	SpeciesCategoryRepositoryCreateInputDTO,
	SpeciesCategoryRepositoryCreateManyInputDTO,
	SpeciesCategoryRepositoryCreateManyOutputDTO,
	SpeciesCategoryRepositoryCreateOutputDTO,
	SpeciesCategoryRepositoryDeleteManyOutputDTO,
	SpeciesCategoryRepositoryDeleteOutputDTO,
	SpeciesCategoryRepositoryFilterClause,
	SpeciesCategoryRepositoryGetManyOutputDTO,
	SpeciesCategoryRepositoryGetOneOutputDTO,
	SpeciesCategoryRepositoryUpdateManyOutputDTO,
	SpeciesCategoryRepositoryUpdateOutputDTO,
	SpeciesCategoryRepositoryUpdatePatchDTO,
} from "@backend/core/application/ports/repositories/gardening/species-category.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { SpeciesCategoryEntity } from "@backend/core/domain/gardening/entities";
import {
	findFirstRowMatchingAnyClause,
	findRowsMatchingAnyClause,
} from "@backend/infrastructure/adapters/repositories/shared/in-memory-entity-filter";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, speciesCategoryId } from "@backend/infrastructure/integrations/shared/database-ids";

export class SpeciesCategoryInMemoryRepository
	extends BaseRepositoryErrors
	implements SpeciesCategoryRepositoryPort
{
	constructor(private readonly store: InMemoryStore) {
		super();
	}

	private insertRow(dto: SpeciesCategoryRepositoryCreateInputDTO): SpeciesCategoryRepositoryCreateOutputDTO {
		const now = new Date();
		const id = speciesCategoryId();
		const row: SpeciesCategoryEntity = {
			...dto,
			id,
			createdAt: now,
			updatedAt: now,
		};
		this.store.speciesCategories.set(idKey(id), row);
		return row;
	}

	private patchStored(
		existing: SpeciesCategoryEntity,
		dto: SpeciesCategoryRepositoryUpdatePatchDTO,
	): SpeciesCategoryEntity {
		return {
			...existing,
			workspaceKey: dto.workspaceKey !== undefined ? dto.workspaceKey : existing.workspaceKey,
			title: dto.title !== undefined ? dto.title : existing.title,
			presentation: dto.presentation !== undefined ? dto.presentation : existing.presentation,
			updatedAt: new Date(),
		};
	}

	async createOne(
		dto: SpeciesCategoryRepositoryCreateInputDTO,
	): Promise<SpeciesCategoryRepositoryCreateOutputDTO> {
		return this.insertRow(dto);
	}

	async createMany(
		input: SpeciesCategoryRepositoryCreateManyInputDTO,
	): Promise<SpeciesCategoryRepositoryCreateManyOutputDTO> {
		let count = 0;
		for (const item of input.items) {
			this.insertRow(item);
			count += 1;
		}
		return { count };
	}

	async getOne(input: {
		filters: readonly SpeciesCategoryRepositoryFilterClause[];
	}): Promise<SpeciesCategoryRepositoryGetOneOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.speciesCategories.values(), input.filters);
		if (!row) this.throwNotFoundError("SpeciesCategory", input.filters);
		return row;
	}

	async getMany(input?: {
		filters?: readonly SpeciesCategoryRepositoryFilterClause[];
	}): Promise<SpeciesCategoryRepositoryGetManyOutputDTO> {
		if (input?.filters === undefined) {
			return { items: [...this.store.speciesCategories.values()] };
		}
		if (input.filters.length === 0) return { items: [] };
		const rows = findRowsMatchingAnyClause([...this.store.speciesCategories.values()], input.filters);
		return { items: rows };
	}

	async updateOne(input: {
		filters: readonly SpeciesCategoryRepositoryFilterClause[];
		dto: SpeciesCategoryRepositoryUpdatePatchDTO;
	}): Promise<SpeciesCategoryRepositoryUpdateOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.speciesCategories.values(), input.filters);
		if (!row) this.throwNotFoundError("SpeciesCategory", input.filters);
		const updated = this.patchStored(row, input.dto);
		this.store.speciesCategories.set(idKey(updated.id), updated);
		return updated;
	}

	async updateMany(input: {
		filters: readonly SpeciesCategoryRepositoryFilterClause[];
		dto: SpeciesCategoryRepositoryUpdatePatchDTO;
	}): Promise<SpeciesCategoryRepositoryUpdateManyOutputDTO> {
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
		filters: readonly SpeciesCategoryRepositoryFilterClause[];
	}): Promise<SpeciesCategoryRepositoryDeleteOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.speciesCategories.values(), input.filters);
		if (!row) this.throwNotFoundError("SpeciesCategory", input.filters);
		const key = idKey(row.id);
		for (const s of this.store.species.values()) {
			if (idKey(s.categoryId) === key && String(s.workspaceKey) === String(row.workspaceKey)) {
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
		filters: readonly SpeciesCategoryRepositoryFilterClause[];
	}): Promise<SpeciesCategoryRepositoryDeleteManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.speciesCategories.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const key = idKey(row.id);
			const blocked = [...this.store.species.values()].some(
				(s) => idKey(s.categoryId) === key && String(s.workspaceKey) === String(row.workspaceKey),
			);
			if (blocked) continue;
			if (this.store.speciesCategories.delete(key)) count += 1;
		}
		return { count };
	}
}
