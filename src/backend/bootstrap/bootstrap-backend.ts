import { populateData } from "./populate-data";

/**
 * Full backend startup: database connection, migrations, and other infrastructure,
 * then {@link populateData}.
 */
export async function bootstrap(): Promise<void> {
	// TODO: Connect database, run migrations, wire Drizzle / connection pool, etc.

	const result = await populateData();

	if (result.status === "populated") {
		console.info(
			`[bootstrap] Default catalog populated (${result.createdCategories} categories, ${result.createdSpecies} species).`,
		);
	} else {
		console.info("[bootstrap] Default catalog skipped (catalog already has data).");
	}
}
