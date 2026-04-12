import type { WorkspaceKey } from "@backend/core/domain/access/workspace.vo";

export function workspaceKeysEqual(a: WorkspaceKey, b: WorkspaceKey): boolean {
	return String(a) === String(b);
}
