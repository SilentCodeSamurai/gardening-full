import { CultivarRepositoryPortToken } from "@backend/core/application/ports/repositories/gardening/cultivar.repository.port";
import { SpeciesCategoryRepositoryPortToken } from "@backend/core/application/ports/repositories/gardening/species-category.repository.port";
import { SpeciesRepositoryPortToken } from "@backend/core/application/ports/repositories/gardening/species.repository.port";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { DependencyContainer } from "tsyringe";

import { fixtureCultivarCharacteristics, fixtureSpeciesCharacteristics } from "./test-fixtures";

/** Minimal catalog: category → species → cultivar (via repository ports only). */
export async function seedMinimalCatalog(
	c: DependencyContainer,
	workspace: ReturnType<typeof WorkspaceVO.globalShared> = WorkspaceVO.globalShared(),
) {
	const speciesCategoryRepository = c.resolve(SpeciesCategoryRepositoryPortToken);
	const speciesRepository = c.resolve(SpeciesRepositoryPortToken);
	const cultivarRepository = c.resolve(CultivarRepositoryPortToken);
	const category = await speciesCategoryRepository.createOne({
		title: "Test category",
		workspace,
	});
	const species = await speciesRepository.createOne({
		workspace,
		categoryId: category.id,
		characteristics: fixtureSpeciesCharacteristics(),
	});
	const cultivar = await cultivarRepository.createOne({
		workspace,
		speciesId: species.id,
		characteristics: fixtureCultivarCharacteristics(),
	});

	return { category, species, cultivar };
}
