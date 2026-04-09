import type { AccessAction } from "./access-action";

export type AccessRole = "viewer" | "editor" | "admin";

const ROLE_ACTIONS: Record<AccessRole, ReadonlySet<AccessAction>> = {
	viewer: new Set(["read"]),
	editor: new Set(["read", "create", "update"]),
	admin: new Set(["read", "create", "update", "delete", "grantPermission"]),
};

export function accessRoleAllows(role: AccessRole, action: AccessAction): boolean {
	return ROLE_ACTIONS[role].has(action);
}

export function accessRoleOrder(role: AccessRole): number {
	switch (role) {
		case "viewer":
			return 0;
		case "editor":
			return 1;
		case "admin":
			return 2;
	}
}
