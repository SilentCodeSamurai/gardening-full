import { speciesId } from "@backend/infrastructure/integrations/shared/database-ids";
import {
	RepositoryConflictError,
	RepositoryNotFoundError,
} from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import {
	fixtureCultivarCharacteristics,
	fixtureSpeciesCharacteristics,
} from "../../../../../helpers/gardening/test-fixtures";
import { resolveGardeningRepositoryPorts } from "./resolve-gardening-repository-ports";

export function registerCultivarRepositoryContract(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	describe(`CultivarRepository (${adapterLabel})`, () => {
		const wk = WorkspaceVO.globalShared().toKey();
		let speciesCategoryRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["speciesCategory"];
		let speciesRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["species"];
		let cultivarRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["cultivar"];
		let plantRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["plant"];

		beforeEach(() => {
			const ports = resolveGardeningRepositoryPorts(createContainer());
			speciesCategoryRepository = ports.speciesCategory;
			speciesRepository = ports.species;
			cultivarRepository = ports.cultivar;
			plantRepository = ports.plant;
		});

		async function seedSpecies() {
			const cat = await speciesCategoryRepository.createScoped({ dto: { title: "C", workspaceKey: wk } });
			return speciesRepository.createScoped({
				dto: {
					workspaceKey: wk,
					categoryId: cat.id,
					characteristics: fixtureSpeciesCharacteristics(),
				},
			});
		}

		it("create requires species", async () => {
			await expect(
				cultivarRepository.createScoped({
					dto: {
						workspaceKey: wk,
						speciesId: speciesId("00000000-0000-4000-8000-000000000001"),
						characteristics: fixtureCultivarCharacteristics(),
					},
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("getFullById joins species", async () => {
			const species = await seedSpecies();
			const cv = await cultivarRepository.createScoped({
				dto: {
					workspaceKey: wk,
					speciesId: species.id,
					characteristics: fixtureCultivarCharacteristics({ name: "Genovese" }),
				},
			});
			const full = await cultivarRepository.getFullByIdScoped({ workspaceKey: wk, dto: { id: cv.id } });
			expect(full.species.id).toEqual(species.id);
			expect(full.characteristics.name).toBe("Genovese");
		});

		it("getFullByIdScoped wrong workspace is not found", async () => {
			const wkB = WorkspaceVO.user("b").toKey();
			const species = await seedSpecies();
			const cv = await cultivarRepository.createScoped({
				dto: {
					workspaceKey: wk,
					speciesId: species.id,
					characteristics: fixtureCultivarCharacteristics(),
				},
			});
			await expect(cultivarRepository.getFullByIdScoped({ workspaceKey: wkB, dto: { id: cv.id } })).rejects.toBeInstanceOf(
				RepositoryNotFoundError,
			);
		});

		it("delete removes row", async () => {
			const species = await seedSpecies();
			const cv = await cultivarRepository.createScoped({
				dto: {
					workspaceKey: wk,
					speciesId: species.id,
					characteristics: fixtureCultivarCharacteristics(),
				},
			});
			await cultivarRepository.deleteByIdScoped({ workspaceKey: wk, dto: { id: cv.id } });
			await expect(
				cultivarRepository.getByIdScoped({ workspaceKey: wk, dto: { id: cv.id } }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("delete blocks when plants reference cultivar", async () => {
			const species = await seedSpecies();
			const cv = await cultivarRepository.createScoped({
				dto: {
					workspaceKey: wk,
					speciesId: species.id,
					characteristics: fixtureCultivarCharacteristics(),
				},
			});
			await plantRepository.createScoped({
				dto: {
					workspaceKey: wk,
					title: null,
					description: null,
					cultivarId: cv.id,
				},
			});
			const conflict = cultivarRepository.deleteByIdScoped({ workspaceKey: wk, dto: { id: cv.id } });
			await expect(conflict).rejects.toBeInstanceOf(RepositoryConflictError);
			await expect(conflict).rejects.toMatchObject({
				reason: "plants-reference-cultivar",
			});
		});
	});
}
