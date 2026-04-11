import type {
	SpeciesRepositoryCreateInputDTO,
	SpeciesRepositoryCreateOutputDTO,
	SpeciesRepositoryDeleteInputDTO,
	SpeciesRepositoryDeleteOutputDTO,
	SpeciesRepositoryGetAllOutputDTO,
	SpeciesRepositoryGetByIdInputDTO,
	SpeciesRepositoryGetByIdOutputDTO,
	SpeciesRepositoryPort,
	SpeciesRepositoryUpdateInputDTO,
	SpeciesRepositoryUpdateOutputDTO,
} from "@backend/core/application/ports/repositories/gardening/species.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { SpeciesEntity } from "@backend/core/domain/gardening/entities";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, speciesId } from "@backend/infrastructure/integrations/shared/database-ids";

export class SpeciesInMemoryRepository extends BaseRepositoryErrors implements SpeciesRepositoryPort {
	constructor(private readonly store: InMemoryStore) {
		super();
	}

	private insertRow(dto: SpeciesRepositoryCreateInputDTO): SpeciesRepositoryCreateOutputDTO {
		if (!this.store.speciesCategories.has(idKey(dto.categoryId))) {
			this.throwNotFoundError("SpeciesCategory", dto.categoryId);
		}
		const now = new Date();
		const id = speciesId();
		const row: SpeciesEntity = {
			id,
			workspaceKey: dto.workspaceKey,
			categoryId: dto.categoryId,
			characteristics: dto.characteristics,
			presentation: dto.presentation,
			createdAt: now,
			updatedAt: now,
		};
		this.store.species.set(idKey(id), row);
		return row;
	}

	private loadById(dto: SpeciesRepositoryGetByIdInputDTO): SpeciesRepositoryGetByIdOutputDTO {
		const row = this.store.species.get(idKey(dto.id));
		if (!row) this.throwNotFoundError("Species", dto.id);
		return row;
	}

	private listInWorkspaces(
		workspaceKeys: readonly SpeciesEntity["workspaceKey"][],
	): SpeciesRepositoryGetAllOutputDTO {
		const allowed = new Set(workspaceKeys.map((key) => String(key)));
		return { items: [...this.store.species.values()].filter((x) => allowed.has(String(x.workspaceKey))) };
	}

	private patchRow(dto: SpeciesRepositoryUpdateInputDTO): SpeciesRepositoryUpdateOutputDTO {
		const key = idKey(dto.id);
		const existing = this.store.species.get(key);
		if (!existing) this.throwNotFoundError("Species", dto.id);
		if (dto.categoryId !== undefined && !this.store.speciesCategories.has(idKey(dto.categoryId))) {
			this.throwNotFoundError("SpeciesCategory", dto.categoryId);
		}
		const updated: SpeciesEntity = {
			...existing,
			...dto,
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: new Date(),
		};
		this.store.species.set(key, updated);
		return updated;
	}

	private removeRow(dto: SpeciesRepositoryDeleteInputDTO): SpeciesRepositoryDeleteOutputDTO {
		const key = idKey(dto.id);
		if (!this.store.species.has(key)) this.throwNotFoundError("Species", dto.id);
		for (const c of this.store.cultivars.values()) {
			if (idKey(c.speciesId) === key) {
				this.throwConflictError({
					operation: "delete",
					reason: "cultivars-reference-species",
					context: { speciesId: dto.id, cultivarId: c.id },
					participants: [
						{ entity: "Species", role: "target", id: dto.id },
						{ entity: "Cultivar", role: "blocking-reference", id: c.id },
					],
					message: "Cannot delete species: cultivars still reference it.",
				});
			}
		}
		this.store.species.delete(key);
		return dto.id;
	}

	async createScoped(input: { dto: SpeciesRepositoryCreateInputDTO }): Promise<SpeciesRepositoryCreateOutputDTO> {
		return this.insertRow(input.dto);
	}

	async getAllScoped(input: {
		workspaceKeys: readonly SpeciesEntity["workspaceKey"][];
	}): Promise<SpeciesRepositoryGetAllOutputDTO> {
		return this.listInWorkspaces(input.workspaceKeys);
	}

	async getByIdScoped(input: {
		workspaceKey: SpeciesEntity["workspaceKey"];
		dto: SpeciesRepositoryGetByIdInputDTO;
	}): Promise<SpeciesRepositoryGetByIdOutputDTO> {
		const row = this.loadById(input.dto);
		if (String(row.workspaceKey) !== String(input.workspaceKey)) {
			this.throwNotFoundError("Species", input.dto.id);
		}
		return row;
	}

	async updateByIdScoped(input: {
		workspaceKey: SpeciesEntity["workspaceKey"];
		dto: SpeciesRepositoryUpdateInputDTO;
	}): Promise<SpeciesRepositoryUpdateOutputDTO> {
		await this.getByIdScoped({ workspaceKey: input.workspaceKey, dto: { id: input.dto.id } });
		return this.patchRow(input.dto);
	}

	async deleteByIdScoped(input: {
		workspaceKey: SpeciesEntity["workspaceKey"];
		dto: SpeciesRepositoryDeleteInputDTO;
	}): Promise<SpeciesRepositoryDeleteOutputDTO> {
		await this.getByIdScoped({ workspaceKey: input.workspaceKey, dto: input.dto });
		return this.removeRow(input.dto);
	}
}
