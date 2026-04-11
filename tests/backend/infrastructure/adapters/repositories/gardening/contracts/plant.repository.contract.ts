import { cultivarId, plantId } from "@backend/infrastructure/integrations/shared/database-ids";
import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import {
	fixtureCultivarCharacteristics,
	fixtureNoteAction,
	fixtureSpeciesCharacteristics,
} from "../../../../../helpers/gardening/test-fixtures";
import { resolveGardeningRepositoryPorts } from "./resolve-gardening-repository-ports";

export function registerPlantRepositoryContract(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	describe(`PlantRepository (${adapterLabel})`, () => {
		const wk = WorkspaceVO.globalShared().toKey();
		let speciesCategoryRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["speciesCategory"];
		let speciesRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["species"];
		let cultivarRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["cultivar"];
		let plantRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["plant"];
		let gardeningEventRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["gardeningEvent"];

		beforeEach(() => {
			const ports = resolveGardeningRepositoryPorts(createContainer());
			speciesCategoryRepository = ports.speciesCategory;
			speciesRepository = ports.species;
			cultivarRepository = ports.cultivar;
			plantRepository = ports.plant;
			gardeningEventRepository = ports.gardeningEvent;
		});

		async function seedAndCultivar() {
			const cat = await speciesCategoryRepository.createScoped({ dto: { title: "C", workspaceKey: wk } });
			const species = await speciesRepository.createScoped({
				dto: {
					workspaceKey: wk,
					categoryId: cat.id,
					characteristics: fixtureSpeciesCharacteristics(),
				},
			});
			const cultivar = await cultivarRepository.createScoped({
				dto: {
					workspaceKey: wk,
					speciesId: species.id,
					characteristics: fixtureCultivarCharacteristics(),
				},
			});
			return { cultivar, species };
		}

		it("create requires cultivar row to exist", async () => {
			await seedAndCultivar();
			const ghostCultivarId = cultivarId("00000000-0000-4000-8000-00000000dead");
			await expect(
				plantRepository.createScoped({
					dto: {
						workspaceKey: wk,
						title: null,
						description: null,
						cultivarId: ghostCultivarId,
					},
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("createMany reuses species/cultivar and produces distinct ids", async () => {
			const { cultivar } = await seedAndCultivar();
			const { items } = await plantRepository.createManyScoped({
				dto: {
					rows: [
						{ workspaceKey: wk, title: null, description: null, cultivarId: cultivar.id },
						{ workspaceKey: wk, title: null, description: null, cultivarId: cultivar.id },
						{ workspaceKey: wk, title: null, description: null, cultivarId: cultivar.id },
					],
				},
			});
			expect(items).toHaveLength(3);
			const ids = new Set(items.map((p) => p.id as string));
			expect(ids.size).toBe(3);
			expect(items.every((p) => p.cultivar.species.id === cultivar.speciesId)).toBe(true);
			expect(items.every((p) => p.cultivar.id === cultivar.id)).toBe(true);
		});

		it("createMany persists the supplied rows as-is", async () => {
			const { cultivar } = await seedAndCultivar();
			const { items } = await plantRepository.createManyScoped({
				dto: {
					rows: [
						{ workspaceKey: wk, title: "Patch #5", description: null, cultivarId: cultivar.id },
						{ workspaceKey: wk, title: "Patch #6", description: null, cultivarId: cultivar.id },
					],
				},
			});
			expect(items.map((p) => p.title)).toEqual(["Patch #5", "Patch #6"]);
		});

		it("getListByIds preserves input order and skips missing", async () => {
			const { cultivar } = await seedAndCultivar();
			const a = await plantRepository.createScoped({
				dto: { workspaceKey: wk, title: "a", description: null, cultivarId: cultivar.id },
			});
			const b = await plantRepository.createScoped({
				dto: { workspaceKey: wk, title: "b", description: null, cultivarId: cultivar.id },
			});
			const missing = plantId("00000000-0000-4000-8000-00000000aaaa");
			const { items } = await plantRepository.getListByIdsScoped({
				workspaceKeys: [wk],
				dto: { ids: [b.id, missing, a.id] },
			});
			expect(items.map((p) => p.title)).toEqual(["b", "a"]);
		});

		it("getByCultivarIdScoped", async () => {
			const { cultivar } = await seedAndCultivar();
			await plantRepository.createScoped({
				dto: { workspaceKey: wk, title: "p1", description: null, cultivarId: cultivar.id },
			});
			const byCultivar = await plantRepository.getByCultivarIdScoped({
				workspaceKeys: [wk],
				dto: { cultivarId: cultivar.id },
			});
			expect(byCultivar.items).toHaveLength(1);
		});

		it("getByIdScoped hides plant when workspace key does not match row", async () => {
			const { cultivar } = await seedAndCultivar();
			const plantWk = WorkspaceVO.user("plant-owner").toKey();
			const plant = await plantRepository.createScoped({
				dto: {
					workspaceKey: plantWk,
					title: "isolated",
					description: null,
					cultivarId: cultivar.id,
				},
			});
			await expect(
				plantRepository.getByIdScoped({ workspaceKey: wk, dto: { id: plant.id } }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
			await expect(
				plantRepository.getByIdScoped({ workspaceKey: plantWk, dto: { id: plant.id } }),
			).resolves.toMatchObject({ id: plant.id });
		});

		it("update with new cultivar requires cultivar to exist", async () => {
			const { cultivar } = await seedAndCultivar();
			const plant = await plantRepository.createScoped({
				dto: { workspaceKey: wk, title: null, description: null, cultivarId: cultivar.id },
			});
			await expect(
				plantRepository.updateByIdScoped({
					workspaceKey: wk,
					dto: {
						id: plant.id,
						cultivarId: cultivarId("00000000-0000-4000-8000-00000000beef"),
					},
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("delete clears gardening event↔plant links and removes the plant", async () => {
			const { cultivar } = await seedAndCultivar();
			const plant = await plantRepository.createScoped({
				dto: { workspaceKey: wk, title: null, description: null, cultivarId: cultivar.id },
			});
			const ev = await gardeningEventRepository.createScoped({
				dto: { workspaceKey: wk, action: fixtureNoteAction() },
			});
			await gardeningEventRepository.bindToPlantScoped({
				workspaceKey: wk,
				dto: { id: ev.id, plantId: plant.id },
			});
			const before = await gardeningEventRepository.getBindingsForEventScoped({
				workspaceKey: wk,
				dto: { id: ev.id },
			});
			expect(before.plantIds.map((id) => id as string)).toContain(plant.id as string);

			await plantRepository.deleteByIdScoped({ workspaceKey: wk, dto: { id: plant.id } });

			await expect(
				plantRepository.getByIdScoped({ workspaceKey: wk, dto: { id: plant.id } }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
			const after = await gardeningEventRepository.getBindingsForEventScoped({
				workspaceKey: wk,
				dto: { id: ev.id },
			});
			expect(after.plantIds).toHaveLength(0);
			const stillThere = await gardeningEventRepository.getByIdScoped({
				workspaceKey: wk,
				dto: { id: ev.id },
			});
			expect(stillThere.id).toEqual(ev.id);
		});

		it("deleteMany removes existing plants in request order and skips missing ids", async () => {
			const { cultivar } = await seedAndCultivar();
			const a = await plantRepository.createScoped({
				dto: { workspaceKey: wk, title: "a", description: null, cultivarId: cultivar.id },
			});
			const b = await plantRepository.createScoped({
				dto: { workspaceKey: wk, title: "b", description: null, cultivarId: cultivar.id },
			});
			const ghost = plantId("00000000-0000-4000-8000-00000000aaaa");
			const { deletedIds } = await plantRepository.deleteManyScoped({
				workspaceKeys: [wk],
				dto: { ids: [b.id, ghost, a.id] },
			});
			expect(deletedIds).toEqual([b.id, a.id]);
			await expect(
				plantRepository.getByIdScoped({ workspaceKey: wk, dto: { id: a.id } }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
			await expect(
				plantRepository.getByIdScoped({ workspaceKey: wk, dto: { id: b.id } }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteMany clears event links for each removed plant", async () => {
			const { cultivar } = await seedAndCultivar();
			const p1 = await plantRepository.createScoped({
				dto: { workspaceKey: wk, title: null, description: null, cultivarId: cultivar.id },
			});
			const p2 = await plantRepository.createScoped({
				dto: { workspaceKey: wk, title: null, description: null, cultivarId: cultivar.id },
			});
			const ev = await gardeningEventRepository.createScoped({
				dto: { workspaceKey: wk, action: fixtureNoteAction() },
			});
			await gardeningEventRepository.bindToPlantScoped({
				workspaceKey: wk,
				dto: { id: ev.id, plantId: p1.id },
			});
			await gardeningEventRepository.bindToPlantScoped({
				workspaceKey: wk,
				dto: { id: ev.id, plantId: p2.id },
			});
			await plantRepository.deleteManyScoped({
				workspaceKeys: [wk],
				dto: { ids: [p1.id, p2.id] },
			});
			const bindings = await gardeningEventRepository.getBindingsForEventScoped({
				workspaceKey: wk,
				dto: { id: ev.id },
			});
			expect(bindings.plantIds).toHaveLength(0);
		});
	});
}
