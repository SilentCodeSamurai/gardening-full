import type {
	LocationRepositoryCreateInputDTO,
	LocationRepositoryCreateManyInputDTO,
	LocationRepositoryCreateManyOutputDTO,
	LocationRepositoryCreateOutputDTO,
	LocationRepositoryDeleteManyOutputDTO,
	LocationRepositoryDeleteOutputDTO,
	LocationRepositoryFilterClause,
	LocationRepositoryGetManyOutputDTO,
	LocationRepositoryGetOneOutputDTO,
	LocationRepositoryPort,
	LocationRepositoryUpdateManyOutputDTO,
	LocationRepositoryUpdateOutputDTO,
	LocationRepositoryUpdatePatchDTO,
} from "@backend/core/application/ports/repositories/gardening/location.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { LocationEntity } from "@backend/core/domain/gardening/entities";
import {
	findFirstRowMatchingAnyClause,
	findRowsMatchingAnyClause,
} from "@backend/infrastructure/adapters/repositories/shared/in-memory-entity-filter";
import { InMemoryTransactionManagerAdapter } from "@backend/infrastructure/adapters/transaction/in-memory-transaction-manager.adapter";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, locationId } from "@backend/infrastructure/integrations/shared/database-ids";
import { inject, injectable } from "tsyringe";

@injectable()
export class LocationInMemoryRepository extends BaseRepositoryErrors implements LocationRepositoryPort {
	constructor(
		@inject(InMemoryTransactionManagerAdapter)
		private readonly transactionManager: InMemoryTransactionManagerAdapter,
	) {
		super();
	}

	private insertRow(dto: LocationRepositoryCreateInputDTO): LocationRepositoryCreateOutputDTO {
		const now = new Date();
		const id = locationId();
		const row: LocationEntity = {
			...dto,
			id,
			createdAt: now,
			updatedAt: now,
		};
		this.store.locations.set(idKey(id), row);
		return row;
	}

	private patchStored(existing: LocationEntity, dto: LocationRepositoryUpdatePatchDTO): LocationEntity {
		return {
			...existing,
			workspace: dto.workspace !== undefined ? dto.workspace : existing.workspace,
			name: dto.name !== undefined ? dto.name : existing.name,
			presentation: dto.presentation !== undefined ? dto.presentation : existing.presentation,
			updatedAt: new Date(),
		};
	}

	async createOne(dto: LocationRepositoryCreateInputDTO): Promise<LocationRepositoryCreateOutputDTO> {
		return this.insertRow(dto);
	}

	async createMany(input: LocationRepositoryCreateManyInputDTO): Promise<LocationRepositoryCreateManyOutputDTO> {
		let count = 0;
		for (const item of input.items) {
			this.insertRow(item);
			count += 1;
		}
		return { count };
	}

	async getOne(input: {
		filters: readonly LocationRepositoryFilterClause[];
	}): Promise<LocationRepositoryGetOneOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.locations.values(), input.filters);
		if (!row) this.throwNotFoundError("Location", input.filters);
		return row;
	}

	async getMany(input?: {
		filters?: readonly LocationRepositoryFilterClause[];
	}): Promise<LocationRepositoryGetManyOutputDTO> {
		if (input?.filters === undefined) {
			return { items: [...this.store.locations.values()] };
		}
		if (input.filters.length === 0) return { items: [] };
		const rows = findRowsMatchingAnyClause([...this.store.locations.values()], input.filters);
		return { items: rows };
	}

	async updateOne(input: {
		filters: readonly LocationRepositoryFilterClause[];
		dto: LocationRepositoryUpdatePatchDTO;
	}): Promise<LocationRepositoryUpdateOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.locations.values(), input.filters);
		if (!row) this.throwNotFoundError("Location", input.filters);
		const updated = this.patchStored(row, input.dto);
		this.store.locations.set(idKey(updated.id), updated);
		return updated;
	}

	async updateMany(input: {
		filters: readonly LocationRepositoryFilterClause[];
		dto: LocationRepositoryUpdatePatchDTO;
	}): Promise<LocationRepositoryUpdateManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.locations.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const updated = this.patchStored(row, input.dto);
			this.store.locations.set(idKey(updated.id), updated);
			count += 1;
		}
		return { count };
	}

	async deleteOne(input: {
		filters: readonly LocationRepositoryFilterClause[];
	}): Promise<LocationRepositoryDeleteOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.locations.values(), input.filters);
		if (!row) this.throwNotFoundError("Location", input.filters);
		this.store.unlinkAllEventsFromLocation(row.id);
		this.store.locations.delete(idKey(row.id));
		return row.id;
	}

	async deleteMany(input: {
		filters: readonly LocationRepositoryFilterClause[];
	}): Promise<LocationRepositoryDeleteManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.locations.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			this.store.unlinkAllEventsFromLocation(row.id);
			if (this.store.locations.delete(idKey(row.id))) count += 1;
		}
		return { count };
	}

	private get store(): InMemoryStore {
		return this.transactionManager.session;
	}
}
