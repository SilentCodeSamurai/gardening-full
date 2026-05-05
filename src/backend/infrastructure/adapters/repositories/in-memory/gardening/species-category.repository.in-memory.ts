import type {
	SpeciesCategoryRepositoryCreateInputDTO,
	SpeciesCategoryRepositoryCreateManyInputDTO,
	SpeciesCategoryRepositoryCreateManyOutputDTO,
	SpeciesCategoryRepositoryCreateOutputDTO,
	SpeciesCategoryRepositoryDeleteManyOutputDTO,
	SpeciesCategoryRepositoryDeleteOutputDTO,
	SpeciesCategoryRepositoryFilterClause,
	SpeciesCategoryRepositoryGetManyOutputDTO,
	SpeciesCategoryRepositoryGetOneOutputDTO,
	SpeciesCategoryRepositoryPort,
	SpeciesCategoryRepositoryUpdateManyOutputDTO,
	SpeciesCategoryRepositoryUpdateOutputDTO,
	SpeciesCategoryRepositoryUpdatePatchDTO,
} from "@backend/core/application/ports/repositories/gardening/species-category.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { SpeciesCategoryEntity } from "@backend/core/domain/gardening/entities";
import { InMemoryTransactionManagerAdapter } from "@backend/infrastructure/adapters/transaction/in-memory-transaction-manager.adapter";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, speciesCategoryId } from "@backend/infrastructure/integrations/shared/database-ids";
import { inject, injectable } from "tsyringe";
import {
	findFirstRowMatchingAnyClause,
	findRowsMatchingAnyClause,
} from "#/backend/infrastructure/adapters/repositories/in-memory/shared/in-memory-entity-filter";

@injectable()
export class SpeciesCategoryInMemoryRepository extends BaseRepositoryErrors implements SpeciesCategoryRepositoryPort {
	constructor(
		@inject(InMemoryTransactionManagerAdapter)
		private readonly transactionManager: InMemoryTransactionManagerAdapter,
	) {
		super();
	}

	private insertRow(dto: SpeciesCategoryRepositoryCreateInputDTO): SpeciesCategoryRepositoryCreateOutputDTO {
		const now = new Date();
		const id = dto.id ?? speciesCategoryId();
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
			workspace: dto.workspace !== undefined ? dto.workspace : existing.workspace,
			title: dto.title !== undefined ? dto.title : existing.title,
			presentation: dto.presentation !== undefined ? dto.presentation : existing.presentation,
			updatedAt: new Date(),
		};
	}

	async createOne(dto: SpeciesCategoryRepositoryCreateInputDTO): Promise<SpeciesCategoryRepositoryCreateOutputDTO> {
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
			if (s.categoryId !== null && idKey(s.categoryId) === key) {
				this.store.species.set(idKey(s.id), {
					...s,
					categoryId: null,
					updatedAt: new Date(),
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
			for (const s of this.store.species.values()) {
				if (s.categoryId !== null && idKey(s.categoryId) === key) {
					this.store.species.set(idKey(s.id), {
						...s,
						categoryId: null,
						updatedAt: new Date(),
					});
				}
			}
			if (this.store.speciesCategories.delete(key)) count += 1;
		}
		return { count };
	}

	private get store(): InMemoryStore {
		return this.transactionManager.session;
	}
}
