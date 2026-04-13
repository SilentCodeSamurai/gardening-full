import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
// import { drizzleAdapter } from "better-auth/adapters/drizzle";
// import { db } from "#/backend/infrastructure/integrations/drizzle";
// import * as schema from "#/backend/infrastructure/integrations/drizzle/schema";

import { grantDefaultPermissionsOnOrganizationCreated } from "./grant-default-permissions-on-organization-created";
import { grantDefaultPermissionsOnUserCreated } from "./grant-default-permissions-on-user-created";

export const betterAuthBackendClient = betterAuth({
	/**
	 * TODO: Uncomment this when we have a database.
	 */
	// database: drizzleAdapter(db, {
	// 	provider: "pg",
	// 	schema,
	// }),
	plugins: [
		organization({
			organizationHooks: {
				afterCreateOrganization: async (data) => {
					await grantDefaultPermissionsOnOrganizationCreated(data);
				},
			},
		}),
	],
	emailAndPassword: {
		enabled: true,
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					await grantDefaultPermissionsOnUserCreated(user);
				},
			},
		},
	},
});
