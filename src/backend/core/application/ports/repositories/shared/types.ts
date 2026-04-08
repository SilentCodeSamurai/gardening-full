import type { BaseEntity, BaseEntityId } from "@backend/core/domain/shared/entities";

/**
 * A base repository create input DTO.
 *
 * `id`, `createdAt`, and `updatedAt` are always excluded.
 *
 * @template TEntity - The entity type.
 * @template TExcludedFields - Fields of the entity that are excluded from the create.
 */
export type BaseRepositoryCreateInputDTO<
	TEntity extends BaseEntity<BaseEntityId<unknown, string>>,
	TExcludedFields extends keyof TEntity = "id" | "createdAt" | "updatedAt",
> = Omit<TEntity, TExcludedFields | "id" | "createdAt" | "updatedAt">;

/**
 * A base repository update input DTO.
 *
 * `id` is required to define the entity to update.
 *
 * `createdAt`, and `updatedAt` are always excluded.
 *
 * @template TEntity - The entity type.
 * @template TExcludedFields - Fields of the entity that are excluded from the update.
 */
export type BaseRepositoryUpdateInputDTO<
	TEntity extends BaseEntity<BaseEntityId<unknown, string>>,
	TExcludedFields extends keyof TEntity | undefined = undefined,
> = {
	id: TEntity["id"];
} & Partial<
	Omit<
		TEntity,
		TExcludedFields extends undefined
			? "id" | "createdAt" | "updatedAt"
			: TExcludedFields | "id" | "createdAt" | "updatedAt"
	>
>;

/**
 * A base repository id action input DTO.
 *
 * Contains the `id` of the entity to perform an action on.
 *
 * @template TEntity - The entity type.
 */
export interface BaseRepositoryIdActionInputDTO<TEntity extends BaseEntity<BaseEntityId<unknown, string>>> {
	id: TEntity["id"];
}
