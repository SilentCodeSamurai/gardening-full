import type {
	SpeciesRepositoryPortV2,
	SpeciesRepositoryV2CreateInputDTO,
	SpeciesRepositoryV2CreateManyInputDTO,
	SpeciesRepositoryV2CreateManyOutputDTO,
	SpeciesRepositoryV2CreateOutputDTO,
	SpeciesRepositoryV2DeleteManyOutputDTO,
	SpeciesRepositoryV2DeleteOutputDTO,
	SpeciesRepositoryV2FilterClause,
	SpeciesRepositoryV2GetManyOutputDTO,
	SpeciesRepositoryV2GetOneOutputDTO,
	SpeciesRepositoryV2UpdateManyOutputDTO,
	SpeciesRepositoryV2UpdateOutputDTO,
	SpeciesRepositoryV2UpdatePatchDTO,
} from "@backend/core/application/ports/repositories/gardening/species.repository.port.v2";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { SpeciesEntity } from "@backend/core/domain/gardening/entities";
import { workspaceKeysEqual } from "@backend/infrastructure/adapters/repositories/shared/workspace-key";
import {
	findFirstRowMatchingAnyClause,
	findRowsMatchingAnyClause,
} from "@backend/infrastructure/adapters/repositories/shared/in-memory-v2-entity-filter";
import type { InMemoryStoreV2 } from "@backend/infrastructure/integrations/in-memory-database/client.v2";
import { idKey, speciesId } from "@backend/infrastructure/integrations/shared/database-ids";

export class SpeciesInMemoryRepositoryV2 extends BaseRepositoryErrors implements SpeciesRepositoryPortV2 {
	constructor(private readonly store: InMemoryStoreV2) {
		super();
	}

	private insertRow(dto: SpeciesRepositoryV2CreateInputDTO): SpeciesRepositoryV2CreateOutputDTO {
		const cat = this.store.speciesCategories.get(idKey(dto.categoryId));
		if (!cat) {
			this.throwNotFoundError("SpeciesCategory", dto.categoryId);
		}
		if (!workspaceKeysEqual(cat.workspaceKey, dto.workspaceKey)) {
			this.throwValidationError({
				operation: "create",
				validationCode: "category-workspace-mismatch",
				context: { categoryId: dto.categoryId, workspaceKey: dto.workspaceKey },
			});
		}
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

	private patchStored(existing: SpeciesEntity, dto: SpeciesRepositoryV2UpdatePatchDTO): SpeciesEntity {
		const nextWorkspaceKey = dto.workspaceKey !== undefined ? dto.workspaceKey : existing.workspaceKey;
		const nextCategoryId = dto.categoryId !== undefined ? dto.categoryId : existing.categoryId;
		return {
			...existing,
			workspaceKey: nextWorkspaceKey,
			categoryId: nextCategoryId,
			characteristics: dto.characteristics !== undefined ? dto.characteristics : existing.characteristics,
			presentation: dto.presentation !== undefined ? dto.presentation : existing.presentation,
			updatedAt: new Date(),
		};
	}

	private assertCategoryMatchesWorkspace(categoryId: SpeciesEntity["categoryId"], workspaceKey: SpeciesEntity["workspaceKey"]): void {
		const cat = this.store.speciesCategories.get(idKey(categoryId));
		if (!cat) this.throwNotFoundError("SpeciesCategory", categoryId);
		if (!workspaceKeysEqual(cat.workspaceKey, workspaceKey)) {
			this.throwValidationError({
				operation: "update",
				validationCode: "category-workspace-mismatch",
				context: { categoryId, workspaceKey },
			});
		}
	}

	async createOne(dto: SpeciesRepositoryV2CreateInputDTO): Promise<SpeciesRepositoryV2CreateOutputDTO> {
		return this.insertRow(dto);
	}

	async createMany(input: SpeciesRepositoryV2CreateManyInputDTO): Promise<SpeciesRepositoryV2CreateManyOutputDTO> {
		let count = 0;
		for (const item of input.items) {
			this.insertRow(item);
			count += 1;
		}
		return { count };
	}

	async getOne(input: {
		filters: readonly SpeciesRepositoryV2FilterClause[];
	}): Promise<SpeciesRepositoryV2GetOneOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.species.values(), input.filters);
		if (!row) this.throwNotFoundError("Species", input.filters);
		return row;
	}

	async getMany(input?: {
		filters?: readonly SpeciesRepositoryV2FilterClause[];
	}): Promise<SpeciesRepositoryV2GetManyOutputDTO> {
		if (input?.filters === undefined) {
			return { items: [...this.store.species.values()] };
		}
		if (input.filters.length === 0) return { items: [] };
		const rows = findRowsMatchingAnyClause([...this.store.species.values()], input.filters);
		return { items: rows };
	}

	async updateOne(input: {
		filters: readonly SpeciesRepositoryV2FilterClause[];
		dto: SpeciesRepositoryV2UpdatePatchDTO;
	}): Promise<SpeciesRepositoryV2UpdateOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.species.values(), input.filters);
		if (!row) this.throwNotFoundError("Species", input.filters);
		const patchedPreview = this.patchStored(row, input.dto);
		this.assertCategoryMatchesWorkspace(patchedPreview.categoryId, patchedPreview.workspaceKey);
		const updated = patchedPreview;
		this.store.species.set(idKey(updated.id), updated);
		return updated;
	}

	async updateMany(input: {
		filters: readonly SpeciesRepositoryV2FilterClause[];
		dto: SpeciesRepositoryV2UpdatePatchDTO;
	}): Promise<SpeciesRepositoryV2UpdateManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.species.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const updated = this.patchStored(row, input.dto);
			this.assertCategoryMatchesWorkspace(updated.categoryId, updated.workspaceKey);
			this.store.species.set(idKey(updated.id), updated);
			count += 1;
		}
		return { count };
	}

	async deleteOne(input: {
		filters: readonly SpeciesRepositoryV2FilterClause[];
	}): Promise<SpeciesRepositoryV2DeleteOutputDTO> {
		const row = findFirstRowMatchingAnyClause(this.store.species.values(), input.filters);
		if (!row) this.throwNotFoundError("Species", input.filters);
		const key = idKey(row.id);
		for (const c of this.store.cultivars.values()) {
			if (idKey(c.speciesId) === key && workspaceKeysEqual(c.workspaceKey, row.workspaceKey)) {
				this.throwConflictError({
					operation: "delete",
					reason: "cultivar-reference-species",
					context: { speciesId: row.id, cultivarId: c.id },
					participants: [
						{ entity: "Species", role: "target", id: row.id as unknown as string },
						{ entity: "Cultivar", role: "blocking-reference", id: c.id as unknown as string },
					],
					message: "Cannot delete species: cultivars still reference it.",
				});
			}
		}
		this.store.species.delete(key);
		return row.id;
	}

	async deleteMany(input: {
		filters: readonly SpeciesRepositoryV2FilterClause[];
	}): Promise<SpeciesRepositoryV2DeleteManyOutputDTO> {
		const rows = findRowsMatchingAnyClause([...this.store.species.values()], input.filters);
		let count = 0;
		for (const row of rows) {
			const key = idKey(row.id);
			const blocked = [...this.store.cultivars.values()].some(
				(c) => idKey(c.speciesId) === key && workspaceKeysEqual(c.workspaceKey, row.workspaceKey),
			);
			if (blocked) continue;
			if (this.store.species.delete(key)) count += 1;
		}
		return { count };
	}
}
