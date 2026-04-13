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
} from "../../../../../helpers/gardening/test-fixtures";
import {
	contractTestWorkspace as wk,
	contractTestWorkspaceB as wkB,
} from "../../shared/test-workspace-keys";
import { resolveGardeningRepositoryPorts } from "./resolve-gardening-repository-ports";

export function registerGardeningEventRepositoryContract(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	describe(`GardeningEventRepositoryPort (${adapterLabel})`, () => {
		let speciesCategory: ReturnType<typeof resolveGardeningRepositoryPorts>["speciesCategory"];
		let species: ReturnType<typeof resolveGardeningRepositoryPorts>["species"];
		let cultivar: ReturnType<typeof resolveGardeningRepositoryPorts>["cultivar"];
		let plant: ReturnType<typeof resolveGardeningRepositoryPorts>["plant"];
		let locationRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["location"];
		let gardeningEvent: ReturnType<typeof resolveGardeningRepositoryPorts>["gardeningEvent"];

		beforeEach(() => {
			const ports = resolveGardeningRepositoryPorts(createContainer());
			speciesCategory = ports.speciesCategory;
			species = ports.species;
			cultivar = ports.cultivar;
			plant = ports.plant;
			locationRepository = ports.location;
			gardeningEvent = ports.gardeningEvent;
		});

		async function plantFixture() {
			const cat = await speciesCategory.createOne({ workspace: wk, title: "C" });
			const sp = await species.createOne({
				workspace: wk,
				categoryId: cat.id,
				characteristics: fixtureSpeciesCharacteristics(),
			});
			const cv = await cultivar.createOne({
				workspace: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics(),
			});
			const p = await plant.createOne({
				workspace: wk,
				title: "p",
				description: null,
				cultivarId: cv.id,
			});
			return { plant: p };
		}

		it("createOne, createMany, getOne, getMany", async () => {
			const a = await gardeningEvent.createOne({
				workspace: wk,
				action: fixtureNoteAction({ content: "a" }),
			});
			const { count } = await gardeningEvent.createMany({
				items: [
					{ workspace: wk, action: fixtureNoteAction({ content: "b" }) },
					{ workspace: wk, action: fixtureNoteAction({ content: "c" }) },
				],
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
			const ev = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction() });
			const got = await gardeningEvent.getOne({
				filters: [{ id: gardeningEventId("00000000-0000-4000-8000-00000000bad") }, { id: ev.id }],
			});
			expect(got.id).toEqual(ev.id);
		});

		it("updateOne patches action; updateMany applies to matches", async () => {
			const e1 = await gardeningEvent.createOne({
				workspace: wk,
				action: fixtureNoteAction({ content: "old1" }),
			});
			const e2 = await gardeningEvent.createOne({
				workspace: wk,
				action: fixtureNoteAction({ content: "old2" }),
			});
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
			const a = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction() });
			const b = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction() });
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
			const ev = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction() });
			await gardeningEvent.bindToPlantOne({ filters: [{ id: ev.id }], plantId: p.id });
			const { items } = await gardeningEvent.getManyForPlant({
				filters: [{ plantId: p.id}],
			});
			expect(items).toHaveLength(1);
			expect(items[0]?.id).toEqual(ev.id);
		});

		it("getManyForPlant returns empty when plant has no bindings", async () => {
			const { plant: p } = await plantFixture();
			const { items } = await gardeningEvent.getManyForPlant({
				filters: [{ plantId: p.id}],
			});
			expect(items).toHaveLength(0);
		});

		it("getManyForPlant OR merges distinct events", async () => {
			const { plant: p } = await plantFixture();
			const e1 = await gardeningEvent.createOne({
				workspace: wk,
				action: fixtureNoteAction({ content: "e1" }),
			});
			const e2 = await gardeningEvent.createOne({
				workspace: wk,
				action: fixtureNoteAction({ content: "e2" }),
			});
			await gardeningEvent.bindToPlantOne({ filters: [{ id: e1.id }], plantId: p.id });
			await gardeningEvent.bindToPlantOne({ filters: [{ id: e2.id }], plantId: p.id });
			const { items } = await gardeningEvent.getManyForPlant({
				filters: [
					{ plantId: p.id},
					{ plantId: p.id},
				],
			});
			const ids = new Set(items.map((x) => x.id as string));
			expect(ids.size).toBe(2);
		});

		it("bindToLocationOne and getManyForLocation", async () => {
			const loc = await locationRepository.createOne({ workspace: wk, name: "GH" });
			const ev = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction() });
			await gardeningEvent.bindToLocationOne({ filters: [{ id: ev.id }], locationId: loc.id });
			const { items } = await gardeningEvent.getManyForLocation({
				filters: [{ locationId: loc.id}],
			});
			expect(items).toHaveLength(1);
		});

		it("getManyForLocation returns empty when location has no bindings", async () => {
			const loc = await locationRepository.createOne({ workspace: wk, name: "Iso" });
			const { items } = await gardeningEvent.getManyForLocation({
				filters: [{ locationId: loc.id}],
			});
			expect(items).toHaveLength(0);
		});

		it("getBindingsOne returns linked plants and locations", async () => {
			const { plant: p } = await plantFixture();
			const loc = await locationRepository.createOne({ workspace: wk, name: "Bed" });
			const ev = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction() });
			await gardeningEvent.bindToPlantOne({ filters: [{ id: ev.id }], plantId: p.id });
			await gardeningEvent.bindToLocationOne({ filters: [{ id: ev.id }], locationId: loc.id });
			const b = await gardeningEvent.getBindingsOne({ filters: [{ id: ev.id }] });
			expect(b.plantIds.map(String)).toContain(String(p.id));
			expect(b.locationIds.map(String)).toContain(String(loc.id));
		});

		it("getBindingsOne empty arrays when no links", async () => {
			const ev = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction() });
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
			const ev = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction() });
			await expect(
				gardeningEvent.bindToPlantOne({
					filters: [{ id: ev.id }],
					plantId: plantId("00000000-0000-4000-8000-000000000002"),
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteOne clears junction links", async () => {
			const { plant: p } = await plantFixture();
			const loc = await locationRepository.createOne({ workspace: wk, name: "B" });
			const ev = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction() });
			await gardeningEvent.bindToPlantOne({ filters: [{ id: ev.id }], plantId: p.id });
			await gardeningEvent.bindToLocationOne({ filters: [{ id: ev.id }], locationId: loc.id });
			await gardeningEvent.deleteOne({ filters: [{ id: ev.id }] });
			const forPlant = await gardeningEvent.getManyForPlant({
				filters: [{ plantId: p.id}],
			});
			const forLoc = await gardeningEvent.getManyForLocation({
				filters: [{ locationId: loc.id}],
			});
			expect(forPlant.items).toHaveLength(0);
			expect(forLoc.items).toHaveLength(0);
		});

		it("bindToLocationOne throws when location missing", async () => {
			const ev = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction() });
			await expect(
				gardeningEvent.bindToLocationOne({
					filters: [{ id: ev.id }],
					locationId: locationId("00000000-0000-4000-8000-000000000099"),
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("getMany single-field filter by id", async () => {
			const ev = await gardeningEvent.createOne({
				workspace: wk,
				action: fixtureNoteAction({ content: "gm-id" }),
			});
			const { items } = await gardeningEvent.getMany({ filters: [{ id: ev.id }] });
			expect(items).toHaveLength(1);
			expect(items[0]?.id).toEqual(ev.id);
		});

		it("getMany multi-field AND: wrong workspaceKey excludes row", async () => {
			const ev = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction() });
			const { items } = await gardeningEvent.getMany({ filters: [{ id: ev.id, workspace: wkB }] });
			expect(items).toHaveLength(0);
		});

		it("getMany OR unions two events by id", async () => {
			const e1 = await gardeningEvent.createOne({
				workspace: wk,
				action: fixtureNoteAction({ content: "gm-or-1" }),
			});
			const e2 = await gardeningEvent.createOne({
				workspace: wk,
				action: fixtureNoteAction({ content: "gm-or-2" }),
			});
			const { items } = await gardeningEvent.getMany({ filters: [{ id: e1.id }, { id: e2.id }] });
			expect(items).toHaveLength(2);
		});

		it("updateOne OR filters", async () => {
			const ev = await gardeningEvent.createOne({
				workspace: wk,
				action: fixtureNoteAction({ content: "uo-or" }),
			});
			const u = await gardeningEvent.updateOne({
				filters: [{ id: gardeningEventId("00000000-0000-4000-8000-00000000bad") }, { id: ev.id }],
				dto: { action: fixtureNoteAction({ content: "uo-or-done" }) },
			});
			expect(u.action).toMatchObject({ content: "uo-or-done" });
		});

		it("updateMany OR patches multiple events; count 0 when no match", async () => {
			const a = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction({ content: "um-a" }) });
			const b = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction({ content: "um-b" }) });
			const { count } = await gardeningEvent.updateMany({
				filters: [{ id: a.id }, { id: b.id }],
				dto: { action: fixtureNoteAction({ content: "um-both" }) },
			});
			expect(count).toBe(2);
			const z = await gardeningEvent.updateMany({
				filters: [{ id: gardeningEventId("00000000-0000-4000-8000-00000000fade") }],
				dto: { action: fixtureNoteAction() },
			});
			expect(z.count).toBe(0);
		});

		it("deleteOne OR filters", async () => {
			const ev = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction() });
			await gardeningEvent.deleteOne({
				filters: [{ id: gardeningEventId("00000000-0000-4000-8000-00000000bad") }, { id: ev.id }],
			});
			await expect(gardeningEvent.getOne({ filters: [{ id: ev.id }] })).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteMany OR by id and by action content match", async () => {
			const a = await gardeningEvent.createOne({
				workspace: wk,
				action: fixtureNoteAction({ content: "dm-ge-a" }),
			});
			await gardeningEvent.createOne({
				workspace: wk,
				action: fixtureNoteAction({ content: "dm-ge-b" }),
			});
			const { count } = await gardeningEvent.deleteMany({
				filters: [{ id: a.id }, { action: fixtureNoteAction({ content: "dm-ge-b" })}],
			});
			expect(count).toBe(2);
		});

		it("getManyForPlant OR merges events across two plants", async () => {
			const { plant: p1 } = await plantFixture();
			const { plant: p2 } = await plantFixture();
			const e1 = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction({ content: "p1" }) });
			const e2 = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction({ content: "p2" }) });
			await gardeningEvent.bindToPlantOne({ filters: [{ id: e1.id }], plantId: p1.id });
			await gardeningEvent.bindToPlantOne({ filters: [{ id: e2.id }], plantId: p2.id });
			const { items } = await gardeningEvent.getManyForPlant({
				filters: [
					{ plantId: p1.id},
					{ plantId: p2.id},
				],
			});
			const ids = new Set(items.map((x) => x.id as string));
			expect(ids.size).toBe(2);
		});

		it("getManyForPlant ignores workspace on filter clause", async () => {
			const { plant: p } = await plantFixture();
			const ev = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction() });
			await gardeningEvent.bindToPlantOne({ filters: [{ id: ev.id }], plantId: p.id });
			const { items } = await gardeningEvent.getManyForPlant({
				filters: [{ plantId: p.id}],
			});
			expect(items).toHaveLength(1);
		});

		it("getManyForLocation OR merges events across two locations", async () => {
			const l1 = await locationRepository.createOne({ workspace: wk, name: "L-or-1" });
			const l2 = await locationRepository.createOne({ workspace: wk, name: "L-or-2" });
			const e1 = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction({ content: "loc1" }) });
			const e2 = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction({ content: "loc2" }) });
			await gardeningEvent.bindToLocationOne({ filters: [{ id: e1.id }], locationId: l1.id });
			await gardeningEvent.bindToLocationOne({ filters: [{ id: e2.id }], locationId: l2.id });
			const { items } = await gardeningEvent.getManyForLocation({
				filters: [
					{ locationId: l1.id},
					{ locationId: l2.id},
				],
			});
			expect(new Set(items.map((x) => x.id as string)).size).toBe(2);
		});

		it("getManyForLocation ignores workspace on filter clause", async () => {
			const loc = await locationRepository.createOne({ workspace: wk, name: "L-ws" });
			const ev = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction() });
			await gardeningEvent.bindToLocationOne({ filters: [{ id: ev.id }], locationId: loc.id });
			const { items } = await gardeningEvent.getManyForLocation({
				filters: [{ locationId: loc.id}],
			});
			expect(items).toHaveLength(1);
		});

		it("getBindingsOne OR filters: first clause misses, second hits", async () => {
			const ev = await gardeningEvent.createOne({ workspace: wk, action: fixtureNoteAction() });
			const bindings = await gardeningEvent.getBindingsOne({
				filters: [{ id: gardeningEventId("00000000-0000-4000-8000-00000000bad") }, { id: ev.id }],
			});
			expect(bindings.plantIds).toHaveLength(0);
			expect(bindings.locationIds).toHaveLength(0);
		});

		it("getOne throws for missing id", async () => {
			await expect(
				gardeningEvent.getOne({ filters: [{ id: gardeningEventId("00000000-0000-4000-8000-00000000cafe") }] }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});
	});
}
