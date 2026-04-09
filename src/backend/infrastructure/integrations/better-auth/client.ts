import { betterAuth } from "better-auth";
// import { drizzleAdapter } from "better-auth/adapters/drizzle";
// import { db } from "#/backend/infrastructure/integrations/drizzle";
// import * as schema from "#/backend/infrastructure/integrations/drizzle/schema";

import { grantDefaultWorkspaceOnUserCreated } from "./grant-default-workspace-on-user-created";

export const betterAuthBackendClient = betterAuth({
	/**
	 * TODO: Uncomment this when we have a database.
	 */
	// database: drizzleAdapter(db, {
	// 	provider: "pg",
	// 	schema,
	// }),
	emailAndPassword: {
		enabled: true,
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					await grantDefaultWorkspaceOnUserCreated({ id: user.id });
				},
			},
		},
	},
});
