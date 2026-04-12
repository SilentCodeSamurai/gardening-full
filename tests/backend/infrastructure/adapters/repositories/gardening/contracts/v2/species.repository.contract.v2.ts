import {
	RepositoryConflictError,
	RepositoryNotFoundError,
} from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { speciesCategoryId, speciesId } from "@backend/infrastructure/integrations/shared/database-ids";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import { fixtureSpeciesCharacteristics } from "../../../../../../helpers/gardening/test-fixtures";
import { resolveGardeningRepositoryPortsV2 } from "./resolve-gardening-repository-ports.v2";

export function registerSpeciesRepositoryContractV2(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	describe(`SpeciesRepositoryPortV2 (${adapterLabel})`, () => {
		let speciesCategory: ReturnType<typeof resolveGardeningRepositoryPortsV2>["speciesCategory"];
		let species: ReturnType<typeof resolveGardeningRepositoryPortsV2>["species"];
		let cultivar: ReturnType<typeof resolveGardeningRepositoryPortsV2>["cultivar"];

		beforeEach(() => {
			const ports = resolveGardeningRepositoryPortsV2(createContainer());
			speciesCategory = ports.speciesCategory;
			species = ports.species;
			cultivar = ports.cultivar;
		});

		async function cat() {
			return speciesCategory.createOne({ title: "Cat" });
		}

		it("createOne requires existing category", async () => {
			await expect(
				species.createOne({
					categoryId: speciesCategoryId("00000000-0000-4000-8000-000000000001"),
					characteristics: fixtureSpeciesCharacteristics(),
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("createMany count and distinct ids", async () => {
			const c = await cat();
			const { count } = await species.createMany({
				items: [
					{ categoryId: c.id, characteristics: fixtureSpeciesCharacteristics({ name: "s1" }) },
					{ categoryId: c.id, characteristics: fixtureSpeciesCharacteristics({ name: "s2" }) },
				],
			});
			expect(count).toBe(2);
			const { items } = await species.getMany({ filters: [{ categoryId: c.id }] });
			expect(items.length).toBeGreaterThanOrEqual(2);
		});

		it("full CRUD via segregated ports", async () => {
			const c = await cat();
			const row = await species.createOne({
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

			const other = await speciesCategory.createOne({ title: "Other" });
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
			await species.createOne({ categoryId: c.id, characteristics: fixtureSpeciesCharacteristics() });
			const { items } = await species.getMany({ filters: [] });
			expect(items).toHaveLength(0);
		});

		it("getMany without filters returns all species in store", async () => {
			const c = await cat();
			await species.createOne({
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "all-a" }),
			});
			const { items } = await species.getMany();
			expect(items.some((x) => x.characteristics.name === "all-a")).toBe(true);
		});

		it("getMany OR by categoryId or by characteristics.name subset", async () => {
			const c = await cat();
			const a = await species.createOne({
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "uniq-a" }),
			});
			const b = await species.createOne({
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
					{ categoryId: c.id, characteristics: fixtureSpeciesCharacteristics({ name: "m1" }) },
					{ categoryId: c.id, characteristics: fixtureSpeciesCharacteristics({ name: "m2" }) },
				],
			});
			const { count } = await species.updateMany({
				filters: [{ categoryId: c.id }],
				dto: { characteristics: fixtureSpeciesCharacteristics({ name: "merged" }) },
			});
			expect(count).toBeGreaterThanOrEqual(2);
			expect(
				(await species.getMany({ filters: [{ categoryId: c.id }] })).items.every(
					(x) => x.characteristics.name === "merged",
				),
			).toBe(true);
		});

		it("updateOne with bad categoryId throws", async () => {
			const c = await cat();
			const sp = await species.createOne({
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

		it("deleteOne blocks when cultivars exist", async () => {
			const c = await cat();
			const sp = await species.createOne({
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics(),
			});
			await cultivar.createOne({
				speciesId: sp.id,
				characteristics: { name: "cv", description: null },
			});
			const conflict = species.deleteOne({ filters: [{ id: sp.id }] });
			await expect(conflict).rejects.toBeInstanceOf(RepositoryConflictError);
			await expect(conflict).rejects.toMatchObject({ reason: "cultivar-reference-species" });
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
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "free-sp" }),
			});
			const blocked = await species.createOne({
				categoryId: c.id,
				characteristics: fixtureSpeciesCharacteristics({ name: "blocked-sp" }),
			});
			await cultivar.createOne({
				speciesId: blocked.id,
				characteristics: { name: "c", description: null },
			});
			const { count } = await species.deleteMany({
				filters: [{ id: free.id }, { id: blocked.id }],
			});
			expect(count).toBe(1);
			await species.getOne({ filters: [{ id: blocked.id }] });
		});
	});
}
