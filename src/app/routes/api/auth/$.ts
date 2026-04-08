import { createFileRoute } from "@tanstack/react-router";
import { betterAuthBackendClient } from "#/backend/infrastructure/integrations/better-auth/client";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }) => betterAuthBackendClient.handler(request),
			POST: ({ request }) => betterAuthBackendClient.handler(request),
		},
	},
});
