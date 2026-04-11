import type {
	SpeciesCategoryRepositoryCreateInputDTO,
	SpeciesCategoryRepositoryCreateOutputDTO,
	SpeciesCategoryRepositoryDeleteInputDTO,
	SpeciesCategoryRepositoryDeleteOutputDTO,
	SpeciesCategoryRepositoryGetAllOutputDTO,
	SpeciesCategoryRepositoryGetByIdInputDTO,
	SpeciesCategoryRepositoryGetByIdOutputDTO,
	SpeciesCategoryRepositoryPort,
	SpeciesCategoryRepositoryUpdateInputDTO,
	SpeciesCategoryRepositoryUpdateOutputDTO,
} from "@backend/core/application/ports/repositories/gardening/species-category.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { SpeciesCategoryEntity } from "@backend/core/domain/gardening/entities";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, speciesCategoryId } from "@backend/infrastructure/integrations/shared/database-ids";

export class SpeciesCategoryInMemoryRepository extends BaseRepositoryErrors implements SpeciesCategoryRepositoryPort {
	constructor(private readonly store: InMemoryStore) {
		super();
	}

	private insertRow(dto: SpeciesCategoryRepositoryCreateInputDTO): SpeciesCategoryRepositoryCreateOutputDTO {
		const now = new Date();
		const id = speciesCategoryId();
		const row: SpeciesCategoryEntity = {
			id,
			workspaceKey: dto.workspaceKey,
			title: dto.title,
			presentation: dto.presentation,
			createdAt: now,
			updatedAt: now,
		};
		this.store.speciesCategories.set(idKey(id), row);
		return row;
	}

	private loadById(dto: SpeciesCategoryRepositoryGetByIdInputDTO): SpeciesCategoryRepositoryGetByIdOutputDTO {
		const row = this.store.speciesCategories.get(idKey(dto.id));
		if (!row) this.throwNotFoundError("SpeciesCategory", dto.id);
		return row;
	}

	private listInWorkspaces(
		workspaceKeys: readonly SpeciesCategoryEntity["workspaceKey"][],
	): SpeciesCategoryRepositoryGetAllOutputDTO {
		const allowed = new Set(workspaceKeys.map((key) => String(key)));
		return { items: [...this.store.speciesCategories.values()].filter((x) => allowed.has(String(x.workspaceKey))) };
	}

	private patchRow(dto: SpeciesCategoryRepositoryUpdateInputDTO): SpeciesCategoryRepositoryUpdateOutputDTO {
		const key = idKey(dto.id);
		const existing = this.store.speciesCategories.get(key);
		if (!existing) this.throwNotFoundError("SpeciesCategory", dto.id);
		const updated: SpeciesCategoryEntity = {
			...existing,
			...dto,
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: new Date(),
		};
		this.store.speciesCategories.set(key, updated);
		return updated;
	}

	private removeRow(dto: SpeciesCategoryRepositoryDeleteInputDTO): SpeciesCategoryRepositoryDeleteOutputDTO {
		const key = idKey(dto.id);
		const existing = this.store.speciesCategories.get(key);
		if (!existing) this.throwNotFoundError("SpeciesCategory", dto.id);
		for (const s of this.store.species.values()) {
			if (idKey(s.categoryId) === key) {
				this.throwConflictError({
					operation: "delete",
					reason: "species-reference-category",
					context: { categoryId: dto.id, speciesId: s.id },
					participants: [
						{ entity: "SpeciesCategory", role: "target", id: dto.id },
						{ entity: "Species", role: "blocking-reference", id: s.id },
					],
					message: "Cannot delete species category: species still reference it.",
				});
			}
		}
		this.store.speciesCategories.delete(key);
		return dto.id;
	}

	async createScoped(
		input: { dto: SpeciesCategoryRepositoryCreateInputDTO },
	): Promise<SpeciesCategoryRepositoryCreateOutputDTO> {
		return this.insertRow(input.dto);
	}

	async getAllScoped(input: {
		workspaceKeys: readonly SpeciesCategoryEntity["workspaceKey"][];
	}): Promise<SpeciesCategoryRepositoryGetAllOutputDTO> {
		return this.listInWorkspaces(input.workspaceKeys);
	}

	async getByIdScoped(input: {
		workspaceKey: SpeciesCategoryEntity["workspaceKey"];
		dto: SpeciesCategoryRepositoryGetByIdInputDTO;
	}): Promise<SpeciesCategoryRepositoryGetByIdOutputDTO> {
		const row = this.loadById(input.dto);
		if (String(row.workspaceKey) !== String(input.workspaceKey)) {
			this.throwNotFoundError("SpeciesCategory", input.dto.id);
		}
		return row;
	}

	async updateByIdScoped(input: {
		workspaceKey: SpeciesCategoryEntity["workspaceKey"];
		dto: SpeciesCategoryRepositoryUpdateInputDTO;
	}): Promise<SpeciesCategoryRepositoryUpdateOutputDTO> {
		await this.getByIdScoped({ workspaceKey: input.workspaceKey, dto: { id: input.dto.id } });
		return this.patchRow(input.dto);
	}

	async deleteByIdScoped(input: {
		workspaceKey: SpeciesCategoryEntity["workspaceKey"];
		dto: SpeciesCategoryRepositoryDeleteInputDTO;
	}): Promise<SpeciesCategoryRepositoryDeleteOutputDTO> {
		await this.getByIdScoped({ workspaceKey: input.workspaceKey, dto: input.dto });
		return this.removeRow(input.dto);
	}
}
