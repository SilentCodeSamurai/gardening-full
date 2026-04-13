import type {
	SpeciesRepositoryCreateInputDTO,
	SpeciesRepositoryCreateManyInputDTO,
	SpeciesRepositoryCreateManyOutputDTO,
	SpeciesRepositoryCreateOutputDTO,
	SpeciesRepositoryDeleteManyOutputDTO,
	SpeciesRepositoryDeleteOutputDTO,
	SpeciesRepositoryFilterClause,
	SpeciesRepositoryGetManyOutputDTO,
	SpeciesRepositoryGetOneOutputDTO,
	SpeciesRepositoryPort,
	SpeciesRepositoryUpdateManyOutputDTO,
	SpeciesRepositoryUpdateOutputDTO,
	SpeciesRepositoryUpdatePatchDTO,
} from "@backend/core/application/ports/repositories/gardening/species.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { SpeciesEntity } from "@backend/core/domain/gardening/entities";
import {
	findFirstRowMatchingAnyClause,
	findRowsMatchingAnyClause,
} from "@backend/infrastructure/adapters/repositories/shared/in-memory-entity-filter";
import { InMemoryTransactionManagerAdapter } from "@backend/infrastructure/adapters/transaction/in-memory-transaction-manager.adapter";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, speciesId } from "@backend/infrastructure/integrations/shared/database-ids";
import { inject, injectable } from "tsyringe";

@injectable()
export class SpeciesInMemoryRepository extends BaseRepositoryErrors implements SpeciesRepositoryPort {
	constructor(
		@inject(InMemoryTransactionManagerAdapter)
		private readonly transactionManager: InMemoryTransactionManagerAdapter,
	) {
		super();
	}

	private insertRow(dto: SpeciesRepositoryCreateInputDTO): SpeciesRepositoryCreateOutputDTO {
		if (dto.categoryId !== null) this.requireCategoryRow(dto.categoryId);
		const now = new Date();
		const id = speciesId();
		const row: SpeciesEntity = {
			...dto,
			id,
			createdAt: now,
			updatedAt: now,
		};
		this.store.species.set(idKey(id), row);
		return row;
	}

	private requireCategoryRow(categoryId: NonNullable<SpeciesEntity["categoryId"]>): void {
		const category = this.store.speciesCategories.get(idKey(categoryId));
		if (!category) {
			this.throwNotFoundError("SpeciesCategory", [{ id: categoryId }]);
		}
	}

	private patchStored(existing: SpeciesEntity, dto: SpeciesRepositoryUpdatePatchDTO): SpeciesEntity {
		const nextWorkspace = dto.workspace !== undefined ? dto.workspace : existing.workspace;
		const nextCategoryId = dto.categoryId !== undefined ? dto.categoryId : existing.categoryId;
		return {
			...existing,
			workspace: nextWorkspace,
			categoryId: nextCategoryId,
			characteristics: dto.characteristics !== undefined ? dto.characteristics : existing.characteristics,
			presentation: dto.presentation !== undefined ? dto.presentation : existing.presentation,
			updatedAt: new Date(),
		};
	}

	async createOne(dto: SpeciesRepositoryCreateInputDTO): Promise<SpeciesRepositoryCreateOutputDTO> {
		return this.insertRow(dto);
	}

	async createMany(input: SpeciesRepositoryCreateManyInputDTO): Promise<SpeciesRepositoryCreateManyOutputDTO> {
		let count = 0;
		for (const item of input.items) {
			this.insertRow(item);
			count += 1;
		}
		return { count };
	}

	async getOne(input: {
		filters: readonly SpeciesRepositoryFilterClause[];
	}): Promise<SpeciesRepositoryGetOneOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.species.values(), input.filters);
		if (!row) this.throwNotFoundError("Species", input.filters);
		return row;
	}

	async getMany(input?: {
		filters?: readonly SpeciesRepositoryFilterClause[];
	}): Promise<SpeciesRepositoryGetManyOutputDTO> {
		if (input?.filters === undefined) {
			return { items: [...this.store.species.values()] };
		}
		if (input.filters.length === 0) return { items: [] };
		const rows = findRowsMatchingAnyClause([...this.store.species.values()], input.filters);
		return { items: rows };
	}

	async updateOne(input: {
		filters: readonly SpeciesRepositoryFilterClause[];
		dto: SpeciesRepositoryUpdatePatchDTO;
	}): Promise<SpeciesRepositoryUpdateOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.species.values(), input.filters);
		if (!row) this.throwNotFoundError("Species", input.filters);
		const updated = this.patchStored(row, input.dto);
		if (updated.categoryId !== null) this.requireCategoryRow(updated.categoryId);
		this.store.species.set(idKey(updated.id), updated);
		return updated;
	}

	async updateMany(input: {
		filters: readonly SpeciesRepositoryFilterClause[];
		dto: SpeciesRepositoryUpdatePatchDTO;
	}): Promise<SpeciesRepositoryUpdateManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.species.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const updated = this.patchStored(row, input.dto);
			if (updated.categoryId !== null) this.requireCategoryRow(updated.categoryId);
			this.store.species.set(idKey(updated.id), updated);
			count += 1;
		}
		return { count };
	}

	async deleteOne(input: {
		filters: readonly SpeciesRepositoryFilterClause[];
	}): Promise<SpeciesRepositoryDeleteOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.species.values(), input.filters);
		if (!row) this.throwNotFoundError("Species", input.filters);
		const key = idKey(row.id);
		for (const c of this.store.cultivars.values()) {
			if (c.speciesId !== null && idKey(c.speciesId) === key) {
				this.store.cultivars.set(idKey(c.id), {
					...c,
					speciesId: null,
					updatedAt: new Date(),
				});
			}
		}
		this.store.species.delete(key);
		return row.id;
	}

	async deleteMany(input: {
		filters: readonly SpeciesRepositoryFilterClause[];
	}): Promise<SpeciesRepositoryDeleteManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.species.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const key = idKey(row.id);
			for (const c of this.store.cultivars.values()) {
				if (c.speciesId !== null && idKey(c.speciesId) === key) {
					this.store.cultivars.set(idKey(c.id), {
						...c,
						speciesId: null,
						updatedAt: new Date(),
					});
				}
			}
			if (this.store.species.delete(key)) count += 1;
		}
		return { count };
	}

	private get store(): InMemoryStore {
		return this.transactionManager.session;
	}
}
