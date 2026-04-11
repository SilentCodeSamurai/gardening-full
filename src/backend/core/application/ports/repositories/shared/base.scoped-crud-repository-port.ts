import type { WorkspaceKey } from "#/backend/core/domain/access/workspace.vo";

type IdInput = {
	id: unknown;
};

/**
 * Use as the inner DTO type parameter when a scoped call carries no `dto` (only workspace scope).
 */
// biome-ignore lint/suspicious/noConfusingVoidType: intentional “no inner payload” marker for generics
export type NoScopedInnerRepositoryDto = void;

/**
 * Empty `&` operand so resolved inputs stay `{ workspaceKey: … }` / `{ workspaceKeys: … }` without
 * an index signature like `[x: string]: never` from `Record<string, never>`.
 */
// biome-ignore lint/complexity/noBannedTypes: empty object used only as an intersection operand
export type RepositoryScopedWithoutDto = {};

/**
 * Adds `dto` only when `TDTO` has fields. Otherwise the input is only `workspaceKey` / `workspaceKeys`
 * (use {@link NoScopedInnerRepositoryDto}, `undefined`, `{}`, or `Record<string, never>` for `TDTO`).
 *
 * Tuple-wrapped `extends` avoids breaking union DTOs; `unknown` still requires `{ dto: TDTO }`.
 */
export type RepositoryScopedDtoIfNeeded<TDTO> = [TDTO] extends [NoScopedInnerRepositoryDto]
	? RepositoryScopedWithoutDto
	: [TDTO] extends [undefined]
		? RepositoryScopedWithoutDto
		: [TDTO] extends [Record<string, never>]
			? RepositoryScopedWithoutDto
			: { dto: TDTO };

/** By-id reads and updates: outer `workspaceKey` scopes the row; use {@link RepositoryCreateScopedInput} for creates. */
export type RepositorySingleScopedInput<TDTO> = {
	workspaceKey: WorkspaceKey;
} & RepositoryScopedDtoIfNeeded<TDTO>;

export type RepositoryMultiScopedInput<TDTO> = {
	workspaceKeys: readonly WorkspaceKey[];
} & RepositoryScopedDtoIfNeeded<TDTO>;

/**
 * Scoped create: workspace lives only on `dto.workspaceKey` (same shape as repository `create`), not on a second wrapper field.
 */
export type RepositoryCreateScopedInput<TCreateInputDTO extends { workspaceKey: WorkspaceKey }> = {
	dto: TCreateInputDTO;
};

/**
 * Workspace-scoped persistence API: every call is constrained to one or more {@link WorkspaceKey}s so
 * adapters can express `WHERE workspace_key = …` / `IN (…)` in SQL (or the in-memory equivalent).
 *
 * **Semantics** — If a row exists but its `workspaceKey` is outside the scope passed to a method, treat it
 * like **not found** for the caller (no IDOR leak). Use cases should enforce access on that scope separately.
 *
 * **Create** — {@link createScoped} uses {@link RepositoryCreateScopedInput}: workspace is **only**
 * `input.dto.workspaceKey`, matching the unscoped `create` DTO (no duplicate outer key).
 *
 * **By-id read / update / delete** — Use {@link RepositorySingleScopedInput}: outer `workspaceKey` plus
 * `dto` with the same fields as the unscoped port (update/delete inner DTOs do **not** carry workspace).
 *
 * **List** — {@link getAllScoped} uses {@link RepositoryMultiScopedInput} with `workspaceKeys` (e.g. active
 * tenant + global shared catalog).
 *
 * @see {@link RepositoryCreateScopedInput}
 * @see {@link RepositorySingleScopedInput}
 * @see {@link RepositoryMultiScopedInput}
 * @see {@link RepositoryScopedDtoIfNeeded}
 */
export interface BaseScopedCRUDRepositoryPort<
	TCreateInputDTO extends { workspaceKey: WorkspaceKey },
	TCreateOutputDTO,
	TGetAllInputDTO,
	TGetAllOutputDTO,
	TGetByIdInputDTO extends IdInput,
	TGetByIdOutputDTO,
	TUpdateInputDTO extends IdInput,
	TUpdateOutputDTO,
	TDeleteInputDTO extends IdInput,
	TDeleteOutputDTO,
	TCreateScopedInputDTO extends RepositoryCreateScopedInput<TCreateInputDTO> = RepositoryCreateScopedInput<TCreateInputDTO>,
	TGetByIdScopedInputDTO extends RepositorySingleScopedInput<TGetByIdInputDTO> = RepositorySingleScopedInput<TGetByIdInputDTO>,
	TGetAllScopedInputDTO extends RepositoryMultiScopedInput<TGetAllInputDTO> = RepositoryMultiScopedInput<TGetAllInputDTO>,
	TUpdateScopedInputDTO extends RepositorySingleScopedInput<TUpdateInputDTO> = RepositorySingleScopedInput<TUpdateInputDTO>,
	TDeleteScopedInputDTO extends RepositorySingleScopedInput<TDeleteInputDTO> = RepositorySingleScopedInput<TDeleteInputDTO>,
> {
	/** Insert a row; target workspace is `input.dto.workspaceKey` only. */
	createScoped(input: TCreateScopedInputDTO): Promise<TCreateOutputDTO>;

	/** List rows whose `workspaceKey` is in `input.workspaceKeys` (optional inner `dto` per {@link RepositoryScopedDtoIfNeeded}). */
	getAllScoped(input: TGetAllScopedInputDTO): Promise<TGetAllOutputDTO>;

	/** Load by id only if the row’s workspace matches `input.workspaceKey`; otherwise not found. */
	getByIdScoped(input: TGetByIdScopedInputDTO): Promise<TGetByIdOutputDTO>;

	/** Patch by id only if the row’s workspace matches `input.workspaceKey`; otherwise not found. */
	updateByIdScoped(input: TUpdateScopedInputDTO): Promise<TUpdateOutputDTO>;

	/** Delete by id only if the row’s workspace matches `input.workspaceKey`; otherwise not found. */
	deleteByIdScoped(input: TDeleteScopedInputDTO): Promise<TDeleteOutputDTO>;
}
