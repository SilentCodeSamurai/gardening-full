import type { BaseEntity, BaseEntityId } from "@backend/core/domain/shared/entities";
import type { RepositoryNotFoundError } from "#/backend/core/application/ports/repositories/shared/base-repository.errors";

// ---------------------------------------------------------------------------
// Re-exports — entity DTO helpers (same shapes as `./types`, single import path)
// ---------------------------------------------------------------------------

export type {
	BaseRepositoryCreateInputDTO,
	BaseRepositoryIdActionInputDTO,
	BaseRepositoryUpdateInputDTO,
} from "#/backend/core/application/ports/repositories/shared/types";

// ---------------------------------------------------------------------------
// Filter primitives — OR lists (`filters` matches if **any** clause matches; empty list: adapter-defined)
// ---------------------------------------------------------------------------

/**
 * One branch of a {@link RepositoryOrFilterList}: a partial record of fields to match.
 *
 * Prefer {@link RepositoryEntityFilterClause} when the row shape is an entity so excluded columns stay consistent.
 */
export type RepositoryFilterClause = Record<string, unknown>;

/**
 * Ordered list of alternative filter clauses. Matching semantics: **OR** across elements — a row matches if it
 * satisfies **at least one** clause.
 *
 * Empty list (`[]`): adapter-defined (often matches no rows); document on concrete adapters.
 */
export type RepositoryOrFilterList<TFilterClause> = readonly TFilterClause[];

/**
 * Required OR `filters` on the input. Used by {@link RepositoryGetOnePort#getOne}, updates, and deletes where
 * the caller must identify target row(s) by criteria.
 *
 * @property filters - {@link RepositoryOrFilterList} of clauses; a row matches if it matches any clause.
 */
export type WithRequiredRepositoryFilters<TFilterClause> = {
	filters: RepositoryOrFilterList<TFilterClause>;
};

/**
 * Optional OR `filters` for {@link RepositoryGetManyPort#getMany} only.
 *
 * - If {@link RepositoryGetManyPort#getMany} is called with no argument, or `input` has no `filters`, or
 *   `filters` is `undefined`, the adapter returns **all** rows it exposes for the current context (still subject
 *   to any implicit scope such as tenant or workspace — document per adapter).
 * - If `filters` is set, rows must match **any** clause (same OR semantics as {@link RepositoryOrFilterList}).
 * - If `filters` is `[]`, behavior is adapter-defined (often zero rows); document on concrete adapters.
 *
 * @property filters - Optional {@link RepositoryOrFilterList}; omit or leave `undefined` for an unfiltered list.
 */
export type WithOptionalRepositoryFilters<TFilterClause> = {
	filters?: RepositoryOrFilterList<TFilterClause>;
};

// ---------------------------------------------------------------------------
// Entity-aligned types (filter clauses + update patches)
// ---------------------------------------------------------------------------

/**
 * Fields allowed in a single OR branch when matching an entity-shaped row.
 *
 * Excluded keys (e.g. audit columns) are omitted from the clause shape so callers do not filter on timestamps
 * unless they extend exclusions explicitly.
 */
export type RepositoryEntityFilterClause<
	TEntity extends BaseEntity<BaseEntityId<unknown, string>>,
	TExcludedFromClause extends keyof TEntity = never,
> = Partial<Omit<TEntity, TExcludedFromClause>>;

/**
 * Patch body for {@link RepositoryUpdateOnePort#updateOne} and {@link RepositoryUpdateManyPort#updateMany}.
 *
 * Always omits `id`, `createdAt`, and `updatedAt`; identity and row targeting belong in `filters` only
 * ({@link WithRequiredRepositoryFilters}).
 */
export type RepositoryUpdatePatchDto<
	TEntity extends BaseEntity<BaseEntityId<unknown, string>>,
	TExtraExcluded extends keyof TEntity = never,
> = Partial<Omit<TEntity, TExtraExcluded | "id" | "createdAt" | "updatedAt">>;

/**
 * Constrains update `dto` types: if `T` includes an `id` property key, this type becomes `never` so call sites
 * that pass entity-shaped objects with `id` fail type-checking.
 */
export type RepositoryUpdateDtoWithoutId<T> = [Extract<keyof T, "id">] extends [never] ? T : never;

// ---------------------------------------------------------------------------
// Ports — Create
// ---------------------------------------------------------------------------

export interface RepositoryCreateOnePort<TCreateInputDTO, TCreateOutputDTO> {
	/**
	 * Insert a single row.
	 *
	 * @param dto - {@link TCreateInputDTO} — payload for the new row (shape is concrete-port-specific).
	 * @returns output {@link TCreateOutputDTO} — the persisted row, including generated ids and timestamps as defined by the adapter.
	 */
	createOne(dto: TCreateInputDTO): Promise<TCreateOutputDTO>;
}

export interface RepositoryCreateManyPort<TCreateManyInputDTO, TCreateManyOutputDTO> {
	/**
	 * Insert multiple rows in one operation. Input and output are DTO-only (no OR `filters` on this port).
	 *
	 * @param input - {@link TCreateManyInputDTO} — batch payload (e.g. list of create bodies); exact shape is concrete-port-specific.
	 * @returns output {@link TCreateManyOutputDTO} — e.g. count or created rows; document on concrete ports.
	 */
	createMany(input: TCreateManyInputDTO): Promise<TCreateManyOutputDTO>;
}

// ---------------------------------------------------------------------------
// Ports — Read (getOne: required filters; getMany: optional filters)
// ---------------------------------------------------------------------------

export interface RepositoryGetOnePort<TFilterClause, TGetOneOutputDTO> {
	/**
	 * Load exactly one row. Input is **only** required OR `filters` (e.g. `[{ id, workspaceKey }]`).
	 *
	 * @throws error {@link RepositoryNotFoundError} when no row matches any clause (unless the adapter documents otherwise).
	 * @param input - {@link WithRequiredRepositoryFilters}
	 * - {@link RepositoryOrFilterList `filters`} — clauses combined with OR; typically one clause identifies a unique row.
	 * @returns output {@link TGetOneOutputDTO} — the matched row.
	 */
	getOne(input: WithRequiredRepositoryFilters<TFilterClause>): Promise<TGetOneOutputDTO>;
}

export interface RepositoryGetManyPort<TFilterClause, TGetManyOutputDTO> {
	/**
	 * Load zero or more rows. `filters` is **optional**: omit the argument, omit `filters`, or pass `filters: undefined`
	 * to request **all** rows the adapter returns for the current context (still subject to implicit scope such as
	 * tenant — document per adapter). When `filters` is set, OR semantics apply ({@link RepositoryOrFilterList}).
	 *
	 * @param input - Optional {@link WithOptionalRepositoryFilters}
	 * - {@link RepositoryOrFilterList `filters`} — optional; if missing or `undefined`, unfiltered list (“get all” within adapter scope).
	 * @returns output {@link TGetManyOutputDTO} — container of rows; if none match, an empty list is typical (document on concrete ports).
	 */
	getMany(input?: WithOptionalRepositoryFilters<TFilterClause>): Promise<TGetManyOutputDTO>;
}

// ---------------------------------------------------------------------------
// Ports — Update (required filters + patch dto + output)
// ---------------------------------------------------------------------------

export interface RepositoryUpdateOnePort<TFilterClause, TUpdateDto, TUpdateOutputDTO> {
	/**
	 * Patch row(s) matching any clause in required OR `filters`. The patch must not include `id`
	 * ({@link RepositoryUpdateDtoWithoutId}, {@link RepositoryUpdatePatchDto}).
	 *
	 * @throws error {@link RepositoryNotFoundError} when no row matches any clause (unless the adapter documents multi-row or upsert behavior).
	 * @param input - Combines {@link WithRequiredRepositoryFilters} with a patch body:
	 * - {@link RepositoryOrFilterList `filters`} — OR clauses that identify the row(s) to update.
	 * - `dto` — {@link RepositoryUpdateDtoWithoutId} fields to merge; must not contain `id`.
	 * @returns output {@link TUpdateOutputDTO} — often the updated row; exact shape is concrete-port-specific.
	 */
	updateOne(
		input: WithRequiredRepositoryFilters<TFilterClause> & {
			dto: RepositoryUpdateDtoWithoutId<TUpdateDto>;
		},
	): Promise<TUpdateOutputDTO>;
}

export interface RepositoryUpdateManyPort<TFilterClause, TUpdateDto, TUpdateManyOutputDTO = { count: number }> {
	/**
	 * Patch **all** rows matching any clause in required OR `filters`. The same `dto` is applied to every
	 * affected row; `dto` must not include `id`.
	 *
	 * @param input - Combines {@link WithRequiredRepositoryFilters} with a patch body:
	 * - {@link RepositoryOrFilterList `filters`} — OR clauses that identify the set of rows to update.
	 * - `dto` — {@link RepositoryUpdateDtoWithoutId} patch applied to each matching row.
	 * @returns output {@link TUpdateManyOutputDTO} — typically `{ count: number }` of rows updated; exact shape is concrete-port-specific.
	 */
	updateMany(
		input: WithRequiredRepositoryFilters<TFilterClause> & {
			dto: RepositoryUpdateDtoWithoutId<TUpdateDto>;
		},
	): Promise<TUpdateManyOutputDTO>;
}

// ---------------------------------------------------------------------------
// Ports — Delete (required filters + output)
// ---------------------------------------------------------------------------

export interface RepositoryDeleteOnePort<TFilterClause, TDeleteOutputDTO> {
	/**
	 * Delete row(s) matching any clause in required OR `filters`. Usually one clause targets a single row.
	 *
	 * @throws error {@link RepositoryNotFoundError} when no row matches any clause.
	 * @param input - {@link WithRequiredRepositoryFilters}
	 * - {@link RepositoryOrFilterList `filters`} — OR clauses identifying row(s) to remove.
	 * @returns output {@link TDeleteOutputDTO} — e.g. deleted id or void; document on concrete ports.
	 */
	deleteOne(input: WithRequiredRepositoryFilters<TFilterClause>): Promise<TDeleteOutputDTO>;
}

export interface RepositoryDeleteManyPort<TFilterClause, TDeleteManyOutputDTO = { count: number }> {
	/**
	 * Delete **all** rows matching any clause in required OR `filters`.
	 *
	 * @param input - {@link WithRequiredRepositoryFilters}
	 * - {@link RepositoryOrFilterList `filters`} — OR clauses identifying the set of rows to remove.
	 * @returns output {@link TDeleteManyOutputDTO} — typically `{ count: number }` of rows removed; exact shape is concrete-port-specific.
	 */
	deleteMany(input: WithRequiredRepositoryFilters<TFilterClause>): Promise<TDeleteManyOutputDTO>;
}
