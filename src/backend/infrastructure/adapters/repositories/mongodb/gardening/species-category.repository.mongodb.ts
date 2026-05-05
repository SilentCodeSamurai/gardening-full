import type {
	SpeciesCategoryRepositoryCreateInputDTO,
	SpeciesCategoryRepositoryCreateManyInputDTO,
	SpeciesCategoryRepositoryCreateManyOutputDTO,
	SpeciesCategoryRepositoryCreateOutputDTO,
	SpeciesCategoryRepositoryDeleteManyOutputDTO,
	SpeciesCategoryRepositoryDeleteOutputDTO,
	SpeciesCategoryRepositoryFilterClause,
	SpeciesCategoryRepositoryGetManyOutputDTO,
	SpeciesCategoryRepositoryGetOneOutputDTO,
	SpeciesCategoryRepositoryPort,
	SpeciesCategoryRepositoryUpdateManyOutputDTO,
	SpeciesCategoryRepositoryUpdateOutputDTO,
	SpeciesCategoryRepositoryUpdatePatchDTO,
} from "@backend/core/application/ports/repositories/gardening/species-category.repository.port";
import type { SpeciesCategoryEntity } from "@backend/core/domain/gardening/entities";
import { TransactionManagerMongoDB } from "@backend/infrastructure/adapters/transaction/transaction-manager.mongodb";
import { MongoDBDatabaseNameToken } from "@backend/infrastructure/integrations/mongodb/injection-tokens";
import { speciesCategoryId } from "@backend/infrastructure/integrations/shared/database-ids";
import { inject, injectable } from "tsyringe";
import { BaseMongoDBRepository } from "../shared/base-mongodb.repository";
import { MONGODB_COLLECTION_TYPE } from "../shared/mongodb.constants";
import { MONGODB_MAPPERS } from "../shared/mongodb.mappers";
import type { SpeciesCategoryDoc } from "../shared/mongodb.models";

@injectable()
export class SpeciesCategoryMongoDBRepository extends BaseMongoDBRepository implements SpeciesCategoryRepositoryPort {
	constructor(
		@inject(TransactionManagerMongoDB) tx: TransactionManagerMongoDB,
		@inject(MongoDBDatabaseNameToken) databaseName: string,
	) {
		super(tx, databaseName);
	}

	async createOne(dto: SpeciesCategoryRepositoryCreateInputDTO): Promise<SpeciesCategoryRepositoryCreateOutputDTO> {
		const now = new Date();
		const doc: SpeciesCategoryDoc = {
			...dto,
			id: dto.id ?? speciesCategoryId(),
			createdAt: now,
			updatedAt: now,
			workspaceKey: dto.workspace.toKey(),
		};
		await this.collection(MONGODB_COLLECTION_TYPE.SPECIES_CATEGORIES).insertOne(doc, {
			session: this.tx.session,
		});
		return MONGODB_MAPPERS.speciesCategory(doc);
	}

	async createMany(
		input: SpeciesCategoryRepositoryCreateManyInputDTO,
	): Promise<SpeciesCategoryRepositoryCreateManyOutputDTO> {
		if (input.items.length === 0) return { count: 0 };
		const now = new Date();
		const docs: SpeciesCategoryDoc[] = input.items.map((item) => ({
			...item,
			id: item.id ?? speciesCategoryId(),
			createdAt: now,
			updatedAt: now,
			workspaceKey: item.workspace.toKey(),
		}));
		await this.collection(MONGODB_COLLECTION_TYPE.SPECIES_CATEGORIES).insertMany(docs, {
			session: this.tx.session,
		});
		return { count: input.items.length };
	}

	async getOne(input: {
		filters: readonly SpeciesCategoryRepositoryFilterClause[];
	}): Promise<SpeciesCategoryRepositoryGetOneOutputDTO> {
		const doc = await this.collection(MONGODB_COLLECTION_TYPE.SPECIES_CATEGORIES).findOne(
			this.filters(input.filters),
			{ session: this.tx.session },
		);
		if (!doc) this.throwNotFoundError("SpeciesCategory", input.filters);
		return MONGODB_MAPPERS.speciesCategory(doc);
	}

	async getMany(input?: {
		filters?: readonly SpeciesCategoryRepositoryFilterClause[];
	}): Promise<SpeciesCategoryRepositoryGetManyOutputDTO> {
		if (input?.filters === undefined) {
			const docs = await this.collection(MONGODB_COLLECTION_TYPE.SPECIES_CATEGORIES)
				.find({}, { session: this.tx.session })
				.toArray();
			return { items: docs.map(MONGODB_MAPPERS.speciesCategory) };
		}
		if (input.filters.length === 0) return { items: [] };
		const docs = await this.collection(MONGODB_COLLECTION_TYPE.SPECIES_CATEGORIES)
			.find(this.filters(input.filters), { session: this.tx.session })
			.toArray();
		return { items: docs.map(MONGODB_MAPPERS.speciesCategory) };
	}

	async updateOne(input: {
		filters: readonly SpeciesCategoryRepositoryFilterClause[];
		dto: SpeciesCategoryRepositoryUpdatePatchDTO;
	}): Promise<SpeciesCategoryRepositoryUpdateOutputDTO> {
		const row = await this.getOne({ filters: input.filters });
		const updated: SpeciesCategoryEntity = { ...row, ...input.dto, updatedAt: new Date() };
		await this.collection(MONGODB_COLLECTION_TYPE.SPECIES_CATEGORIES).replaceOne(
			{ id: row.id },
			{ ...updated, workspaceKey: updated.workspace.toKey() },
			{ session: this.tx.session },
		);
		return updated;
	}

	async updateMany(input: {
		filters: readonly SpeciesCategoryRepositoryFilterClause[];
		dto: SpeciesCategoryRepositoryUpdatePatchDTO;
	}): Promise<SpeciesCategoryRepositoryUpdateManyOutputDTO> {
		const dtoDoc = { ...input.dto } as Record<string, unknown>;
		if (input.dto.workspace !== undefined) {
			dtoDoc.workspaceKey = input.dto.workspace.toKey();
			delete dtoDoc.workspace;
		}
		dtoDoc.updatedAt = new Date();
		const result = await this.collection(MONGODB_COLLECTION_TYPE.SPECIES_CATEGORIES).updateMany(
			this.filters(input.filters),
			{ $set: dtoDoc },
			{ session: this.tx.session },
		);
		return { count: result.modifiedCount };
	}

	async deleteOne(input: {
		filters: readonly SpeciesCategoryRepositoryFilterClause[];
	}): Promise<SpeciesCategoryRepositoryDeleteOutputDTO> {
		const row = await this.getOne({ filters: input.filters });
		await this.collection(MONGODB_COLLECTION_TYPE.SPECIES_CATEGORIES).deleteOne(
			{ id: row.id },
			{ session: this.tx.session },
		);
		await this.collection(MONGODB_COLLECTION_TYPE.SPECIES).updateMany(
			{ categoryId: row.id },
			{ $set: { categoryId: null, updatedAt: new Date() } },
			{ session: this.tx.session },
		);
		return row.id;
	}

	async deleteMany(input: {
		filters: readonly SpeciesCategoryRepositoryFilterClause[];
	}): Promise<SpeciesCategoryRepositoryDeleteManyOutputDTO> {
		const rows = (await this.getMany({ filters: input.filters })).items;
		const ids = rows.map((row) => row.id);
		if (ids.length === 0) return { count: 0 };
		await this.collection(MONGODB_COLLECTION_TYPE.SPECIES_CATEGORIES).deleteMany(
			{ id: { $in: ids } },
			{ session: this.tx.session },
		);
		await this.collection(MONGODB_COLLECTION_TYPE.SPECIES).updateMany(
			{ categoryId: { $in: ids } },
			{ $set: { categoryId: null, updatedAt: new Date() } },
			{ session: this.tx.session },
		);
		return { count: ids.length };
	}
}
