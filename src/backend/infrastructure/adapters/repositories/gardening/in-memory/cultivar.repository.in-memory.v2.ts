import type {
	CultivarRepositoryPortV2,
	CultivarRepositoryV2CreateInputDTO,
	CultivarRepositoryV2CreateManyInputDTO,
	CultivarRepositoryV2CreateManyOutputDTO,
	CultivarRepositoryV2CreateOutputDTO,
	CultivarRepositoryV2DeleteManyOutputDTO,
	CultivarRepositoryV2DeleteOutputDTO,
	CultivarRepositoryV2FilterClause,
	CultivarRepositoryV2GetFullOutputDTO,
	CultivarRepositoryV2GetManyOutputDTO,
	CultivarRepositoryV2GetOneOutputDTO,
	CultivarRepositoryV2UpdateManyOutputDTO,
	CultivarRepositoryV2UpdateOutputDTO,
	CultivarRepositoryV2UpdatePatchDTO,
} from "@backend/core/application/ports/repositories/gardening/cultivar.repository.port.v2";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { CultivarEntity, HydratedCultivarEntity, SpeciesEntity } from "@backend/core/domain/gardening/entities";
import { workspaceKeysEqual } from "@backend/infrastructure/adapters/repositories/shared/workspace-key";
import {
	findFirstRowMatchingAnyClause,
	findRowsMatchingAnyClause,
} from "@backend/infrastructure/adapters/repositories/shared/in-memory-v2-entity-filter";
import type { InMemoryStoreV2 } from "@backend/infrastructure/integrations/in-memory-database/client.v2";
import { cultivarId, idKey } from "@backend/infrastructure/integrations/shared/database-ids";

export class CultivarInMemoryRepositoryV2 extends BaseRepositoryErrors implements CultivarRepositoryPortV2 {
	constructor(private readonly store: InMemoryStoreV2) {
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

	private insertRow(dto: CultivarRepositoryV2CreateInputDTO): CultivarRepositoryV2CreateOutputDTO {
		const speciesRow = this.store.species.get(idKey(dto.speciesId));
		if (!speciesRow) {
			this.throwNotFoundError("Species", dto.speciesId);
		}
		if (!workspaceKeysEqual(speciesRow.workspaceKey, dto.workspaceKey)) {
			this.throwValidationError({
				operation: "create",
				validationCode: "species-workspace-mismatch",
				context: { speciesId: dto.speciesId, workspaceKey: dto.workspaceKey },
			});
		}
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

	private patchStored(existing: CultivarEntity, dto: CultivarRepositoryV2UpdatePatchDTO): CultivarEntity {
		const nextWorkspaceKey = dto.workspaceKey !== undefined ? dto.workspaceKey : existing.workspaceKey;
		const nextSpeciesId = dto.speciesId !== undefined ? dto.speciesId : existing.speciesId;
		return {
			...existing,
			workspaceKey: nextWorkspaceKey,
			speciesId: nextSpeciesId,
			characteristics: dto.characteristics !== undefined ? dto.characteristics : existing.characteristics,
			presentation: dto.presentation !== undefined ? dto.presentation : existing.presentation,
			updatedAt: new Date(),
		};
	}

	private assertSpeciesMatchesWorkspace(
		speciesId: CultivarEntity["speciesId"],
		workspaceKey: CultivarEntity["workspaceKey"],
	): void {
		const speciesRow = this.store.species.get(idKey(speciesId));
		if (!speciesRow) this.throwNotFoundError("Species", speciesId);
		if (!workspaceKeysEqual(speciesRow.workspaceKey, workspaceKey)) {
			this.throwValidationError({
				operation: "update",
				validationCode: "species-workspace-mismatch",
				context: { speciesId, workspaceKey },
			});
		}
	}

	async createOne(dto: CultivarRepositoryV2CreateInputDTO): Promise<CultivarRepositoryV2CreateOutputDTO> {
		return this.insertRow(dto);
	}

	async createMany(input: CultivarRepositoryV2CreateManyInputDTO): Promise<CultivarRepositoryV2CreateManyOutputDTO> {
		let count = 0;
		for (const item of input.items) {
			this.insertRow(item);
			count += 1;
		}
		return { count };
	}

	async getOne(input: {
		filters: readonly CultivarRepositoryV2FilterClause[];
	}): Promise<CultivarRepositoryV2GetOneOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.cultivars.values(), input.filters);
		if (!row) this.throwNotFoundError("Cultivar", input.filters);
		return row;
	}

	async getFullOne(input: {
		filters: readonly CultivarRepositoryV2FilterClause[];
	}): Promise<CultivarRepositoryV2GetFullOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.cultivars.values(), input.filters);
		if (!row) this.throwNotFoundError("Cultivar", input.filters);
		return this.hydrate(row);
	}

	async getMany(input?: {
		filters?: readonly CultivarRepositoryV2FilterClause[];
	}): Promise<CultivarRepositoryV2GetManyOutputDTO> {
		if (input?.filters === undefined) {
			return { items: [...this.store.cultivars.values()] };
		}
		if (input.filters.length === 0) return { items: [] };
		const rows = findRowsMatchingAnyClause([...this.store.cultivars.values()], input.filters);
		return { items: rows };
	}

	async updateOne(input: {
		filters: readonly CultivarRepositoryV2FilterClause[];
		dto: CultivarRepositoryV2UpdatePatchDTO;
	}): Promise<CultivarRepositoryV2UpdateOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.cultivars.values(), input.filters);
		if (!row) this.throwNotFoundError("Cultivar", input.filters);
		const updated = this.patchStored(row, input.dto);
		this.assertSpeciesMatchesWorkspace(updated.speciesId, updated.workspaceKey);
		this.store.cultivars.set(idKey(updated.id), updated);
		return updated;
	}

	async updateMany(input: {
		filters: readonly CultivarRepositoryV2FilterClause[];
		dto: CultivarRepositoryV2UpdatePatchDTO;
	}): Promise<CultivarRepositoryV2UpdateManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.cultivars.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const updated = this.patchStored(row, input.dto);
			this.assertSpeciesMatchesWorkspace(updated.speciesId, updated.workspaceKey);
			this.store.cultivars.set(idKey(updated.id), updated);
			count += 1;
		}
		return { count };
	}

	async deleteOne(input: {
		filters: readonly CultivarRepositoryV2FilterClause[];
	}): Promise<CultivarRepositoryV2DeleteOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.cultivars.values(), input.filters);
		if (!row) this.throwNotFoundError("Cultivar", input.filters);
		const key = idKey(row.id);
		for (const plant of this.store.plants.values()) {
			if (idKey(plant.cultivarId) === key && workspaceKeysEqual(plant.workspaceKey, row.workspaceKey)) {
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
		filters: readonly CultivarRepositoryV2FilterClause[];
	}): Promise<CultivarRepositoryV2DeleteManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.cultivars.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const key = idKey(row.id);
			const blocked = [...this.store.plants.values()].some(
				(p) => idKey(p.cultivarId) === key && workspaceKeysEqual(p.workspaceKey, row.workspaceKey),
			);
			if (blocked) continue;
			if (this.store.cultivars.delete(key)) count += 1;
		}
		return { count };
	}
}
