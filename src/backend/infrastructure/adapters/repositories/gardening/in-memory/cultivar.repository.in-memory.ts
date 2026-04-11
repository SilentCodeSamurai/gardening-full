import type {
	CultivarRepositoryCreateInputDTO,
	CultivarRepositoryCreateOutputDTO,
	CultivarRepositoryDeleteInputDTO,
	CultivarRepositoryDeleteOutputDTO,
	CultivarRepositoryGetAllOutputDTO,
	CultivarRepositoryGetByIdInputDTO,
	CultivarRepositoryGetByIdOutputDTO,
	CultivarRepositoryGetFullByIdInputDTO,
	CultivarRepositoryGetFullByIdOutputDTO,
	CultivarRepositoryPort,
	CultivarRepositoryUpdateInputDTO,
	CultivarRepositoryUpdateOutputDTO,
} from "@backend/core/application/ports/repositories/gardening/cultivar.repositort.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { CultivarEntity } from "@backend/core/domain/gardening/entities";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { cultivarId, idKey } from "@backend/infrastructure/integrations/shared/database-ids";

export class CultivarInMemoryRepository extends BaseRepositoryErrors implements CultivarRepositoryPort {
	constructor(private readonly store: InMemoryStore) {
		super();
	}

	private insertRow(dto: CultivarRepositoryCreateInputDTO): CultivarRepositoryCreateOutputDTO {
		if (!this.store.species.has(idKey(dto.speciesId))) {
			this.throwNotFoundError("Species", dto.speciesId);
		}
		const now = new Date();
		const id = cultivarId();
		const row: CultivarEntity = {
			id,
			workspaceKey: dto.workspaceKey,
			speciesId: dto.speciesId,
			characteristics: dto.characteristics,
			presentation: dto.presentation,
			createdAt: now,
			updatedAt: now,
		};
		this.store.cultivars.set(idKey(id), row);
		return row;
	}

	private loadById(dto: CultivarRepositoryGetByIdInputDTO): CultivarRepositoryGetByIdOutputDTO {
		const row = this.store.cultivars.get(idKey(dto.id));
		if (!row) this.throwNotFoundError("Cultivar", dto.id);
		return row;
	}

	private loadFull(dto: CultivarRepositoryGetFullByIdInputDTO): CultivarRepositoryGetFullByIdOutputDTO {
		const cultivar = this.store.cultivars.get(idKey(dto.id));
		if (!cultivar) this.throwNotFoundError("Cultivar", dto.id);
		const species = this.store.species.get(idKey(cultivar.speciesId));
		if (!species) this.throwNotFoundError("Species", cultivar.speciesId);
		return { ...cultivar, species };
	}

	private listInWorkspaces(
		workspaceKeys: readonly CultivarEntity["workspaceKey"][],
	): CultivarRepositoryGetAllOutputDTO {
		const allowed = new Set(workspaceKeys.map((key) => String(key)));
		return { items: [...this.store.cultivars.values()].filter((x) => allowed.has(String(x.workspaceKey))) };
	}

	private patchRow(dto: CultivarRepositoryUpdateInputDTO): CultivarRepositoryUpdateOutputDTO {
		const key = idKey(dto.id);
		const existing = this.store.cultivars.get(key);
		if (!existing) this.throwNotFoundError("Cultivar", dto.id);
		if (dto.speciesId !== undefined && !this.store.species.has(idKey(dto.speciesId))) {
			this.throwNotFoundError("Species", dto.speciesId);
		}
		const updated: CultivarEntity = {
			...existing,
			...dto,
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: new Date(),
		};
		this.store.cultivars.set(key, updated);
		return updated;
	}

	private removeRow(dto: CultivarRepositoryDeleteInputDTO): CultivarRepositoryDeleteOutputDTO {
		const key = idKey(dto.id);
		if (!this.store.cultivars.has(key)) this.throwNotFoundError("Cultivar", dto.id);
		for (const plant of this.store.plants.values()) {
			if (idKey(plant.cultivarId) === key) {
				this.throwConflictError({
					operation: "delete",
					reason: "plants-reference-cultivar",
					context: { cultivarId: dto.id, plantId: plant.id },
					participants: [
						{ entity: "Cultivar", role: "target", id: dto.id },
						{ entity: "Plant", role: "blocking-reference", id: plant.id },
					],
					message: "Cannot delete cultivar: plants still reference it.",
				});
			}
		}
		this.store.cultivars.delete(key);
		return dto.id;
	}

	async getFullByIdScoped(input: {
		workspaceKey: CultivarEntity["workspaceKey"];
		dto: CultivarRepositoryGetFullByIdInputDTO;
	}): Promise<CultivarRepositoryGetFullByIdOutputDTO> {
		const full = this.loadFull(input.dto);
		if (String(full.workspaceKey) !== String(input.workspaceKey)) {
			this.throwNotFoundError("Cultivar", input.dto.id);
		}
		return full;
	}

	async createScoped(input: { dto: CultivarRepositoryCreateInputDTO }): Promise<CultivarRepositoryCreateOutputDTO> {
		return this.insertRow(input.dto);
	}

	async getAllScoped(input: {
		workspaceKeys: readonly CultivarEntity["workspaceKey"][];
	}): Promise<CultivarRepositoryGetAllOutputDTO> {
		return this.listInWorkspaces(input.workspaceKeys);
	}

	async getByIdScoped(input: {
		workspaceKey: CultivarEntity["workspaceKey"];
		dto: CultivarRepositoryGetByIdInputDTO;
	}): Promise<CultivarRepositoryGetByIdOutputDTO> {
		const row = this.loadById(input.dto);
		if (String(row.workspaceKey) !== String(input.workspaceKey)) {
			this.throwNotFoundError("Cultivar", input.dto.id);
		}
		return row;
	}

	async updateByIdScoped(input: {
		workspaceKey: CultivarEntity["workspaceKey"];
		dto: CultivarRepositoryUpdateInputDTO;
	}): Promise<CultivarRepositoryUpdateOutputDTO> {
		await this.getByIdScoped({ workspaceKey: input.workspaceKey, dto: { id: input.dto.id } });
		return this.patchRow(input.dto);
	}

	async deleteByIdScoped(input: {
		workspaceKey: CultivarEntity["workspaceKey"];
		dto: CultivarRepositoryDeleteInputDTO;
	}): Promise<CultivarRepositoryDeleteOutputDTO> {
		await this.getByIdScoped({ workspaceKey: input.workspaceKey, dto: input.dto });
		return this.removeRow(input.dto);
	}
}
