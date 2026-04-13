import type {
	SpeciesRepositoryPort,
	SpeciesRepositoryCreateInputDTO,
	SpeciesRepositoryCreateManyInputDTO,
	SpeciesRepositoryCreateManyOutputDTO,
	SpeciesRepositoryCreateOutputDTO,
	SpeciesRepositoryDeleteManyOutputDTO,
	SpeciesRepositoryDeleteOutputDTO,
	SpeciesRepositoryFilterClause,
	SpeciesRepositoryGetManyOutputDTO,
	SpeciesRepositoryGetOneOutputDTO,
	SpeciesRepositoryUpdateManyOutputDTO,
	SpeciesRepositoryUpdateOutputDTO,
	SpeciesRepositoryUpdatePatchDTO,
} from "@backend/core/application/ports/repositories/gardening/species.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { SpeciesEntity } from "@backend/core/domain/gardening/entities";
import { workspaceKeysEqual } from "@backend/infrastructure/adapters/repositories/shared/workspace-key";
import {
	findFirstRowMatchingAnyClause,
	findRowsMatchingAnyClause,
} from "@backend/infrastructure/adapters/repositories/shared/in-memory-entity-filter";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, speciesId } from "@backend/infrastructure/integrations/shared/database-ids";

export class SpeciesInMemoryRepository extends BaseRepositoryErrors implements SpeciesRepositoryPort {
	constructor(private readonly store: InMemoryStore) {
		super();
	}

	private insertRow(dto: SpeciesRepositoryCreateInputDTO): SpeciesRepositoryCreateOutputDTO {
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

	private patchStored(existing: SpeciesEntity, dto: SpeciesRepositoryUpdatePatchDTO): SpeciesEntity {
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
		const patchedPreview = this.patchStored(row, input.dto);
		this.assertCategoryMatchesWorkspace(patchedPreview.categoryId, patchedPreview.workspaceKey);
		const updated = patchedPreview;
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
			this.assertCategoryMatchesWorkspace(updated.categoryId, updated.workspaceKey);
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
		filters: readonly SpeciesRepositoryFilterClause[];
	}): Promise<SpeciesRepositoryDeleteManyOutputDTO> {
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
