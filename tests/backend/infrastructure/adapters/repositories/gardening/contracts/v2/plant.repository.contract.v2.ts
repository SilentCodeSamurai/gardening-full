import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { cultivarId, plantId } from "@backend/infrastructure/integrations/shared/database-ids";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import {
	fixtureCultivarCharacteristics,
	fixtureNoteAction,
	fixtureSpeciesCharacteristics,
} from "../../../../../../helpers/gardening/test-fixtures";
import { resolveGardeningRepositoryPortsV2 } from "./resolve-gardening-repository-ports.v2";

export function registerPlantRepositoryContractV2(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	describe(`PlantRepositoryPortV2 (${adapterLabel})`, () => {
		let speciesCategory: ReturnType<typeof resolveGardeningRepositoryPortsV2>["speciesCategory"];
		let species: ReturnType<typeof resolveGardeningRepositoryPortsV2>["species"];
		let cultivar: ReturnType<typeof resolveGardeningRepositoryPortsV2>["cultivar"];
		let plant: ReturnType<typeof resolveGardeningRepositoryPortsV2>["plant"];
		let gardeningEvent: ReturnType<typeof resolveGardeningRepositoryPortsV2>["gardeningEvent"];

		beforeEach(() => {
			const ports = resolveGardeningRepositoryPortsV2(createContainer());
			speciesCategory = ports.speciesCategory;
			species = ports.species;
			cultivar = ports.cultivar;
			plant = ports.plant;
			gardeningEvent = ports.gardeningEvent;
		});

		async function seedCultivar() {
			const cat = await speciesCategory.createOne({ title: "C" });
			const sp = await species.createOne({
				categoryId: cat.id,
				characteristics: fixtureSpeciesCharacteristics(),
			});
			return cultivar.createOne({
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics(),
			});
		}

		it("createOne requires cultivar", async () => {
			await seedCultivar();
			await expect(
				plant.createOne({
					title: null,
					description: null,
					cultivarId: cultivarId("00000000-0000-4000-8000-00000000dead"),
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("createMany returns hydrated items with distinct ids", async () => {
			const cv = await seedCultivar();
			const { items } = await plant.createMany({
				items: [
					{ title: null, description: null, cultivarId: cv.id },
					{ title: null, description: null, cultivarId: cv.id },
				],
			});
			expect(items).toHaveLength(2);
			expect(new Set(items.map((p) => p.id as string)).size).toBe(2);
			expect(items.every((p) => p.cultivar.id === cv.id)).toBe(true);
		});

		it("getMany without filters lists all plants", async () => {
			const cv = await seedCultivar();
			await plant.createOne({
				title: "listed",
				description: null,
				cultivarId: cv.id,
			});
			const { items } = await plant.getMany();
			expect(items.some((p) => p.title === "listed")).toBe(true);
		});

		it("getMany filters: [] returns empty", async () => {
			const cv = await seedCultivar();
			await plant.createOne({
				title: null,
				description: null,
				cultivarId: cv.id,
			});
			const { items } = await plant.getMany({ filters: [] });
			expect(items).toHaveLength(0);
		});

		it("getMany OR by id and filter by cultivarId", async () => {
			const cv = await seedCultivar();
			const p1 = await plant.createOne({
				title: "p1",
				description: null,
				cultivarId: cv.id,
			});
			const p2 = await plant.createOne({
				title: "p2",
				description: null,
				cultivarId: cv.id,
			});
			const byIds = await plant.getMany({ filters: [{ id: p1.id }, { id: p2.id }] });
			expect(byIds.items).toHaveLength(2);
			const byCv = await plant.getMany({ filters: [{ cultivarId: cv.id }] });
			expect(byCv.items.length).toBeGreaterThanOrEqual(2);
		});

		it("getOne OR filters", async () => {
			const cv = await seedCultivar();
			const p = await plant.createOne({
				title: "or",
				description: null,
				cultivarId: cv.id,
			});
			const got = await plant.getOne({
				filters: [{ id: plantId("00000000-0000-4000-8000-00000000bad") }, { id: p.id }],
			});
			expect(got.id).toEqual(p.id);
		});

		it("updateOne patches title; updateMany sets title on all matches", async () => {
			const cv = await seedCultivar();
			const a = await plant.createOne({
				title: "a",
				description: null,
				cultivarId: cv.id,
			});
			const u = await plant.updateOne({
				filters: [{ id: a.id }],
				dto: { title: "a-patched" },
			});
			expect(u.title).toBe("a-patched");
			const b = await plant.createOne({
				title: "b",
				description: null,
				cultivarId: cv.id,
			});
			const { count } = await plant.updateMany({
				filters: [{ title: "b" }],
				dto: { title: "b-many" },
			});
			expect(count).toBe(1);
			const b2 = await plant.getOne({ filters: [{ id: b.id }] });
			expect(b2.title).toBe("b-many");
		});

		it("updateOne throws when no match", async () => {
			await expect(
				plant.updateOne({
					filters: [{ id: plantId("00000000-0000-4000-8000-00000000cafe") }],
					dto: { title: "x" },
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("updateOne with invalid cultivarId throws", async () => {
			const cv = await seedCultivar();
			const p = await plant.createOne({
				title: null,
				description: null,
				cultivarId: cv.id,
			});
			await expect(
				plant.updateOne({
					filters: [{ id: p.id }],
					dto: { cultivarId: cultivarId("00000000-0000-4000-8000-00000000beef") },
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteOne clears event↔plant links", async () => {
			const cv = await seedCultivar();
			const p = await plant.createOne({
				title: null,
				description: null,
				cultivarId: cv.id,
			});
			const ev = await gardeningEvent.createOne({ action: fixtureNoteAction() });
			await gardeningEvent.bindToPlantOne({ filters: [{ id: ev.id }], plantId: p.id });
			const before = await gardeningEvent.getBindingsOne({ filters: [{ id: ev.id }] });
			expect(before.plantIds.map(String)).toContain(String(p.id));

			await plant.deleteOne({ filters: [{ id: p.id }] });
			await expect(plant.getOne({ filters: [{ id: p.id }] })).rejects.toBeInstanceOf(RepositoryNotFoundError);
			const after = await gardeningEvent.getBindingsOne({ filters: [{ id: ev.id }] });
			expect(after.plantIds).toHaveLength(0);
		});

		it("deleteOne throws when missing", async () => {
			await expect(
				plant.deleteOne({ filters: [{ id: plantId("00000000-0000-4000-8000-00000000fade") }] }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteMany removes rows matching OR filters", async () => {
			const cv = await seedCultivar();
			const a = await plant.createOne({
				title: "da",
				description: null,
				cultivarId: cv.id,
			});
			const b = await plant.createOne({
				title: "db",
				description: null,
				cultivarId: cv.id,
			});
			const { count } = await plant.deleteMany({ filters: [{ id: b.id }, { id: a.id }] });
			expect(count).toBe(2);
		});

		it("deleteMany count 0 when nothing matches", async () => {
			const { count } = await plant.deleteMany({
				filters: [{ title: "nonexistent-plant-title-xyz" }],
			});
			expect(count).toBe(0);
		});

		it("getOne throws for missing id", async () => {
			await expect(
				plant.getOne({ filters: [{ id: plantId("00000000-0000-4000-8000-000000000001") }] }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});
	});
}
