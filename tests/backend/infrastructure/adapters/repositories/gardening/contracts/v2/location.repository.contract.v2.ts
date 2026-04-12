import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { locationId } from "@backend/infrastructure/integrations/shared/database-ids";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import { fixtureNoteAction } from "../../../../../../helpers/gardening/test-fixtures";
import {
	contractTestWorkspaceKey as wk,
	contractTestWorkspaceKeyB as wkB,
} from "../../../shared/test-workspace-keys";
import { resolveGardeningRepositoryPortsV2 } from "./resolve-gardening-repository-ports.v2";

export function registerLocationRepositoryContractV2(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	describe(`LocationRepositoryPortV2 (${adapterLabel})`, () => {
		let location: ReturnType<typeof resolveGardeningRepositoryPortsV2>["location"];
		let gardeningEvent: ReturnType<typeof resolveGardeningRepositoryPortsV2>["gardeningEvent"];

		beforeEach(() => {
			const ports = resolveGardeningRepositoryPortsV2(createContainer());
			location = ports.location;
			gardeningEvent = ports.gardeningEvent;
		});

		it("createOne, createMany, getOne, getMany variants", async () => {
			const a = await location.createOne({ workspaceKey: wk, name: "A" });
			const { count } = await location.createMany({
				items: [
					{ workspaceKey: wk, name: "B" },
					{ workspaceKey: wk, name: "C" },
				],
			});
			expect(count).toBe(2);
			const got = await location.getOne({ filters: [{ id: a.id }] });
			expect(got.name).toBe("A");
			const { items: all } = await location.getMany();
			expect(all.length).toBeGreaterThanOrEqual(3);
			const { items: empty } = await location.getMany({ filters: [] });
			expect(empty).toHaveLength(0);
			const { items: or } = await location.getMany({
				filters: [
					{ name: "B", workspaceKey: wk },
					{ name: "C", workspaceKey: wk },
				],
			});
			expect(or).toHaveLength(2);
		});

		it("getOne OR filters", async () => {
			const loc = await location.createOne({ workspaceKey: wk, name: "OR-loc" });
			const got = await location.getOne({
				filters: [{ id: locationId("00000000-0000-4000-8000-00000000bad") }, { id: loc.id }],
			});
			expect(got.id).toEqual(loc.id);
		});

		it("updateOne and updateMany", async () => {
			const x = await location.createOne({ workspaceKey: wk, name: "x" });
			const y = await location.createOne({ workspaceKey: wk, name: "y" });
			const u = await location.updateOne({
				filters: [{ id: x.id }],
				dto: { name: "x2", presentation: { iconColor: "#abc" } },
			});
			expect(u.name).toBe("x2");
			expect(u.presentation?.iconColor).toBe("#abc");
			const { count } = await location.updateMany({
				filters: [{ id: y.id }],
				dto: { name: "y2" },
			});
			expect(count).toBe(1);
		});

		it("updateOne throws when missing", async () => {
			await expect(
				location.updateOne({
					filters: [{ id: locationId("00000000-0000-4000-8000-00000000dead") }],
					dto: { name: "n" },
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteOne clears gardening event↔location links", async () => {
			const loc = await location.createOne({ workspaceKey: wk, name: "Bench" });
			const ev = await gardeningEvent.createOne({ workspaceKey: wk, action: fixtureNoteAction() });
			await gardeningEvent.bindToLocationOne({ filters: [{ id: ev.id }], locationId: loc.id });
			const before = await gardeningEvent.getBindingsOne({ filters: [{ id: ev.id }] });
			expect(before.locationIds.map(String)).toContain(String(loc.id));

			await location.deleteOne({ filters: [{ id: loc.id }] });
			await expect(location.getOne({ filters: [{ id: loc.id }] })).rejects.toBeInstanceOf(RepositoryNotFoundError);
			const after = await gardeningEvent.getBindingsOne({ filters: [{ id: ev.id }] });
			expect(after.locationIds).toHaveLength(0);
		});

		it("deleteOne throws when missing", async () => {
			await expect(
				location.deleteOne({ filters: [{ id: locationId("00000000-0000-4000-8000-00000000fade") }] }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteMany removes locations and clears links", async () => {
			const l1 = await location.createOne({ workspaceKey: wk, name: "L1" });
			const l2 = await location.createOne({ workspaceKey: wk, name: "L2" });
			const ev = await gardeningEvent.createOne({ workspaceKey: wk, action: fixtureNoteAction() });
			await gardeningEvent.bindToLocationOne({ filters: [{ id: ev.id }], locationId: l1.id });
			await gardeningEvent.bindToLocationOne({ filters: [{ id: ev.id }], locationId: l2.id });
			const { count } = await location.deleteMany({ filters: [{ id: l1.id }, { id: l2.id }] });
			expect(count).toBe(2);
			const bindings = await gardeningEvent.getBindingsOne({ filters: [{ id: ev.id }] });
			expect(bindings.locationIds).toHaveLength(0);
		});

		it("deleteMany count 0 when no matches", async () => {
			const { count } = await location.deleteMany({
				filters: [{ name: "no-such-location-name", workspaceKey: wk }],
			});
			expect(count).toBe(0);
		});

		it("getOne throws for missing id", async () => {
			await expect(
				location.getOne({ filters: [{ id: locationId("00000000-0000-4000-8000-000000000001") }] }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("getMany single-field filter by id", async () => {
			const loc = await location.createOne({ workspaceKey: wk, name: "single-id" });
			const { items } = await location.getMany({ filters: [{ id: loc.id }] });
			expect(items).toHaveLength(1);
			expect(items[0]?.id).toEqual(loc.id);
		});

		it("getMany multi-field AND: wrong workspaceKey excludes row", async () => {
			const loc = await location.createOne({ workspaceKey: wk, name: "scoped" });
			const { items } = await location.getMany({ filters: [{ id: loc.id, workspaceKey: wkB }] });
			expect(items).toHaveLength(0);
		});

		it("getMany OR combines different field shapes (id miss vs name hit)", async () => {
			const loc = await location.createOne({ workspaceKey: wk, name: "or-mixed" });
			const { items } = await location.getMany({
				filters: [{ id: locationId("00000000-0000-4000-8000-00000000bad") }, { name: "or-mixed", workspaceKey: wk }],
			});
			expect(items).toHaveLength(1);
			expect(items[0]?.id).toEqual(loc.id);
		});

		it("updateOne OR filters: first clause misses, second hits", async () => {
			const loc = await location.createOne({ workspaceKey: wk, name: "up-or" });
			const u = await location.updateOne({
				filters: [{ id: locationId("00000000-0000-4000-8000-00000000bad") }, { id: loc.id }],
				dto: { name: "up-or-done" },
			});
			expect(u.name).toBe("up-or-done");
		});

		it("updateMany OR patches every matched row; count 0 when nothing matches", async () => {
			const a = await location.createOne({ workspaceKey: wk, name: "um-a" });
			const b = await location.createOne({ workspaceKey: wk, name: "um-b" });
			const { count } = await location.updateMany({
				filters: [{ id: a.id }, { id: b.id }],
				dto: { name: "um-both" },
			});
			expect(count).toBe(2);
			const z = await location.updateMany({
				filters: [{ name: "no-such-loc-999", workspaceKey: wk }],
				dto: { name: "noop" },
			});
			expect(z.count).toBe(0);
		});

		it("deleteOne OR filters", async () => {
			const loc = await location.createOne({ workspaceKey: wk, name: "del-or" });
			await location.deleteOne({
				filters: [{ id: locationId("00000000-0000-4000-8000-00000000bad") }, { id: loc.id }],
			});
			await expect(location.getOne({ filters: [{ id: loc.id }] })).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});
	});
}
