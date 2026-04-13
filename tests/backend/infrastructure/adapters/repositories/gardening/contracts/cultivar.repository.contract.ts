import {
	RepositoryConflictError,
	RepositoryNotFoundError,
} from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { cultivarId, speciesId } from "@backend/infrastructure/integrations/shared/database-ids";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import {
	fixtureCultivarCharacteristics,
	fixtureSpeciesCharacteristics,
} from "../../../../../helpers/gardening/test-fixtures";
import {
	contractTestWorkspaceKey as wk,
	contractTestWorkspaceKeyB as wkB,
} from "../../shared/test-workspace-keys";
import { resolveGardeningRepositoryPorts } from "./resolve-gardening-repository-ports";

export function registerCultivarRepositoryContract(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	describe(`CultivarRepositoryPort (${adapterLabel})`, () => {
		let speciesCategory: ReturnType<typeof resolveGardeningRepositoryPorts>["speciesCategory"];
		let species: ReturnType<typeof resolveGardeningRepositoryPorts>["species"];
		let cultivar: ReturnType<typeof resolveGardeningRepositoryPorts>["cultivar"];
		let plant: ReturnType<typeof resolveGardeningRepositoryPorts>["plant"];

		beforeEach(() => {
			const ports = resolveGardeningRepositoryPorts(createContainer());
			speciesCategory = ports.speciesCategory;
			species = ports.species;
			cultivar = ports.cultivar;
			plant = ports.plant;
		});

		async function seedSpecies() {
			const cat = await speciesCategory.createOne({ workspaceKey: wk, title: "C" });
			return species.createOne({
				workspaceKey: wk,
				categoryId: cat.id,
				characteristics: fixtureSpeciesCharacteristics(),
			});
		}

		it("createOne requires species", async () => {
			await expect(
				cultivar.createOne({
					workspaceKey: wk,
					speciesId: speciesId("00000000-0000-4000-8000-000000000001"),
					characteristics: fixtureCultivarCharacteristics(),
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("createMany returns count", async () => {
			const sp = await seedSpecies();
			const { count } = await cultivar.createMany({
				items: [
					{
						workspaceKey: wk,
						speciesId: sp.id,
						characteristics: fixtureCultivarCharacteristics({ name: "c1" }),
					},
					{
						workspaceKey: wk,
						speciesId: sp.id,
						characteristics: fixtureCultivarCharacteristics({ name: "c2" }),
					},
				],
			});
			expect(count).toBe(2);
		});

		it("getOne and getFullOne by id", async () => {
			const sp = await seedSpecies();
			const cv = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "Genovese" }),
			});
			const one = await cultivar.getOne({ filters: [{ id: cv.id }] });
			expect(one.characteristics.name).toBe("Genovese");
			const full = await cultivar.getFullOne({ filters: [{ id: cv.id }] });
			expect(full.species.id).toEqual(sp.id);
		});

		it("getFullOne OR filters", async () => {
			const sp = await seedSpecies();
			const cv = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "OR-test" }),
			});
			const full = await cultivar.getFullOne({
				filters: [{ speciesId: speciesId("00000000-0000-4000-8000-00000000bad") }, { id: cv.id }],
			});
			expect(full.id).toEqual(cv.id);
		});

		it("getFullOne throws when missing", async () => {
			await expect(
				cultivar.getFullOne({ filters: [{ id: cultivarId("00000000-0000-4000-8000-00000000nope") }] }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("getMany without filters and with [] / OR", async () => {
			const sp = await seedSpecies();
			await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "g1" }),
			});
			const { items: all } = await cultivar.getMany();
			expect(all.some((x) => x.characteristics.name === "g1")).toBe(true);
			const { items: empty } = await cultivar.getMany({ filters: [] });
			expect(empty).toHaveLength(0);
		});

		it("getMany filters by speciesId", async () => {
			const sp = await seedSpecies();
			const cv = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics(),
			});
			const { items } = await cultivar.getMany({ filters: [{ speciesId: sp.id, workspaceKey: wk }] });
			expect(items.some((x) => x.id === cv.id)).toBe(true);
		});

		it("updateOne and updateMany", async () => {
			const sp = await seedSpecies();
			const a = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "u1" }),
			});
			const b = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "u2" }),
			});
			const one = await cultivar.updateOne({
				filters: [{ id: a.id }],
				dto: { characteristics: fixtureCultivarCharacteristics({ name: "patched" }) },
			});
			expect(one.characteristics.name).toBe("patched");
			const { count } = await cultivar.updateMany({
				filters: [{ id: b.id }],
				dto: { characteristics: fixtureCultivarCharacteristics({ name: "batch" }) },
			});
			expect(count).toBe(1);
		});

		it("updateOne throws for missing cultivar", async () => {
			await expect(
				cultivar.updateOne({
					filters: [{ id: cultivarId("00000000-0000-4000-8000-00000000dead") }],
					dto: { characteristics: fixtureCultivarCharacteristics() },
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("updateOne throws for invalid speciesId", async () => {
			const sp = await seedSpecies();
			const cv = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics(),
			});
			await expect(
				cultivar.updateOne({
					filters: [{ id: cv.id }],
					dto: { speciesId: speciesId("00000000-0000-4000-8000-00000000bad") },
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteOne removes row", async () => {
			const sp = await seedSpecies();
			const cv = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics(),
			});
			await cultivar.deleteOne({ filters: [{ id: cv.id }] });
			await expect(cultivar.getOne({ filters: [{ id: cv.id }] })).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteOne blocks when plants reference cultivar", async () => {
			const sp = await seedSpecies();
			const cv = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics(),
			});
			await plant.createOne({
				workspaceKey: wk,
				title: null,
				description: null,
				cultivarId: cv.id,
			});
			const conflict = cultivar.deleteOne({ filters: [{ id: cv.id }] });
			await expect(conflict).rejects.toBeInstanceOf(RepositoryConflictError);
			await expect(conflict).rejects.toMatchObject({ reason: "plant-reference-cultivar" });
		});

		it("deleteMany removes only unblocked cultivars", async () => {
			const sp = await seedSpecies();
			const free = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "free-c" }),
			});
			const blocked = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "blocked-c" }),
			});
			await plant.createOne({
				workspaceKey: wk,
				title: null,
				description: null,
				cultivarId: blocked.id,
			});
			const { count } = await cultivar.deleteMany({ filters: [{ id: free.id }, { id: blocked.id }] });
			expect(count).toBe(1);
			await cultivar.getOne({ filters: [{ id: blocked.id }] });
		});

		it("getOne OR filters", async () => {
			const sp = await seedSpecies();
			const cv = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "go-or" }),
			});
			const got = await cultivar.getOne({
				filters: [{ id: cultivarId("00000000-0000-4000-8000-00000000bad") }, { id: cv.id }],
			});
			expect(got.id).toEqual(cv.id);
		});

		it("getOne throws when missing", async () => {
			await expect(
				cultivar.getOne({ filters: [{ id: cultivarId("00000000-0000-4000-8000-00000000nope") }] }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("getMany OR unions rows by two ids", async () => {
			const sp = await seedSpecies();
			const a = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "or-a" }),
			});
			const b = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "or-b" }),
			});
			const { items } = await cultivar.getMany({ filters: [{ id: a.id }, { id: b.id }] });
			expect(items).toHaveLength(2);
		});

		it("getMany multi-field AND: wrong workspaceKey excludes row", async () => {
			const sp = await seedSpecies();
			const cv = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "ws-and-cv" }),
			});
			const { items } = await cultivar.getMany({ filters: [{ id: cv.id, workspaceKey: wkB }] });
			expect(items).toHaveLength(0);
		});

		it("getMany OR id miss with characteristics name hit", async () => {
			const sp = await seedSpecies();
			const cv = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "cv-or-name" }),
			});
			const { items } = await cultivar.getMany({
				filters: [
					{ id: cultivarId("00000000-0000-4000-8000-00000000bad") },
					{ characteristics: fixtureCultivarCharacteristics({ name: "cv-or-name" }), workspaceKey: wk },
				],
			});
			expect(items).toHaveLength(1);
			expect(items[0]?.id).toEqual(cv.id);
		});

		it("updateOne OR filters", async () => {
			const sp = await seedSpecies();
			const cv = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "uo-or-cv" }),
			});
			const u = await cultivar.updateOne({
				filters: [{ id: cultivarId("00000000-0000-4000-8000-00000000bad") }, { id: cv.id }],
				dto: { characteristics: fixtureCultivarCharacteristics({ name: "uo-or-done" }) },
			});
			expect(u.characteristics.name).toBe("uo-or-done");
		});

		it("updateMany OR by id; count 0 when no match", async () => {
			const sp = await seedSpecies();
			const a = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "um-cv-a" }),
			});
			const b = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "um-cv-b" }),
			});
			const { count } = await cultivar.updateMany({
				filters: [{ id: a.id }, { id: b.id }],
				dto: { characteristics: fixtureCultivarCharacteristics({ name: "um-cv-both" }) },
			});
			expect(count).toBe(2);
			const z = await cultivar.updateMany({
				filters: [{ characteristics: fixtureCultivarCharacteristics({ name: "missing-cv-xyz" }), workspaceKey: wk }],
				dto: { characteristics: fixtureCultivarCharacteristics({ name: "nope" }) },
			});
			expect(z.count).toBe(0);
		});

		it("deleteOne OR filters", async () => {
			const sp = await seedSpecies();
			const cv = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "del-or-cv" }),
			});
			await cultivar.deleteOne({
				filters: [{ id: cultivarId("00000000-0000-4000-8000-00000000bad") }, { id: cv.id }],
			});
			await expect(cultivar.getOne({ filters: [{ id: cv.id }] })).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteMany OR by id and by name; count 0 when nothing matches", async () => {
			const sp = await seedSpecies();
			const a = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "dm-cv-a" }),
			});
			const b = await cultivar.createOne({
				workspaceKey: wk,
				speciesId: sp.id,
				characteristics: fixtureCultivarCharacteristics({ name: "dm-cv-b" }),
			});
			const { count } = await cultivar.deleteMany({
				filters: [{ id: a.id }, { characteristics: fixtureCultivarCharacteristics({ name: "dm-cv-b" }), workspaceKey: wk }],
			});
			expect(count).toBe(2);
			const z = await cultivar.deleteMany({
				filters: [{ characteristics: fixtureCultivarCharacteristics({ name: "missing-dm-cv" }), workspaceKey: wk }],
			});
			expect(z.count).toBe(0);
		});
	});
}
