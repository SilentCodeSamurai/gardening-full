import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import {
	gardeningEventId,
	locationId,
	plantId,
} from "@backend/infrastructure/integrations/shared/database-ids";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import {
	fixtureCultivarCharacteristics,
	fixtureNoteAction,
	fixtureSpeciesCharacteristics,
} from "../../../../../../helpers/gardening/test-fixtures";
import { resolveGardeningRepositoryPortsV2 } from "./resolve-gardening-repository-ports.v2";

export function registerGardeningEventRepositoryContractV2(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	describe(`GardeningEventRepositoryPortV2 (${adapterLabel})`, () => {
		let speciesCategory: ReturnType<typeof resolveGardeningRepositoryPortsV2>["speciesCategory"];
		let species: ReturnType<typeof resolveGardeningRepositoryPortsV2>["species"];
		let cultivar: ReturnType<typeof resolveGardeningRepositoryPortsV2>["cultivar"];
		let plant: ReturnType<typeof resolveGardeningRepositoryPortsV2>["plant"];
		let locationRepo: ReturnType<typeof resolveGardeningRepositoryPortsV2>["location"];
		let gardeningEvent: ReturnType<typeof resolveGardeningRepositoryPortsV2>["gardeningEvent"];

		beforeEach(() => {
			const ports = resolveGardeningRepositoryPortsV2(createContainer());
			speciesCategory = ports.speciesCategory;
			species = ports.species;
			cultivar = ports.cultivar;
			plant = ports.plant;
			locationRepo = ports.location;
			gardeningEvent = ports.gardeningEvent;
		});

		async function plantFixture() {
			const cat = await speciesCategory.createOne({ title: "C" });
			const sp = await species.createOne({
				categoryId: cat.id,
				characteristics: fixtureSpeciesCharacteristics(),
			});
			const cv = await cultivar.createOne({
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics(),
			});
			const p = await plant.createOne({
				title: "p",
				description: null,
				cultivarId: cv.id,
			});
			return { plant: p };
		}

		it("createOne, createMany, getOne, getMany", async () => {
			const a = await gardeningEvent.createOne({ action: fixtureNoteAction({ content: "a" }) });
			const { count } = await gardeningEvent.createMany({
				items: [{ action: fixtureNoteAction({ content: "b" }) }, { action: fixtureNoteAction({ content: "c" }) }],
			});
			expect(count).toBe(2);
			const one = await gardeningEvent.getOne({ filters: [{ id: a.id }] });
			expect(one.action).toMatchObject({ content: "a" });
			const { items: all } = await gardeningEvent.getMany();
			expect(all.length).toBeGreaterThanOrEqual(3);
			const { items: empty } = await gardeningEvent.getMany({ filters: [] });
			expect(empty).toHaveLength(0);
		});

		it("getOne OR filters", async () => {
			const ev = await gardeningEvent.createOne({ action: fixtureNoteAction() });
			const got = await gardeningEvent.getOne({
				filters: [{ id: gardeningEventId("00000000-0000-4000-8000-00000000bad") }, { id: ev.id }],
			});
			expect(got.id).toEqual(ev.id);
		});

		it("updateOne patches action; updateMany applies to matches", async () => {
			const e1 = await gardeningEvent.createOne({ action: fixtureNoteAction({ content: "old1" }) });
			const e2 = await gardeningEvent.createOne({ action: fixtureNoteAction({ content: "old2" }) });
			const u = await gardeningEvent.updateOne({
				filters: [{ id: e1.id }],
				dto: { action: { type: "watering", content: "wet" } },
			});
			expect(u.action).toMatchObject({ type: "watering", content: "wet" });
			const { count } = await gardeningEvent.updateMany({
				filters: [{ id: e2.id }],
				dto: { action: fixtureNoteAction({ content: "patched-many" }) },
			});
			expect(count).toBe(1);
		});

		it("updateOne throws when missing", async () => {
			await expect(
				gardeningEvent.updateOne({
					filters: [{ id: gardeningEventId("00000000-0000-4000-8000-00000000dead") }],
					dto: { action: fixtureNoteAction() },
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteOne and deleteMany", async () => {
			const a = await gardeningEvent.createOne({ action: fixtureNoteAction() });
			const b = await gardeningEvent.createOne({ action: fixtureNoteAction() });
			await gardeningEvent.deleteOne({ filters: [{ id: a.id }] });
			await expect(gardeningEvent.getOne({ filters: [{ id: a.id }] })).rejects.toBeInstanceOf(
				RepositoryNotFoundError,
			);
			const { count } = await gardeningEvent.deleteMany({ filters: [{ id: b.id }] });
			expect(count).toBe(1);
		});

		it("deleteMany count 0 when no match", async () => {
			const { count } = await gardeningEvent.deleteMany({
				filters: [{ id: gardeningEventId("00000000-0000-4000-8000-00000000fade") }],
			});
			expect(count).toBe(0);
		});

		it("bindToPlantOne and getManyForPlant", async () => {
			const { plant: p } = await plantFixture();
			const ev = await gardeningEvent.createOne({ action: fixtureNoteAction() });
			await gardeningEvent.bindToPlantOne({ filters: [{ id: ev.id }], plantId: p.id });
			const { items } = await gardeningEvent.getManyForPlant({
				filters: [{ plantId: p.id }],
			});
			expect(items).toHaveLength(1);
			expect(items[0]?.id).toEqual(ev.id);
		});

		it("getManyForPlant returns empty when plant has no bindings", async () => {
			const { plant: p } = await plantFixture();
			const { items } = await gardeningEvent.getManyForPlant({
				filters: [{ plantId: p.id }],
			});
			expect(items).toHaveLength(0);
		});

		it("getManyForPlant OR merges distinct events", async () => {
			const { plant: p } = await plantFixture();
			const e1 = await gardeningEvent.createOne({ action: fixtureNoteAction({ content: "e1" }) });
			const e2 = await gardeningEvent.createOne({ action: fixtureNoteAction({ content: "e2" }) });
			await gardeningEvent.bindToPlantOne({ filters: [{ id: e1.id }], plantId: p.id });
			await gardeningEvent.bindToPlantOne({ filters: [{ id: e2.id }], plantId: p.id });
			const { items } = await gardeningEvent.getManyForPlant({
				filters: [{ plantId: p.id }, { plantId: p.id }],
			});
			const ids = new Set(items.map((x) => x.id as string));
			expect(ids.size).toBe(2);
		});

		it("bindToLocationOne and getManyForLocation", async () => {
			const loc = await locationRepo.createOne({ name: "GH" });
			const ev = await gardeningEvent.createOne({ action: fixtureNoteAction() });
			await gardeningEvent.bindToLocationOne({ filters: [{ id: ev.id }], locationId: loc.id });
			const { items } = await gardeningEvent.getManyForLocation({
				filters: [{ locationId: loc.id }],
			});
			expect(items).toHaveLength(1);
		});

		it("getManyForLocation returns empty when location has no bindings", async () => {
			const loc = await locationRepo.createOne({ name: "Iso" });
			const { items } = await gardeningEvent.getManyForLocation({
				filters: [{ locationId: loc.id }],
			});
			expect(items).toHaveLength(0);
		});

		it("getBindingsOne returns linked plants and locations", async () => {
			const { plant: p } = await plantFixture();
			const loc = await locationRepo.createOne({ name: "Bed" });
			const ev = await gardeningEvent.createOne({ action: fixtureNoteAction() });
			await gardeningEvent.bindToPlantOne({ filters: [{ id: ev.id }], plantId: p.id });
			await gardeningEvent.bindToLocationOne({ filters: [{ id: ev.id }], locationId: loc.id });
			const b = await gardeningEvent.getBindingsOne({ filters: [{ id: ev.id }] });
			expect(b.plantIds.map(String)).toContain(String(p.id));
			expect(b.locationIds.map(String)).toContain(String(loc.id));
		});

		it("getBindingsOne empty arrays when no links", async () => {
			const ev = await gardeningEvent.createOne({ action: fixtureNoteAction() });
			const b = await gardeningEvent.getBindingsOne({ filters: [{ id: ev.id }] });
			expect(b.plantIds).toHaveLength(0);
			expect(b.locationIds).toHaveLength(0);
		});

		it("getBindingsOne throws when event missing", async () => {
			await expect(
				gardeningEvent.getBindingsOne({
					filters: [{ id: gardeningEventId("00000000-0000-4000-8000-000000000001") }],
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("bindToPlantOne throws for missing event or plant", async () => {
			const { plant: p } = await plantFixture();
			await expect(
				gardeningEvent.bindToPlantOne({
					filters: [{ id: gardeningEventId("00000000-0000-4000-8000-000000000001") }],
					plantId: p.id,
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
			const ev = await gardeningEvent.createOne({ action: fixtureNoteAction() });
			await expect(
				gardeningEvent.bindToPlantOne({
					filters: [{ id: ev.id }],
					plantId: plantId("00000000-0000-4000-8000-000000000002"),
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteOne clears junction links", async () => {
			const { plant: p } = await plantFixture();
			const loc = await locationRepo.createOne({ name: "B" });
			const ev = await gardeningEvent.createOne({ action: fixtureNoteAction() });
			await gardeningEvent.bindToPlantOne({ filters: [{ id: ev.id }], plantId: p.id });
			await gardeningEvent.bindToLocationOne({ filters: [{ id: ev.id }], locationId: loc.id });
			await gardeningEvent.deleteOne({ filters: [{ id: ev.id }] });
			const forPlant = await gardeningEvent.getManyForPlant({
				filters: [{ plantId: p.id }],
			});
			const forLoc = await gardeningEvent.getManyForLocation({
				filters: [{ locationId: loc.id }],
			});
			expect(forPlant.items).toHaveLength(0);
			expect(forLoc.items).toHaveLength(0);
		});

		it("bindToLocationOne throws when location missing", async () => {
			const ev = await gardeningEvent.createOne({ action: fixtureNoteAction() });
			await expect(
				gardeningEvent.bindToLocationOne({
					filters: [{ id: ev.id }],
					locationId: locationId("00000000-0000-4000-8000-000000000099"),
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});
	});
}
