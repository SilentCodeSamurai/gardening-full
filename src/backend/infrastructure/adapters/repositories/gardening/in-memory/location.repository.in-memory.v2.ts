import type {
	LocationRepositoryPortV2,
	LocationRepositoryV2CreateInputDTO,
	LocationRepositoryV2CreateManyInputDTO,
	LocationRepositoryV2CreateManyOutputDTO,
	LocationRepositoryV2CreateOutputDTO,
	LocationRepositoryV2DeleteManyOutputDTO,
	LocationRepositoryV2DeleteOutputDTO,
	LocationRepositoryV2FilterClause,
	LocationRepositoryV2GetManyOutputDTO,
	LocationRepositoryV2GetOneOutputDTO,
	LocationRepositoryV2UpdateManyOutputDTO,
	LocationRepositoryV2UpdateOutputDTO,
	LocationRepositoryV2UpdatePatchDTO,
} from "@backend/core/application/ports/repositories/gardening/location.repository.port.v2";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { LocationEntity } from "@backend/core/domain/gardening/entities";
import {
	findFirstRowMatchingAnyClause,
	findRowsMatchingAnyClause,
} from "@backend/infrastructure/adapters/repositories/shared/in-memory-v2-entity-filter";
import type { InMemoryStoreV2 } from "@backend/infrastructure/integrations/in-memory-database/client.v2";
import { idKey, locationId } from "@backend/infrastructure/integrations/shared/database-ids";

export class LocationInMemoryRepositoryV2 extends BaseRepositoryErrors implements LocationRepositoryPortV2 {
	constructor(private readonly store: InMemoryStoreV2) {
		super();
	}

	private insertRow(dto: LocationRepositoryV2CreateInputDTO): LocationRepositoryV2CreateOutputDTO {
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

	private patchStored(existing: LocationEntity, dto: LocationRepositoryV2UpdatePatchDTO): LocationEntity {
		return {
			...existing,
			workspaceKey: dto.workspaceKey !== undefined ? dto.workspaceKey : existing.workspaceKey,
			name: dto.name !== undefined ? dto.name : existing.name,
			presentation: dto.presentation !== undefined ? dto.presentation : existing.presentation,
			updatedAt: new Date(),
		};
	}

	async createOne(dto: LocationRepositoryV2CreateInputDTO): Promise<LocationRepositoryV2CreateOutputDTO> {
		return this.insertRow(dto);
	}

	async createMany(input: LocationRepositoryV2CreateManyInputDTO): Promise<LocationRepositoryV2CreateManyOutputDTO> {
		let count = 0;
		for (const item of input.items) {
			this.insertRow(item);
			count += 1;
		}
		return { count };
	}

	async getOne(input: {
		filters: readonly LocationRepositoryV2FilterClause[];
	}): Promise<LocationRepositoryV2GetOneOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.locations.values(), input.filters);
		if (!row) this.throwNotFoundError("Location", input.filters);
		return row;
	}

	async getMany(input?: {
		filters?: readonly LocationRepositoryV2FilterClause[];
	}): Promise<LocationRepositoryV2GetManyOutputDTO> {
		if (input?.filters === undefined) {
			return { items: [...this.store.locations.values()] };
		}
		if (input.filters.length === 0) return { items: [] };
		const rows = findRowsMatchingAnyClause([...this.store.locations.values()], input.filters);
		return { items: rows };
	}

	async updateOne(input: {
		filters: readonly LocationRepositoryV2FilterClause[];
		dto: LocationRepositoryV2UpdatePatchDTO;
	}): Promise<LocationRepositoryV2UpdateOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.locations.values(), input.filters);
		if (!row) this.throwNotFoundError("Location", input.filters);
		const updated = this.patchStored(row, input.dto);
		this.store.locations.set(idKey(updated.id), updated);
		return updated;
	}

	async updateMany(input: {
		filters: readonly LocationRepositoryV2FilterClause[];
		dto: LocationRepositoryV2UpdatePatchDTO;
	}): Promise<LocationRepositoryV2UpdateManyOutputDTO> {
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
		filters: readonly LocationRepositoryV2FilterClause[];
	}): Promise<LocationRepositoryV2DeleteOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.locations.values(), input.filters);
		if (!row) this.throwNotFoundError("Location", input.filters);
		this.store.unlinkAllEventsFromLocation(row.id);
		this.store.locations.delete(idKey(row.id));
		return row.id;
	}

	async deleteMany(input: {
		filters: readonly LocationRepositoryV2FilterClause[];
	}): Promise<LocationRepositoryV2DeleteManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.locations.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			this.store.unlinkAllEventsFromLocation(row.id);
			if (this.store.locations.delete(idKey(row.id))) count += 1;
		}
		return { count };
	}
}
