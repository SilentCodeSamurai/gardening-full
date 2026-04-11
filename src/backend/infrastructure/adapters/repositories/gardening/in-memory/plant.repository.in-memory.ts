import type {
	PlantRepositoryCreateInputDTO,
	PlantRepositoryCreateManyInputDTO,
	PlantRepositoryCreateManyOutputDTO,
	PlantRepositoryCreateOutputDTO,
	PlantRepositoryDeleteInputDTO,
	PlantRepositoryDeleteManyInputDTO,
	PlantRepositoryDeleteManyOutputDTO,
	PlantRepositoryDeleteOutputDTO,
	PlantRepositoryGetAllOutputDTO,
	PlantRepositoryGetByCultivarIdInputDTO,
	PlantRepositoryGetByCultivarIdOutputDTO,
	PlantRepositoryGetByIdInputDTO,
	PlantRepositoryGetByIdOutputDTO,
	PlantRepositoryGetListByIdsInputDTO,
	PlantRepositoryGetListByIdsOutputDTO,
	PlantRepositoryPort,
	PlantRepositoryUpdateInputDTO,
	PlantRepositoryUpdateOutputDTO,
} from "@backend/core/application/ports/repositories/gardening/plant.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { HydratedPlantEntity, PlantEntity, PlantEntityId } from "@backend/core/domain/gardening/entities";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { idKey, plantId } from "@backend/infrastructure/integrations/shared/database-ids";

export class PlantInMemoryRepository extends BaseRepositoryErrors implements PlantRepositoryPort {
	constructor(private readonly store: InMemoryStore) {
		super();
	}

	private hydratePlant(row: PlantEntity): HydratedPlantEntity {
		const cultivar = this.store.cultivars.get(idKey(row.cultivarId));
		if (!cultivar) this.throwNotFoundError("Cultivar", row.cultivarId);
		const species = this.store.species.get(idKey(cultivar.speciesId));
		if (!species) this.throwNotFoundError("Species", cultivar.speciesId);
		return {
			...row,
			cultivar: {
				...cultivar,
				species,
			},
		};
	}

	private insertRow(dto: PlantRepositoryCreateInputDTO): PlantRepositoryCreateOutputDTO {
		if (!this.store.cultivars.has(idKey(dto.cultivarId))) {
			this.throwNotFoundError("Cultivar", dto.cultivarId);
		}
		const now = new Date();
		const id = plantId();
		const row: PlantEntity = {
			id,
			workspaceKey: dto.workspaceKey,
			title: dto.title,
			description: dto.description,
			cultivarId: dto.cultivarId,
			createdAt: now,
			updatedAt: now,
		};
		this.store.plants.set(idKey(id), row);
		return this.hydratePlant(row);
	}

	private insertManyRows(rows: PlantRepositoryCreateManyInputDTO): PlantRepositoryCreateManyOutputDTO {
		const items: HydratedPlantEntity[] = [];
		for (const dto of rows) {
			if (!this.store.cultivars.has(idKey(dto.cultivarId))) {
				this.throwNotFoundError("Cultivar", dto.cultivarId);
			}
			const now = new Date();
			const id = plantId();
			const row: PlantEntity = {
				id,
				workspaceKey: dto.workspaceKey,
				title: dto.title,
				description: dto.description,
				cultivarId: dto.cultivarId,
				createdAt: now,
				updatedAt: now,
			};
			this.store.plants.set(idKey(id), row);
			items.push(this.hydratePlant(row));
		}
		return { items };
	}

	private loadById(dto: PlantRepositoryGetByIdInputDTO): PlantRepositoryGetByIdOutputDTO {
		const row = this.store.plants.get(idKey(dto.id));
		if (!row) this.throwNotFoundError("Plant", dto.id);
		return this.hydratePlant(row);
	}

	private listByIdsInWorkspaces(
		workspaceKeys: readonly PlantEntity["workspaceKey"][],
		dto: PlantRepositoryGetListByIdsInputDTO,
	): PlantRepositoryGetListByIdsOutputDTO {
		const allowed = new Set(workspaceKeys.map((key) => String(key)));
		const items: HydratedPlantEntity[] = [];
		for (const pid of dto.ids) {
			const p = this.store.plants.get(idKey(pid));
			if (p && allowed.has(String(p.workspaceKey))) items.push(this.hydratePlant(p));
		}
		return { items };
	}

	private listInWorkspaces(workspaceKeys: readonly PlantEntity["workspaceKey"][]): PlantRepositoryGetAllOutputDTO {
		const allowed = new Set(workspaceKeys.map((key) => String(key)));
		const rows = [...this.store.plants.values()].filter((x) => allowed.has(String(x.workspaceKey)));
		return { items: rows.map((row) => this.hydratePlant(row)) };
	}

	private patchRow(dto: PlantRepositoryUpdateInputDTO): PlantRepositoryUpdateOutputDTO {
		const key = idKey(dto.id);
		const existing = this.store.plants.get(key);
		if (!existing) this.throwNotFoundError("Plant", dto.id);
		const nextCultivarId = dto.cultivarId !== undefined ? dto.cultivarId : existing.cultivarId;
		if (!this.store.cultivars.has(idKey(nextCultivarId))) {
			this.throwNotFoundError("Cultivar", nextCultivarId);
		}
		const updated: PlantEntity = {
			...existing,
			title: dto.title ?? existing.title,
			description: dto.description ?? existing.description,
			cultivarId: nextCultivarId,
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: new Date(),
		};
		this.store.plants.set(key, updated);
		return this.hydratePlant(updated);
	}

	private listByCultivarInWorkspaces(
		workspaceKeys: readonly PlantEntity["workspaceKey"][],
		dto: PlantRepositoryGetByCultivarIdInputDTO,
	): PlantRepositoryGetByCultivarIdOutputDTO {
		const allowed = new Set(workspaceKeys.map((key) => String(key)));
		const ck = idKey(dto.cultivarId);
		const items = [...this.store.plants.values()]
			.filter((p) => idKey(p.cultivarId) === ck && allowed.has(String(p.workspaceKey)))
			.map((row) => this.hydratePlant(row));
		return { items };
	}

	private removeRow(dto: PlantRepositoryDeleteInputDTO): PlantRepositoryDeleteOutputDTO {
		const key = idKey(dto.id);
		if (!this.store.plants.has(key)) this.throwNotFoundError("Plant", dto.id);
		this.store.unlinkAllEventsFromPlant(dto.id);
		this.store.plants.delete(key);
		return dto.id;
	}

	private removeManyInWorkspaces(
		workspaceKeys: readonly PlantEntity["workspaceKey"][],
		dto: PlantRepositoryDeleteManyInputDTO,
	): PlantRepositoryDeleteManyOutputDTO {
		const allowed = new Set(workspaceKeys.map((key) => String(key)));
		const deletedIds: PlantEntityId[] = [];
		for (const id of dto.ids) {
			const key = idKey(id);
			const row = this.store.plants.get(key);
			if (!row || !allowed.has(String(row.workspaceKey))) continue;
			this.store.unlinkAllEventsFromPlant(id);
			this.store.plants.delete(key);
			deletedIds.push(id);
		}
		return { deletedIds };
	}

	async createManyScoped(input: {
		dto: { rows: PlantRepositoryCreateManyInputDTO };
	}): Promise<PlantRepositoryCreateManyOutputDTO> {
		return this.insertManyRows(input.dto.rows);
	}

	async getByCultivarIdScoped(input: {
		workspaceKeys: readonly PlantEntity["workspaceKey"][];
		dto: PlantRepositoryGetByCultivarIdInputDTO;
	}): Promise<PlantRepositoryGetByCultivarIdOutputDTO> {
		return this.listByCultivarInWorkspaces(input.workspaceKeys, input.dto);
	}

	async getListByIdsScoped(input: {
		workspaceKeys: readonly PlantEntity["workspaceKey"][];
		dto: PlantRepositoryGetListByIdsInputDTO;
	}): Promise<PlantRepositoryGetListByIdsOutputDTO> {
		return this.listByIdsInWorkspaces(input.workspaceKeys, input.dto);
	}

	async deleteManyScoped(input: {
		workspaceKeys: readonly PlantEntity["workspaceKey"][];
		dto: PlantRepositoryDeleteManyInputDTO;
	}): Promise<PlantRepositoryDeleteManyOutputDTO> {
		return this.removeManyInWorkspaces(input.workspaceKeys, input.dto);
	}

	async createScoped(input: { dto: PlantRepositoryCreateInputDTO }): Promise<PlantRepositoryCreateOutputDTO> {
		return this.insertRow(input.dto);
	}

	async getAllScoped(input: {
		workspaceKeys: readonly PlantEntity["workspaceKey"][];
	}): Promise<PlantRepositoryGetAllOutputDTO> {
		return this.listInWorkspaces(input.workspaceKeys);
	}

	async getByIdScoped(input: {
		workspaceKey: PlantEntity["workspaceKey"];
		dto: PlantRepositoryGetByIdInputDTO;
	}): Promise<PlantRepositoryGetByIdOutputDTO> {
		const row = this.loadById(input.dto);
		if (String(row.workspaceKey) !== String(input.workspaceKey)) {
			this.throwNotFoundError("Plant", input.dto.id);
		}
		return row;
	}

	async updateByIdScoped(input: {
		workspaceKey: PlantEntity["workspaceKey"];
		dto: PlantRepositoryUpdateInputDTO;
	}): Promise<PlantRepositoryUpdateOutputDTO> {
		await this.getByIdScoped({ workspaceKey: input.workspaceKey, dto: { id: input.dto.id } });
		return this.patchRow(input.dto);
	}

	async deleteByIdScoped(input: {
		workspaceKey: PlantEntity["workspaceKey"];
		dto: PlantRepositoryDeleteInputDTO;
	}): Promise<PlantRepositoryDeleteOutputDTO> {
		await this.getByIdScoped({ workspaceKey: input.workspaceKey, dto: input.dto });
		return this.removeRow(input.dto);
	}
}
