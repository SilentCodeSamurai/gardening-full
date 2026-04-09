import { createAuthClient } from "better-auth/react";

function resolveAuthBaseUrl(): string {
	if (typeof window !== "undefined") {
		return `${window.location.origin}/api/auth`;
	}
	const origin = import.meta.env.VITE_APP_URL ?? "http://localhost:3000";
	return `${origin}/api/auth`;
}

export const authClient = createAuthClient({
	baseURL: resolveAuthBaseUrl(),
});
