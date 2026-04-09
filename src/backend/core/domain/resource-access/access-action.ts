/**
 * Operations guarded by {@link AccessControlApplicationService}.
 * `create` is required for creating new aggregate rows under an authorized scope.
 */
export type AccessAction = "read" | "create" | "update" | "delete" | "grantPermission";
