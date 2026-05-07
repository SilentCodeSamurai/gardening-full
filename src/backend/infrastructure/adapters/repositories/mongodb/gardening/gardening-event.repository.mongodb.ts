import type {
	GardeningEventRepositoryCreateInputDTO,
	GardeningEventRepositoryCreateManyInputDTO,
	GardeningEventRepositoryCreateManyOutputDTO,
	GardeningEventRepositoryCreateOutputDTO,
	GardeningEventRepositoryDeleteManyOutputDTO,
	GardeningEventRepositoryDeleteOutputDTO,
	GardeningEventRepositoryFilterClause,
	GardeningEventRepositoryForLocationFilterClause,
	GardeningEventRepositoryForPlantFilterClause,
	GardeningEventRepositoryGetBindingsOutputDTO,
	GardeningEventRepositoryGetManyOutputDTO,
	GardeningEventRepositoryGetOneOutputDTO,
	GardeningEventRepositoryPort,
	GardeningEventRepositoryUpdateManyOutputDTO,
	GardeningEventRepositoryUpdateOutputDTO,
	GardeningEventRepositoryUpdatePatchDTO,
} from "@backend/core/application/ports/repositories/gardening/gardening-event.repository.port";
import type { GardeningEventEntity } from "@backend/core/domain/gardening/entities";
import { TransactionManagerMongoDB } from "@backend/infrastructure/adapters/transaction/transaction-manager.mongodb";
import { MongoDBDatabaseNameToken } from "@backend/infrastructure/integrations/mongodb/injection-tokens";
import { gardeningEventId } from "@backend/infrastructure/integrations/shared/database-ids";
import { inject, injectable } from "tsyringe";
import { BaseMongoDBRepository } from "../shared/base-mongodb.repository";
import { MONGODB_COLLECTION_TYPE } from "../shared/mongodb.constants";
import { MONGODB_MAPPERS } from "../shared/mongodb.mappers";
import type { GardeningEventDoc } from "../shared/mongodb.models";

@injectable()
export class GardeningEventMongoDBRepository extends BaseMongoDBRepository implements GardeningEventRepositoryPort {
	constructor(
		@inject(TransactionManagerMongoDB) tx: TransactionManagerMongoDB,
		@inject(MongoDBDatabaseNameToken) databaseName: string,
	) {
		super(tx, databaseName);
	}

	async createOne(dto: GardeningEventRepositoryCreateInputDTO): Promise<GardeningEventRepositoryCreateOutputDTO> {
		const now = new Date();
		const doc: GardeningEventDoc = {
			...dto,
			id: gardeningEventId(),
			createdAt: now,
			updatedAt: now,
			workspaceKey: dto.workspace.toKey(),
			plantIds: [],
			locationIds: [],
		};
		await this.collection(MONGODB_COLLECTION_TYPE.GARDENING_EVENTS).insertOne(doc, { session: this.tx.session });
		return MONGODB_MAPPERS.gardeningEvent(doc);
	}
	async createMany(
		input: GardeningEventRepositoryCreateManyInputDTO,
	): Promise<GardeningEventRepositoryCreateManyOutputDTO> {
		if (input.items.length === 0) return { count: 0 };
		const now = new Date();
		const docs: GardeningEventDoc[] = input.items.map((item) => ({
			...item,
			id: gardeningEventId(),
			createdAt: now,
			updatedAt: now,
			workspaceKey: item.workspace.toKey(),
			plantIds: [],
			locationIds: [],
		}));
		await this.collection(MONGODB_COLLECTION_TYPE.GARDENING_EVENTS).insertMany(docs, {
			session: this.tx.session,
		});
		return { count: input.items.length };
	}
	async getOne(input: {
		filters: readonly GardeningEventRepositoryFilterClause[];
	}): Promise<GardeningEventRepositoryGetOneOutputDTO> {
		const doc = await this.collection(MONGODB_COLLECTION_TYPE.GARDENING_EVENTS).findOne(
			this.filters(input.filters),
			{ session: this.tx.session },
		);
		if (!doc) this.throwNotFoundError("GardeningEvent", input.filters);
		return MONGODB_MAPPERS.gardeningEvent(doc);
	}
	async getMany(input?: {
		filters?: readonly GardeningEventRepositoryFilterClause[];
	}): Promise<GardeningEventRepositoryGetManyOutputDTO> {
		if (input?.filters === undefined) {
			const docs = await this.collection(MONGODB_COLLECTION_TYPE.GARDENING_EVENTS)
				.find({}, { session: this.tx.session })
				.toArray();
			return { items: docs.map(MONGODB_MAPPERS.gardeningEvent) };
		}
		if (input.filters.length === 0) return { items: [] };
		const docs = await this.collection(MONGODB_COLLECTION_TYPE.GARDENING_EVENTS)
			.find(this.filters(input.filters), { session: this.tx.session })
			.toArray();
		return { items: docs.map(MONGODB_MAPPERS.gardeningEvent) };
	}
	async updateOne(input: {
		filters: readonly GardeningEventRepositoryFilterClause[];
		dto: GardeningEventRepositoryUpdatePatchDTO;
	}): Promise<GardeningEventRepositoryUpdateOutputDTO> {
		const row = await this.getOne({ filters: input.filters });
		const updated = { ...row, ...input.dto, updatedAt: new Date() };
		await this.collection(MONGODB_COLLECTION_TYPE.GARDENING_EVENTS).updateOne(
			{ id: row.id },
			{ $set: { ...updated, workspaceKey: updated.workspace.toKey() } },
			{ session: this.tx.session },
		);
		return updated;
	}
	async updateMany(input: {
		filters: readonly GardeningEventRepositoryFilterClause[];
		dto: GardeningEventRepositoryUpdatePatchDTO;
	}): Promise<GardeningEventRepositoryUpdateManyOutputDTO> {
		const dtoDoc = { ...input.dto } as Record<string, unknown>;
		if (input.dto.workspace !== undefined) {
			dtoDoc.workspaceKey = input.dto.workspace.toKey();
			delete dtoDoc.workspace;
		}
		dtoDoc.updatedAt = new Date();
		const result = await this.collection(MONGODB_COLLECTION_TYPE.GARDENING_EVENTS).updateMany(
			this.filters(input.filters),
			{ $set: dtoDoc },
			{ session: this.tx.session },
		);
		return { count: result.modifiedCount };
	}
	async deleteOne(input: {
		filters: readonly GardeningEventRepositoryFilterClause[];
	}): Promise<GardeningEventRepositoryDeleteOutputDTO> {
		const row = await this.getOne({ filters: input.filters });
		await this.collection(MONGODB_COLLECTION_TYPE.GARDENING_EVENTS).deleteOne(
			{ id: row.id },
			{ session: this.tx.session },
		);
		return row.id;
	}
	async deleteMany(input: {
		filters: readonly GardeningEventRepositoryFilterClause[];
	}): Promise<GardeningEventRepositoryDeleteManyOutputDTO> {
		const result = await this.collection(MONGODB_COLLECTION_TYPE.GARDENING_EVENTS).deleteMany(
			this.filters(input.filters),
			{ session: this.tx.session },
		);
		return { count: result.deletedCount };
	}
	async getManyForPlant(input: {
		filters: readonly GardeningEventRepositoryForPlantFilterClause[];
	}): Promise<GardeningEventRepositoryGetManyOutputDTO> {
		const ids = new Set(input.filters.map((f) => String(f.plantId)));
		const docs = await this.collection(MONGODB_COLLECTION_TYPE.GARDENING_EVENTS)
			.find({ plantIds: { $in: [...ids] } }, { session: this.tx.session })
			.toArray();
		return { items: docs.map(MONGODB_MAPPERS.gardeningEvent) };
	}
	async getManyForLocation(input: {
		filters: readonly GardeningEventRepositoryForLocationFilterClause[];
	}): Promise<GardeningEventRepositoryGetManyOutputDTO> {
		const ids = new Set(input.filters.map((f) => String(f.locationId)));
		const docs = await this.collection(MONGODB_COLLECTION_TYPE.GARDENING_EVENTS)
			.find({ locationIds: { $in: [...ids] } }, { session: this.tx.session })
			.toArray();
		return { items: docs.map(MONGODB_MAPPERS.gardeningEvent) };
	}
	async bindToPlantOne(input: {
		filters: readonly GardeningEventRepositoryFilterClause[];
		plantId: string;
	}): Promise<GardeningEventEntity> {
		const row = await this.getOne({ filters: input.filters });
		const plant = await this.collection(MONGODB_COLLECTION_TYPE.PLANTS).findOne(
			{ id: input.plantId as never },
			{ session: this.tx.session },
		);
		if (!plant) this.throwNotFoundError("Plant", [{ id: input.plantId }]);
		await this.collection(MONGODB_COLLECTION_TYPE.GARDENING_EVENTS).updateOne(
			{ id: row.id },
			{ $addToSet: { plantIds: input.plantId } as never },
			{ session: this.tx.session },
		);
		return row;
	}
	async bindToLocationOne(input: {
		filters: readonly GardeningEventRepositoryFilterClause[];
		locationId: string;
	}): Promise<GardeningEventEntity> {
		const row = await this.getOne({ filters: input.filters });
		const location = await this.collection(MONGODB_COLLECTION_TYPE.LOCATIONS).findOne(
			{ id: input.locationId as never },
			{ session: this.tx.session },
		);
		if (!location) this.throwNotFoundError("Location", [{ id: input.locationId }]);
		await this.collection(MONGODB_COLLECTION_TYPE.GARDENING_EVENTS).updateOne(
			{ id: row.id },
			{ $addToSet: { locationIds: input.locationId } as never },
			{ session: this.tx.session },
		);
		return row;
	}
	async getBindingsOne(input: {
		filters: readonly GardeningEventRepositoryFilterClause[];
	}): Promise<GardeningEventRepositoryGetBindingsOutputDTO> {
		const row = await this.getOne({ filters: input.filters });
		const doc = await this.collection(MONGODB_COLLECTION_TYPE.GARDENING_EVENTS).findOne(
			{ id: row.id },
			{ session: this.tx.session },
		);
		if (!doc) this.throwNotFoundError("GardeningEvent", input.filters);
		return { plantIds: doc.plantIds as never[], locationIds: doc.locationIds as never[] };
	}
}
