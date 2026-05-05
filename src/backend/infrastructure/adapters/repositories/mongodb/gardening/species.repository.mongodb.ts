import type {
	SpeciesRepositoryCreateInputDTO,
	SpeciesRepositoryCreateManyInputDTO,
	SpeciesRepositoryCreateManyOutputDTO,
	SpeciesRepositoryCreateOutputDTO,
	SpeciesRepositoryDeleteManyOutputDTO,
	SpeciesRepositoryDeleteOutputDTO,
	SpeciesRepositoryFilterClause,
	SpeciesRepositoryGetManyOutputDTO,
	SpeciesRepositoryGetOneOutputDTO,
	SpeciesRepositoryPort,
	SpeciesRepositoryUpdateManyOutputDTO,
	SpeciesRepositoryUpdateOutputDTO,
	SpeciesRepositoryUpdatePatchDTO,
} from "@backend/core/application/ports/repositories/gardening/species.repository.port";
import { TransactionManagerMongoDB } from "@backend/infrastructure/adapters/transaction/transaction-manager.mongodb";
import { MongoDBDatabaseNameToken } from "@backend/infrastructure/integrations/mongodb/injection-tokens";
import { speciesId } from "@backend/infrastructure/integrations/shared/database-ids";
import { inject, injectable } from "tsyringe";
import { BaseMongoDBRepository } from "../shared/base-mongodb.repository";
import { MONGODB_COLLECTION_TYPE } from "../shared/mongodb.constants";
import { MONGODB_MAPPERS } from "../shared/mongodb.mappers";
import type { SpeciesDoc } from "../shared/mongodb.models";

@injectable()
export class SpeciesMongoDBRepository extends BaseMongoDBRepository implements SpeciesRepositoryPort {
	constructor(
		@inject(TransactionManagerMongoDB) tx: TransactionManagerMongoDB,
		@inject(MongoDBDatabaseNameToken) databaseName: string,
	) {
		super(tx, databaseName);
	}

	async createOne(dto: SpeciesRepositoryCreateInputDTO): Promise<SpeciesRepositoryCreateOutputDTO> {
		if (dto.categoryId !== null) {
			const found = await this.collection(MONGODB_COLLECTION_TYPE.SPECIES_CATEGORIES).findOne(
				{ id: dto.categoryId },
				{ session: this.tx.session },
			);
			if (!found) this.throwNotFoundError("SpeciesCategory", [{ id: dto.categoryId }]);
		}
		const now = new Date();
		const doc: SpeciesDoc = {
			...dto,
			id: dto.id ?? speciesId(),
			createdAt: now,
			updatedAt: now,
			workspaceKey: dto.workspace.toKey(),
		};
		await this.collection(MONGODB_COLLECTION_TYPE.SPECIES).insertOne(doc, { session: this.tx.session });
		return MONGODB_MAPPERS.species(doc);
	}

	async createMany(input: SpeciesRepositoryCreateManyInputDTO): Promise<SpeciesRepositoryCreateManyOutputDTO> {
		if (input.items.length === 0) return { count: 0 };
		for (const item of input.items) {
			if (item.categoryId !== null) {
				const found = await this.collection(MONGODB_COLLECTION_TYPE.SPECIES_CATEGORIES).findOne(
					{ id: item.categoryId },
					{ session: this.tx.session },
				);
				if (!found) this.throwNotFoundError("SpeciesCategory", [{ id: item.categoryId }]);
			}
		}
		const now = new Date();
		const docs: SpeciesDoc[] = input.items.map((item) => ({
			...item,
			id: item.id ?? speciesId(),
			createdAt: now,
			updatedAt: now,
			workspaceKey: item.workspace.toKey(),
		}));
		await this.collection(MONGODB_COLLECTION_TYPE.SPECIES).insertMany(docs, { session: this.tx.session });
		return { count: input.items.length };
	}

	async getOne(input: {
		filters: readonly SpeciesRepositoryFilterClause[];
	}): Promise<SpeciesRepositoryGetOneOutputDTO> {
		const doc = await this.collection(MONGODB_COLLECTION_TYPE.SPECIES).findOne(this.filters(input.filters), {
			session: this.tx.session,
		});
		if (!doc) this.throwNotFoundError("Species", input.filters);
		return MONGODB_MAPPERS.species(doc);
	}

	async getMany(input?: {
		filters?: readonly SpeciesRepositoryFilterClause[];
	}): Promise<SpeciesRepositoryGetManyOutputDTO> {
		if (input?.filters === undefined) {
			const docs = await this.collection(MONGODB_COLLECTION_TYPE.SPECIES)
				.find({}, { session: this.tx.session })
				.toArray();
			return { items: docs.map(MONGODB_MAPPERS.species) };
		}
		if (input.filters.length === 0) return { items: [] };
		const docs = await this.collection(MONGODB_COLLECTION_TYPE.SPECIES)
			.find(this.filters(input.filters), { session: this.tx.session })
			.toArray();
		return { items: docs.map(MONGODB_MAPPERS.species) };
	}

	async updateOne(input: {
		filters: readonly SpeciesRepositoryFilterClause[];
		dto: SpeciesRepositoryUpdatePatchDTO;
	}): Promise<SpeciesRepositoryUpdateOutputDTO> {
		const row = await this.getOne({ filters: input.filters });
		const updated = { ...row, ...input.dto, updatedAt: new Date() };
		if (updated.categoryId !== null) {
			const found = await this.collection(MONGODB_COLLECTION_TYPE.SPECIES_CATEGORIES).findOne(
				{ id: updated.categoryId },
				{ session: this.tx.session },
			);
			if (!found) this.throwNotFoundError("SpeciesCategory", [{ id: updated.categoryId }]);
		}
		await this.collection(MONGODB_COLLECTION_TYPE.SPECIES).replaceOne(
			{ id: row.id },
			{ ...updated, workspaceKey: updated.workspace.toKey() },
			{ session: this.tx.session },
		);
		return updated;
	}

	async updateMany(input: {
		filters: readonly SpeciesRepositoryFilterClause[];
		dto: SpeciesRepositoryUpdatePatchDTO;
	}): Promise<SpeciesRepositoryUpdateManyOutputDTO> {
		if (input.dto.categoryId !== undefined && input.dto.categoryId !== null) {
			const found = await this.collection(MONGODB_COLLECTION_TYPE.SPECIES_CATEGORIES).findOne(
				{ id: input.dto.categoryId },
				{ session: this.tx.session },
			);
			if (!found) this.throwNotFoundError("SpeciesCategory", [{ id: input.dto.categoryId }]);
		}
		const dtoDoc = { ...input.dto } as Record<string, unknown>;
		if (input.dto.workspace !== undefined) {
			dtoDoc.workspaceKey = input.dto.workspace.toKey();
			delete dtoDoc.workspace;
		}
		dtoDoc.updatedAt = new Date();
		const result = await this.collection(MONGODB_COLLECTION_TYPE.SPECIES).updateMany(
			this.filters(input.filters),
			{ $set: dtoDoc },
			{ session: this.tx.session },
		);
		return { count: result.modifiedCount };
	}

	async deleteOne(input: {
		filters: readonly SpeciesRepositoryFilterClause[];
	}): Promise<SpeciesRepositoryDeleteOutputDTO> {
		const row = await this.getOne({ filters: input.filters });
		await this.collection(MONGODB_COLLECTION_TYPE.SPECIES).deleteOne({ id: row.id }, { session: this.tx.session });
		await this.collection(MONGODB_COLLECTION_TYPE.CULTIVARS).updateMany(
			{ speciesId: row.id },
			{ $set: { speciesId: null, updatedAt: new Date() } },
			{ session: this.tx.session },
		);
		return row.id;
	}

	async deleteMany(input: {
		filters: readonly SpeciesRepositoryFilterClause[];
	}): Promise<SpeciesRepositoryDeleteManyOutputDTO> {
		const rows = (await this.getMany({ filters: input.filters })).items;
		const ids = rows.map((row) => row.id);
		if (ids.length === 0) return { count: 0 };
		await this.collection(MONGODB_COLLECTION_TYPE.SPECIES).deleteMany(
			{ id: { $in: ids } },
			{ session: this.tx.session },
		);
		await this.collection(MONGODB_COLLECTION_TYPE.CULTIVARS).updateMany(
			{ speciesId: { $in: ids } },
			{ $set: { speciesId: null, updatedAt: new Date() } },
			{ session: this.tx.session },
		);
		return { count: ids.length };
	}
}
