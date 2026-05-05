import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { speciesCategoryId, speciesId } from "@backend/infrastructure/integrations/shared/database-ids";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import { fixtureSpeciesCharacteristics } from "../../../../../helpers/gardening/test-fixtures";
import {
	contractTestWorkspace as wk,
	contractTestWorkspaceB as wkB,
} from "../../shared/test-workspace-keys";
import { resolveGardeningRepositoryPorts } from "./resolve-gardening-repository-ports";

export function registerSpeciesRepositoryContract(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	describe(`SpeciesRepositoryPort (${adapterLabel})`, () => {
		let speciesCategory: ReturnType<typeof resolveGardeningRepositoryPorts>["speciesCategory"];
		let species: ReturnType<typeof resolveGardeningRepositoryPorts>["species"];
		let cultivar: ReturnType<typeof resolveGardeningRepositoryPorts>["cultivar"];

		beforeEach(() => {
			const ports = resolveGardeningRepositoryPorts(createContainer());
			speciesCategory = ports.speciesCategory;
			species = ports.species;
			cultivar = ports.cultivar;
		});

		async function cat() {
			return speciesCategory.createOne({ workspace: wk, title: "Cat" });
		}

		it("createOne rejects invalid non-null categoryId", async () => {
			await expect(
				species.createOne({
					workspace: wk,
					categoryId: speciesCategoryId("00000000-0000-4000-8000-000000000001"),
					characteristics: fixtureSpeciesCharacteristics(),
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("createOne allows null categoryId", async () => {
			const row = await species.createOne({
				workspace: wk,
				categoryId: null,
				characteristics: fixtureSpeciesCharacteristics({ name: "uncategorized" }),
			});
			expect(row.categoryId).toBeNull();
		});

		it("createMany count and distinct ids", async () => {
			const c = await cat();
			const { count } = await species.createMany({
				items: [
					{
						workspace: wk,
						categoryId: c.id,
						characteristics: fixtureSpeciesCharacteristics({ name: "s1" }),
					},
					{
						workspace: wk,
						categoryId: c.id,
						characteristics: fixtureSpeciesCharacteristics({ name: "s2" }),
					},
				],
			});
			expect(count).toBe(2);
			const { items } = await species.getMany({ filters: [{ categoryId: c.id, workspace: wk }] });
			expect(items.length).toBeGreaterThanOrEqual(2);
		});

		it("createOne preserves caller-provided id", async () => {
			const c = await cat();
			const providedId = speciesId("system-species:contract-test:provided");
			const row = await species.createOne({
				id: providedId,
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "provided-id-species" }),
			});
			expect(row.id).toEqual(providedId);

			const got = await species.getOne({ filters: [{ id: providedId }] });
			expect(got.id).toEqual(providedId);
		});

		it("createMany preserves caller-provided ids", async () => {
			const c = await cat();
			const firstId = speciesId("system-species:contract-many:first");
			const secondId = speciesId("system-species:contract-many:second");
			const { count } = await species.createMany({
				items: [
					{
						id: firstId,
						workspace: wk,
						categoryId: c.id,
						characteristics: fixtureSpeciesCharacteristics({ name: "provided-many-1" }),
					},
					{
						id: secondId,
						workspace: wk,
						categoryId: c.id,
						characteristics: fixtureSpeciesCharacteristics({ name: "provided-many-2" }),
					},
				],
			});
			expect(count).toBe(2);
			await expect(species.getOne({ filters: [{ id: firstId }] })).resolves.toMatchObject({ id: firstId });
			await expect(species.getOne({ filters: [{ id: secondId }] })).resolves.toMatchObject({ id: secondId });
		});

		it("full CRUD via segregated ports", async () => {
			const c = await cat();
			const row = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "Basil" }),
			});
			const got = await species.getOne({ filters: [{ id: row.id }] });
			expect(got.characteristics.name).toBe("Basil");

			const updated = await species.updateOne({
				filters: [{ id: row.id }],
				dto: { characteristics: fixtureSpeciesCharacteristics({ name: "Sweet basil" }) },
			});
			expect(updated.characteristics.name).toBe("Sweet basil");

			const other = await speciesCategory.createOne({ workspace: wk, title: "Other" });
			const moved = await species.updateOne({
				filters: [{ id: row.id }],
				dto: { categoryId: other.id },
			});
			expect(moved.categoryId).toEqual(other.id);

			await species.deleteOne({ filters: [{ id: row.id }] });
			await expect(species.getOne({ filters: [{ id: row.id }] })).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("getOne OR filters", async () => {
			const c = await cat();
			const sp = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "oregano" }),
			});
			const ghost = speciesCategoryId("00000000-0000-4000-8000-00000000dead");
			const got = await species.getOne({
				filters: [{ categoryId: ghost }, { id: sp.id }],
			});
			expect(got.id).toEqual(sp.id);
		});

		it("getMany filters: [] is empty", async () => {
			const c = await cat();
			await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics(),
			});
			const { items } = await species.getMany({ filters: [] });
			expect(items).toHaveLength(0);
		});

		it("getMany without filters returns all species in store", async () => {
			const c = await cat();
			await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "all-a" }),
			});
			const { items } = await species.getMany();
			expect(items.some((x) => x.characteristics.name === "all-a")).toBe(true);
		});

		it("getMany OR by categoryId or by characteristics.name subset", async () => {
			const c = await cat();
			const a = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "uniq-a" }),
			});
			const b = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "uniq-b" }),
			});
			const { items } = await species.getMany({
				filters: [{ id: a.id }, { id: b.id }],
			});
			expect(items).toHaveLength(2);
		});

		it("updateOne throws when no match", async () => {
			await expect(
				species.updateOne({
					filters: [{ id: speciesId("00000000-0000-4000-8000-00000000beef") }],
					dto: { characteristics: fixtureSpeciesCharacteristics() },
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("updateMany returns count including zero", async () => {
			const c = await cat();
			await species.createMany({
				items: [
					{
						workspace: wk,
						categoryId: c.id,
						characteristics: fixtureSpeciesCharacteristics({ name: "m1" }),
					},
					{
						workspace: wk,
						categoryId: c.id,
						characteristics: fixtureSpeciesCharacteristics({ name: "m2" }),
					},
				],
			});
			const { count } = await species.updateMany({
				filters: [{ categoryId: c.id, workspace: wk }],
				dto: { characteristics: fixtureSpeciesCharacteristics({ name: "merged" }) },
			});
			expect(count).toBeGreaterThanOrEqual(2);
			expect(
				(await species.getMany({ filters: [{ categoryId: c.id, workspace: wk }] })).items.every(
					(x) => x.characteristics.name === "merged",
				),
			).toBe(true);
		});

		it("updateOne with bad categoryId throws", async () => {
			const c = await cat();
			const sp = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics(),
			});
			await expect(
				species.updateOne({
					filters: [{ id: sp.id }],
					dto: { categoryId: speciesCategoryId("00000000-0000-4000-8000-000000000099") },
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteOne unbinds linked cultivars by setting speciesId to null", async () => {
			const c = await cat();
			const sp = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics(),
			});
			await cultivar.createOne({
				workspace: wk,
				speciesId: sp.id,
				characteristics: { name: "cv", description: null },
			});
			await species.deleteOne({ filters: [{ id: sp.id }] });
			const { items } = await cultivar.getMany();
			expect(items.some((x) => x.speciesId === null)).toBe(true);
		});

		it("deleteOne allows species when cultivars only have null speciesId", async () => {
			const c = await cat();
			const sp = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "to-delete" }),
			});
			await cultivar.createOne({
				workspace: wk,
				speciesId: null,
				characteristics: { name: "orphan-cv", description: null },
			});
			await species.deleteOne({ filters: [{ id: sp.id }] });
			await expect(species.getOne({ filters: [{ id: sp.id }] })).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteOne throws when missing", async () => {
			await expect(
				species.deleteOne({
					filters: [{ id: speciesId("00000000-0000-4000-8000-00000000fade") }],
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteMany removes free species; skips species referenced by cultivar", async () => {
			const c = await cat();
			const free = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "free-sp" }),
			});
			const blocked = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "blocked-sp" }),
			});
			await cultivar.createOne({
				workspace: wk,
				speciesId: blocked.id,
				characteristics: { name: "c", description: null },
			});
			const { count } = await species.deleteMany({
				filters: [{ id: free.id }, { id: blocked.id }],
			});
			expect(count).toBe(2);
			await expect(species.getOne({ filters: [{ id: blocked.id }] })).rejects.toBeInstanceOf(
				RepositoryNotFoundError,
			);
			const { items } = await cultivar.getMany();
			expect(items.some((x) => x.speciesId === null)).toBe(true);
		});

		it("deleteMany returns 0 when filters match nothing", async () => {
			const { count } = await species.deleteMany({
				filters: [{ characteristics: fixtureSpeciesCharacteristics({ name: "no-such-species-999" }), workspace: wk }],
			});
			expect(count).toBe(0);
		});

		it("getMany single-field filter by id", async () => {
			const c = await cat();
			const sp = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "single-id-sp" }),
			});
			const { items } = await species.getMany({ filters: [{ id: sp.id }] });
			expect(items).toHaveLength(1);
			expect(items[0]?.characteristics.name).toBe("single-id-sp");
		});

		it("getMany multi-field AND: wrong workspaceKey excludes row", async () => {
			const c = await cat();
			const sp = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "ws-and-sp" }),
			});
			const { items } = await species.getMany({ filters: [{ id: sp.id, workspace: wkB }] });
			expect(items).toHaveLength(0);
		});

		it("getMany OR combines categoryId miss with id hit", async () => {
			const c = await cat();
			const sp = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "or-mix-sp" }),
			});
			const { items } = await species.getMany({
				filters: [{ categoryId: speciesCategoryId("00000000-0000-4000-8000-00000000bad"), workspace: wk }, { id: sp.id }],
			});
			expect(items).toHaveLength(1);
			expect(items[0]?.id).toEqual(sp.id);
		});

		it("updateOne OR filters", async () => {
			const c = await cat();
			const sp = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "uo-or-sp" }),
			});
			const u = await species.updateOne({
				filters: [{ id: speciesId("00000000-0000-4000-8000-00000000bad") }, { id: sp.id }],
				dto: { characteristics: fixtureSpeciesCharacteristics({ name: "uo-or-done" }) },
			});
			expect(u.characteristics.name).toBe("uo-or-done");
		});

		it("updateMany OR by id; count 0 when no match", async () => {
			const c = await cat();
			const a = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "um-a" }),
			});
			const b = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "um-b" }),
			});
			const { count } = await species.updateMany({
				filters: [{ id: a.id }, { id: b.id }],
				dto: { characteristics: fixtureSpeciesCharacteristics({ name: "um-both" }) },
			});
			expect(count).toBe(2);
			const z = await species.updateMany({
				filters: [{ characteristics: fixtureSpeciesCharacteristics({ name: "missing-um-sp" }), workspace: wk }],
				dto: { characteristics: fixtureSpeciesCharacteristics({ name: "nope" }) },
			});
			expect(z.count).toBe(0);
		});

		it("deleteOne OR filters", async () => {
			const c = await cat();
			const sp = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "del-or-sp" }),
			});
			await species.deleteOne({
				filters: [{ id: speciesId("00000000-0000-4000-8000-00000000bad") }, { id: sp.id }],
			});
			await expect(species.getOne({ filters: [{ id: sp.id }] })).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteMany OR by id and by characteristics name", async () => {
			const c = await cat();
			const a = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "dm-sp-a" }),
			});
			const b = await species.createOne({
				workspace: wk,
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "dm-sp-b" }),
			});
			const { count } = await species.deleteMany({
				filters: [{ id: a.id }, { id: b.id }],
			});
			expect(count).toBe(2);
		});
	});
}
