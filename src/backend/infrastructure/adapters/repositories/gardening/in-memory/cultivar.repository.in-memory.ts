import type {
	CultivarRepositoryCreateInputDTO,
	CultivarRepositoryCreateManyInputDTO,
	CultivarRepositoryCreateManyOutputDTO,
	CultivarRepositoryCreateOutputDTO,
	CultivarRepositoryDeleteManyOutputDTO,
	CultivarRepositoryDeleteOutputDTO,
	CultivarRepositoryFilterClause,
	CultivarRepositoryGetFullOutputDTO,
	CultivarRepositoryGetManyOutputDTO,
	CultivarRepositoryGetOneOutputDTO,
	CultivarRepositoryPort,
	CultivarRepositoryUpdateManyOutputDTO,
	CultivarRepositoryUpdateOutputDTO,
	CultivarRepositoryUpdatePatchDTO,
} from "@backend/core/application/ports/repositories/gardening/cultivar.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { CultivarEntity, HydratedCultivarEntity, SpeciesEntity } from "@backend/core/domain/gardening/entities";
import {
	findFirstRowMatchingAnyClause,
	findRowsMatchingAnyClause,
} from "@backend/infrastructure/adapters/repositories/shared/in-memory-entity-filter";
import { InMemoryTransactionManagerAdapter } from "@backend/infrastructure/adapters/transaction/in-memory-transaction-manager.adapter";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { cultivarId, idKey } from "@backend/infrastructure/integrations/shared/database-ids";
import { inject, injectable } from "tsyringe";

@injectable()
export class CultivarInMemoryRepository extends BaseRepositoryErrors implements CultivarRepositoryPort {
	constructor(
		@inject(InMemoryTransactionManagerAdapter)
		private readonly transactionManager: InMemoryTransactionManagerAdapter,
	) {
		super();
	}

	private hydrate(row: CultivarEntity): HydratedCultivarEntity {
		const speciesRow = this.store.species.get(idKey(row.speciesId));
		if (!speciesRow) this.throwNotFoundError("Species", row.speciesId);
		const species: SpeciesEntity = speciesRow;
		return {
			...row,
			species,
		};
	}

	private insertRow(dto: CultivarRepositoryCreateInputDTO): CultivarRepositoryCreateOutputDTO {
		this.requireSpeciesRow(dto.speciesId);
		const now = new Date();
		const id = cultivarId();
		const row: CultivarEntity = {
			...dto,
			id,
			createdAt: now,
			updatedAt: now,
		};
		this.store.cultivars.set(idKey(id), row);
		return row;
	}

	private requireSpeciesRow(speciesId: CultivarEntity["speciesId"]): void {
		const species = this.store.species.get(idKey(speciesId));
		if (!species) {
			this.throwNotFoundError("Species", [{ id: speciesId }]);
		}
	}

	private patchStored(existing: CultivarEntity, dto: CultivarRepositoryUpdatePatchDTO): CultivarEntity {
		const nextWorkspace = dto.workspace !== undefined ? dto.workspace : existing.workspace;
		const nextSpeciesId = dto.speciesId !== undefined ? dto.speciesId : existing.speciesId;
		return {
			...existing,
			workspace: nextWorkspace,
			speciesId: nextSpeciesId,
			characteristics: dto.characteristics !== undefined ? dto.characteristics : existing.characteristics,
			presentation: dto.presentation !== undefined ? dto.presentation : existing.presentation,
			updatedAt: new Date(),
		};
	}

	async createOne(dto: CultivarRepositoryCreateInputDTO): Promise<CultivarRepositoryCreateOutputDTO> {
		return this.insertRow(dto);
	}

	async createMany(input: CultivarRepositoryCreateManyInputDTO): Promise<CultivarRepositoryCreateManyOutputDTO> {
		let count = 0;
		for (const item of input.items) {
			this.insertRow(item);
			count += 1;
		}
		return { count };
	}

	async getOne(input: {
		filters: readonly CultivarRepositoryFilterClause[];
	}): Promise<CultivarRepositoryGetOneOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.cultivars.values(), input.filters);
		if (!row) this.throwNotFoundError("Cultivar", input.filters);
		return row;
	}

	async getFullOne(input: {
		filters: readonly CultivarRepositoryFilterClause[];
	}): Promise<CultivarRepositoryGetFullOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.cultivars.values(), input.filters);
		if (!row) this.throwNotFoundError("Cultivar", input.filters);
		return this.hydrate(row);
	}

	async getMany(input?: {
		filters?: readonly CultivarRepositoryFilterClause[];
	}): Promise<CultivarRepositoryGetManyOutputDTO> {
		if (input?.filters === undefined) {
			return { items: [...this.store.cultivars.values()] };
		}
		if (input.filters.length === 0) return { items: [] };
		const rows = findRowsMatchingAnyClause([...this.store.cultivars.values()], input.filters);
		return { items: rows };
	}

	async updateOne(input: {
		filters: readonly CultivarRepositoryFilterClause[];
		dto: CultivarRepositoryUpdatePatchDTO;
	}): Promise<CultivarRepositoryUpdateOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.cultivars.values(), input.filters);
		if (!row) this.throwNotFoundError("Cultivar", input.filters);
		const updated = this.patchStored(row, input.dto);
		this.requireSpeciesRow(updated.speciesId);
		this.store.cultivars.set(idKey(updated.id), updated);
		return updated;
	}

	async updateMany(input: {
		filters: readonly CultivarRepositoryFilterClause[];
		dto: CultivarRepositoryUpdatePatchDTO;
	}): Promise<CultivarRepositoryUpdateManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.cultivars.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const updated = this.patchStored(row, input.dto);
			this.requireSpeciesRow(updated.speciesId);
			this.store.cultivars.set(idKey(updated.id), updated);
			count += 1;
		}
		return { count };
	}

	async deleteOne(input: {
		filters: readonly CultivarRepositoryFilterClause[];
	}): Promise<CultivarRepositoryDeleteOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.cultivars.values(), input.filters);
		if (!row) this.throwNotFoundError("Cultivar", input.filters);
		const key = idKey(row.id);
		for (const plant of this.store.plants.values()) {
			if (idKey(plant.cultivarId) === key) {
				this.throwConflictError({
					operation: "delete",
					reason: "plant-reference-cultivar",
					context: { cultivarId: row.id, plantId: plant.id },
					participants: [
						{ entity: "Cultivar", role: "target", id: row.id as unknown as string },
						{ entity: "Plant", role: "blocking-reference", id: plant.id as unknown as string },
					],
					message: "Cannot delete cultivar: plants still reference it.",
				});
			}
		}
		this.store.cultivars.delete(key);
		return row.id;
	}

	async deleteMany(input: {
		filters: readonly CultivarRepositoryFilterClause[];
	}): Promise<CultivarRepositoryDeleteManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.cultivars.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const key = idKey(row.id);
			const blocked = [...this.store.plants.values()].some((p) => idKey(p.cultivarId) === key);
			if (blocked) continue;
			if (this.store.cultivars.delete(key)) count += 1;
		}
		return { count };
	}

	private get store(): InMemoryStore {
		return this.transactionManager.session;
	}
}
