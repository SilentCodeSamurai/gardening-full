import { cultivarId, plantId } from "@backend/infrastructure/integrations/shared/database-ids";
import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
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
    let speciesCategoryRepository: ReturnType<
      typeof resolveGardeningRepositoryPorts
    >["speciesCategory"];
    let speciesRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["species"];
    let cultivarRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["cultivar"];
    let plantRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["plant"];
    let gardeningEventRepository: ReturnType<
      typeof resolveGardeningRepositoryPorts
    >["gardeningEvent"];

    beforeEach(() => {
      const ports = resolveGardeningRepositoryPorts(createContainer());
      speciesCategoryRepository = ports.speciesCategory;
      speciesRepository = ports.species;
      cultivarRepository = ports.cultivar;
      plantRepository = ports.plant;
      gardeningEventRepository = ports.gardeningEvent;
    });

    async function seedAndCultivar() {
      const cat = await speciesCategoryRepository.create({ title: "C" });
      const species = await speciesRepository.create({
        categoryId: cat.id,
        characteristics: fixtureSpeciesCharacteristics(),
      });
      const cultivar = await cultivarRepository.create({
        speciesId: species.id,
        characteristics: fixtureCultivarCharacteristics(),
      });
      return { cultivar, species };
    }

    it("create requires cultivar row to exist", async () => {
      await seedAndCultivar();
      const ghostCultivarId = cultivarId("00000000-0000-4000-8000-00000000dead");
      await expect(
        plantRepository.create({
          title: null,
          description: null,
          cultivarId: ghostCultivarId,
        }),
      ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    });

    it("createMany reuses species/cultivar and produces distinct ids", async () => {
      const { cultivar } = await seedAndCultivar();
      const { items } = await plantRepository.createMany([
        {
          title: null,
          description: null,
          cultivarId: cultivar.id,
        },
        {
          title: null,
          description: null,
          cultivarId: cultivar.id,
        },
        {
          title: null,
          description: null,
          cultivarId: cultivar.id,
        },
      ]);
      expect(items).toHaveLength(3);
      const ids = new Set(items.map((p) => p.id as string));
      expect(ids.size).toBe(3);
      expect(items.every((p) => p.cultivar.species.id === cultivar.speciesId)).toBe(true);
      expect(items.every((p) => p.cultivar.id === cultivar.id)).toBe(true);
    });

    it("createMany persists the supplied rows as-is", async () => {
      const { cultivar } = await seedAndCultivar();
      const { items } = await plantRepository.createMany([
        {
          title: "Patch #5",
          description: null,
          cultivarId: cultivar.id,
        },
        {
          title: "Patch #6",
          description: null,
          cultivarId: cultivar.id,
        },
      ]);
      expect(items.map((p) => p.title)).toEqual(["Patch #5", "Patch #6"]);
    });

    it("getListByIds preserves input order and skips missing", async () => {
      const { cultivar } = await seedAndCultivar();
      const a = await plantRepository.create({
        title: "a",
        description: null,
        cultivarId: cultivar.id,
      });
      const b = await plantRepository.create({
        title: "b",
        description: null,
        cultivarId: cultivar.id,
      });
      const missing = plantId("00000000-0000-4000-8000-00000000aaaa");
      const { items } = await plantRepository.getListByIds({
        ids: [b.id, missing, a.id],
      });
      expect(items.map((p) => p.title)).toEqual(["b", "a"]);
    });

    it("getByCultivarId", async () => {
      const { cultivar } = await seedAndCultivar();
      await plantRepository.create({
        title: "p1",
        description: null,
        cultivarId: cultivar.id,
      });
      const byCultivar = await plantRepository.getByCultivarId({ cultivarId: cultivar.id });
      expect(byCultivar.items).toHaveLength(1);
    });

    it("update with new cultivar requires cultivar to exist", async () => {
      const { cultivar } = await seedAndCultivar();
      const plant = await plantRepository.create({
        title: null,
        description: null,
        cultivarId: cultivar.id,
      });
      await expect(
        plantRepository.update({
          id: plant.id,
          cultivarId: cultivarId("00000000-0000-4000-8000-00000000beef"),
        }),
      ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    });

    it("delete clears gardening event↔plant links and removes the plant", async () => {
      const { cultivar } = await seedAndCultivar();
      const plant = await plantRepository.create({
        title: null,
        description: null,
        cultivarId: cultivar.id,
      });
      const ev = await gardeningEventRepository.create({
        action: fixtureNoteAction(),
      });
      await gardeningEventRepository.bindToPlant({ id: ev.id, plantId: plant.id });
      const before = await gardeningEventRepository.getBindingsForEvent({ id: ev.id });
      expect(before.plantIds.map((id) => id as string)).toContain(plant.id as string);

      await plantRepository.delete({ id: plant.id });

      await expect(plantRepository.getById({ id: plant.id })).rejects.toBeInstanceOf(
        RepositoryNotFoundError,
      );
      const after = await gardeningEventRepository.getBindingsForEvent({ id: ev.id });
      expect(after.plantIds).toHaveLength(0);
      const stillThere = await gardeningEventRepository.getById({ id: ev.id });
      expect(stillThere.id).toEqual(ev.id);
    });

    it("deleteMany removes existing plants in request order and skips missing ids", async () => {
      const { cultivar } = await seedAndCultivar();
      const a = await plantRepository.create({
        title: "a",
        description: null,
        cultivarId: cultivar.id,
      });
      const b = await plantRepository.create({
        title: "b",
        description: null,
        cultivarId: cultivar.id,
      });
      const ghost = plantId("00000000-0000-4000-8000-00000000aaaa");
      const { deletedIds } = await plantRepository.deleteMany({
        ids: [b.id, ghost, a.id],
      });
      expect(deletedIds).toEqual([b.id, a.id]);
      await expect(plantRepository.getById({ id: a.id })).rejects.toBeInstanceOf(
        RepositoryNotFoundError,
      );
      await expect(plantRepository.getById({ id: b.id })).rejects.toBeInstanceOf(
        RepositoryNotFoundError,
      );
    });

    it("deleteMany clears event links for each removed plant", async () => {
      const { cultivar } = await seedAndCultivar();
      const p1 = await plantRepository.create({
        title: null,
        description: null,
        cultivarId: cultivar.id,
      });
      const p2 = await plantRepository.create({
        title: null,
        description: null,
        cultivarId: cultivar.id,
      });
      const ev = await gardeningEventRepository.create({
        action: fixtureNoteAction(),
      });
      await gardeningEventRepository.bindToPlant({ id: ev.id, plantId: p1.id });
      await gardeningEventRepository.bindToPlant({ id: ev.id, plantId: p2.id });
      await plantRepository.deleteMany({ ids: [p1.id, p2.id] });
      const bindings = await gardeningEventRepository.getBindingsForEvent({ id: ev.id });
      expect(bindings.plantIds).toHaveLength(0);
    });
  });
}
