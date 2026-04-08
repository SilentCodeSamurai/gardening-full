import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "#/backend/infrastructure/integrations/drizzle";
import * as schema from "#/backend/infrastructure/integrations/drizzle/schema";

export const betterAuthBackendClient = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	emailAndPassword: {
		enabled: true,
	},
});
