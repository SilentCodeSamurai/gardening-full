/**
 * A base entity id type. The brand is used to distinguish between different types of entities.
 * @template TIdType - The type of the id.
 * @template TEntityName - The name of the entity.
 */
export type BaseEntityId<TIdType = unknown, TEntityName extends string = string> = TIdType & {
	__brand: TEntityName;
};

/**
 * A base entity type.
 * Includes the entity id, createdAt timestamp, and updatedAt timestamp.
 * @template TEntityId - The type of the entity id.
 */
export interface BaseEntity<TEntityId extends BaseEntityId> {
	id: TEntityId;
	createdAt: Date;
	updatedAt: Date;
}
