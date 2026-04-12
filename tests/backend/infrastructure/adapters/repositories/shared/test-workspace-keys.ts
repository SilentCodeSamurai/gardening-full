import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";

/** Stable workspace key for repository contract tests (v2 + v1 adapters). */
export const contractTestWorkspaceKey = WorkspaceVO.globalShared().toKey();

/** Second workspace for cross-workspace filter / AND-clause contract tests. */
export const contractTestWorkspaceKeyB = WorkspaceVO.org("repo-contract-ws-b").toKey();
