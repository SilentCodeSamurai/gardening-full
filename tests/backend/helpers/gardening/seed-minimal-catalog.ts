import type { CultivarRepositoryPort } from "@backend/core/application/ports/repositories/gardening/cultivar.repositort.port";
import type { SpeciesCategoryRepositoryPort } from "@backend/core/application/ports/repositories/gardening/species-category.repository.port";
import type { SpeciesRepositoryPort } from "@backend/core/application/ports/repositories/gardening/species.repository.port";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import { TOKENS } from "@backend/di/tokens";
import type { DependencyContainer } from "tsyringe";

import { fixtureCultivarCharacteristics, fixtureSpeciesCharacteristics } from "./test-fixtures";

/** Minimal catalog: category → species → cultivar (via repository ports only). */
export async function seedMinimalCatalog(c: DependencyContainer) {
	const speciesCategoryRepository = c.resolve<SpeciesCategoryRepositoryPort>(
		TOKENS.SpeciesCategoryRepositoryPort,
	);
	const speciesRepository = c.resolve<SpeciesRepositoryPort>(TOKENS.SpeciesRepositoryPort);
	const cultivarRepository = c.resolve<CultivarRepositoryPort>(TOKENS.CultivarRepositoryPort);

	const workspaceKey = WorkspaceVO.globalShared().toKey();
	const category = await speciesCategoryRepository.createScoped({
		dto: { title: "Test category", workspaceKey },
	});
	const species = await speciesRepository.createScoped({
		dto: {
			workspaceKey,
			categoryId: category.id,
			characteristics: fixtureSpeciesCharacteristics(),
		},
	});
	const cultivar = await cultivarRepository.createScoped({
		dto: {
			workspaceKey,
			speciesId: species.id,
			characteristics: fixtureCultivarCharacteristics(),
		},
	});

	return { category, species, cultivar };
}
