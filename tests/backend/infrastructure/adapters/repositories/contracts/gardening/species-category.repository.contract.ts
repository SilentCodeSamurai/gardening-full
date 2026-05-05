import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { speciesCategoryId } from "@backend/infrastructure/integrations/shared/database-ids";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import {
	contractTestWorkspace as wk,
	contractTestWorkspaceB as wkB,
} from "../../shared/test-workspace-keys";
import { resolveGardeningRepositoryPorts } from "./resolve-gardening-repository-ports";

export function registerSpeciesCategoryRepositoryContract(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	describe(`SpeciesCategoryRepositoryPort (${adapterLabel})`, () => {
		let speciesCategory: ReturnType<typeof resolveGardeningRepositoryPorts>["speciesCategory"];
		let species: ReturnType<typeof resolveGardeningRepositoryPorts>["species"];

		beforeEach(() => {
			const ports = resolveGardeningRepositoryPorts(createContainer());
			speciesCategory = ports.speciesCategory;
			species = ports.species;
		});

		it("createOne, getOne by id, getMany without filters, updateOne, deleteOne", async () => {
			const row = await speciesCategory.createOne({ workspace: wk, title: "Herbs" });
			expect(row.title).toBe("Herbs");

			const got = await speciesCategory.getOne({ filters: [{ id: row.id }] });
			expect(got.title).toBe("Herbs");

			const { items } = await speciesCategory.getMany();
			expect(items.some((x) => x.id === row.id)).toBe(true);

			const updated = await speciesCategory.updateOne({
				filters: [{ id: row.id }],
				dto: { title: "Herbs 2" },
			});
			expect(updated.title).toBe("Herbs 2");

			const deletedId = await speciesCategory.deleteOne({ filters: [{ id: row.id }] });
			expect(deletedId).toEqual(row.id);
			await expect(speciesCategory.getOne({ filters: [{ id: row.id }] })).rejects.toBeInstanceOf(
				RepositoryNotFoundError,
			);
		});

		it("createMany returns total inserted count", async () => {
			const { count } = await speciesCategory.createMany({
				items: [
					{ workspace: wk, title: "A" },
					{ workspace: wk, title: "B" },
					{ workspace: wk, title: "C" },
				],
			});
			expect(count).toBe(3);
			const { items } = await speciesCategory.getMany();
			expect(items.filter((x) => ["A", "B", "C"].includes(x.title)).length).toBe(3);
		});

		it("createOne preserves caller-provided id", async () => {
			const providedId = speciesCategoryId("system-category:contract-test");
			const row = await speciesCategory.createOne({
				id: providedId,
				workspace: wk,
				title: "Provided id category",
			});
			expect(row.id).toEqual(providedId);

			const got = await speciesCategory.getOne({ filters: [{ id: providedId }] });
			expect(got.id).toEqual(providedId);
		});

		it("createMany preserves caller-provided ids", async () => {
			const firstId = speciesCategoryId("system-category:contract-many-1");
			const secondId = speciesCategoryId("system-category:contract-many-2");
			const { count } = await speciesCategory.createMany({
				items: [
					{ id: firstId, workspace: wk, title: "Provided many A" },
					{ id: secondId, workspace: wk, title: "Provided many B" },
				],
			});
			expect(count).toBe(2);
			await expect(speciesCategory.getOne({ filters: [{ id: firstId }] })).resolves.toMatchObject({ id: firstId });
			await expect(speciesCategory.getOne({ filters: [{ id: secondId }] })).resolves.toMatchObject({
				id: secondId,
			});
		});

		it("getOne uses OR filters вЂ” first miss, second hit", async () => {
			const a = await speciesCategory.createOne({ workspace: wk, title: "Alpha" });
			const { items } = await speciesCategory.getMany({ filters: [{ title: "Alpha", workspace: wk }] });
			expect(items).toHaveLength(1);
			const ghost = speciesCategoryId("00000000-0000-4000-8000-00000000dead");
			const got = await speciesCategory.getOne({
				filters: [{ id: ghost }, { id: a.id }],
			});
			expect(got.id).toEqual(a.id);
		});

		it("getMany with filters: [] returns empty container", async () => {
			await speciesCategory.createOne({ workspace: wk, title: "Only" });
			const { items } = await speciesCategory.getMany({ filters: [] });
			expect(items).toHaveLength(0);
		});

		it("getMany with OR filters unions matching rows (by title)", async () => {
			const x = await speciesCategory.createOne({ workspace: wk, title: "match-x" });
			const y = await speciesCategory.createOne({ workspace: wk, title: "match-y" });
			await speciesCategory.createOne({ workspace: wk, title: "other" });
			const { items } = await speciesCategory.getMany({
				filters: [
					{ title: "match-x", workspace: wk },
					{ title: "match-y", workspace: wk },
				],
			});
			const ids = new Set(items.map((i) => i.id as string));
			expect(ids.has(x.id as string)).toBe(true);
			expect(ids.has(y.id as string)).toBe(true);
			expect(ids.size).toBe(2);
		});

		it("getOne throws when no clause matches", async () => {
			await expect(
				speciesCategory.getOne({
					filters: [{ id: speciesCategoryId("00000000-0000-4000-8000-000000000000") }],
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("updateOne throws when no row matches filters", async () => {
			await expect(
				speciesCategory.updateOne({
					filters: [{ id: speciesCategoryId("00000000-0000-4000-8000-000000000001") }],
					dto: { title: "nope" },
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("updateMany patches every row matching OR filters and returns count", async () => {
			await speciesCategory.createMany({
				items: [
					{ workspace: wk, title: "batch-1" },
					{ workspace: wk, title: "batch-2" },
				],
			});
			const { count } = await speciesCategory.updateMany({
				filters: [
					{ title: "batch-1", workspace: wk },
					{ title: "batch-2", workspace: wk },
				],
				dto: { title: "renamed" },
			});
			expect(count).toBe(2);
			const { items } = await speciesCategory.getMany({
				filters: [{ title: "renamed", workspace: wk }],
			});
			expect(items).toHaveLength(2);
		});

		it("updateMany returns count 0 when nothing matches", async () => {
			const { count } = await speciesCategory.updateMany({
				filters: [{ title: "nonexistent-title-xyz", workspace: wk }],
				dto: { title: "still-none" },
			});
			expect(count).toBe(0);
		});

		it("updateOne can set presentation", async () => {
			const row = await speciesCategory.createOne({
				workspace: wk,
				title: "WithPres",
				presentation: { iconColor: "#111" },
			});
			const u = await speciesCategory.updateOne({
				filters: [{ id: row.id }],
				dto: { presentation: { iconColor: "#222", backgroundColor: "#333" } },
			});
			expect(u.presentation?.iconColor).toBe("#222");
			expect(u.presentation?.backgroundColor).toBe("#333");
		});

		it("deleteOne unbinds linked species by setting categoryId to null", async () => {
			const cat = await speciesCategory.createOne({ workspace: wk, title: "C" });
			await species.createOne({
				workspace: wk,
				categoryId: cat.id,
				characteristics: { name: "S", description: null },
			});
			await speciesCategory.deleteOne({ filters: [{ id: cat.id }] });
			const { items } = await species.getMany();
			expect(items.some((x) => x.categoryId === null)).toBe(true);
		});

		it("deleteOne allows category when species have null categoryId", async () => {
			const cat = await speciesCategory.createOne({ workspace: wk, title: "UnusedCat" });
			await species.createOne({
				workspace: wk,
				categoryId: null,
				characteristics: { name: "Floating", description: null },
			});
			await speciesCategory.deleteOne({ filters: [{ id: cat.id }] });
			await expect(speciesCategory.getOne({ filters: [{ id: cat.id }] })).rejects.toBeInstanceOf(
				RepositoryNotFoundError,
			);
		});

		it("deleteOne throws when target missing", async () => {
			await expect(
				speciesCategory.deleteOne({
					filters: [{ id: speciesCategoryId("00000000-0000-4000-8000-00000000cafe") }],
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteMany removes all matching rows and unbinds linked species", async () => {
			const free = await speciesCategory.createOne({ workspace: wk, title: "free" });
			const blocked = await speciesCategory.createOne({ workspace: wk, title: "blocked" });
			await species.createOne({
				workspace: wk,
				categoryId: blocked.id,
				characteristics: { name: "holds", description: null },
			});
			const { count } = await speciesCategory.deleteMany({
				filters: [{ id: free.id }, { id: blocked.id }],
			});
			expect(count).toBe(2);
			await expect(speciesCategory.getOne({ filters: [{ id: free.id }] })).rejects.toBeInstanceOf(
				RepositoryNotFoundError,
			);
			await expect(speciesCategory.getOne({ filters: [{ id: blocked.id }] })).rejects.toBeInstanceOf(
				RepositoryNotFoundError,
			);
			const { items } = await species.getMany();
			expect(items.some((x) => x.categoryId === null)).toBe(true);
		});

		it("deleteMany returns 0 when filters match nothing", async () => {
			const { count } = await speciesCategory.deleteMany({
				filters: [{ title: "no-such-category-999", workspace: wk }],
			});
			expect(count).toBe(0);
		});

		it("getMany single-field filter by id", async () => {
			const row = await speciesCategory.createOne({ workspace: wk, title: "by-id-cat" });
			const { items } = await speciesCategory.getMany({ filters: [{ id: row.id }] });
			expect(items).toHaveLength(1);
			expect(items[0]?.title).toBe("by-id-cat");
		});

		it("getMany multi-field AND: wrong workspaceKey excludes row", async () => {
			const row = await speciesCategory.createOne({ workspace: wk, title: "ws-and" });
			const { items } = await speciesCategory.getMany({ filters: [{ id: row.id, workspace: wkB }] });
			expect(items).toHaveLength(0);
		});

		it("getMany OR combines id miss with title hit", async () => {
			const row = await speciesCategory.createOne({ workspace: wk, title: "or-title-cat" });
			const { items } = await speciesCategory.getMany({
				filters: [
					{ id: speciesCategoryId("00000000-0000-4000-8000-00000000bad") },
					{ title: "or-title-cat", workspace: wk },
				],
			});
			expect(items).toHaveLength(1);
			expect(items[0]?.id).toEqual(row.id);
		});

		it("updateOne OR filters", async () => {
			const row = await speciesCategory.createOne({ workspace: wk, title: "uo-or" });
			const u = await speciesCategory.updateOne({
				filters: [{ id: speciesCategoryId("00000000-0000-4000-8000-00000000bad") }, { id: row.id }],
				dto: { title: "uo-or-done" },
			});
			expect(u.title).toBe("uo-or-done");
		});

		it("updateMany OR by id; count 0 when no match", async () => {
			const a = await speciesCategory.createOne({ workspace: wk, title: "sc-um-a" });
			const b = await speciesCategory.createOne({ workspace: wk, title: "sc-um-b" });
			const { count } = await speciesCategory.updateMany({
				filters: [{ id: a.id }, { id: b.id }],
				dto: { title: "sc-um-both" },
			});
			expect(count).toBe(2);
			const z = await speciesCategory.updateMany({
				filters: [{ title: "missing-cat-xyz", workspace: wk }],
				dto: { title: "nope" },
			});
			expect(z.count).toBe(0);
		});

		it("deleteOne OR filters", async () => {
			const row = await speciesCategory.createOne({ workspace: wk, title: "del-one-or" });
			await speciesCategory.deleteOne({
				filters: [{ id: speciesCategoryId("00000000-0000-4000-8000-00000000bad") }, { id: row.id }],
			});
			await expect(speciesCategory.getOne({ filters: [{ id: row.id }] })).rejects.toBeInstanceOf(
				RepositoryNotFoundError,
			);
		});

		it("deleteMany OR by id and by title", async () => {
			const a = await speciesCategory.createOne({ workspace: wk, title: "dm-a" });
			const b = await speciesCategory.createOne({ workspace: wk, title: "dm-b" });
			const { count } = await speciesCategory.deleteMany({
				filters: [{ id: a.id }, { id: b.id }],
			});
			expect(count).toBe(2);
		});
	});
}
