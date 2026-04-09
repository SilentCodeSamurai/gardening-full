import {
  gardeningEventId,
  locationId,
  plantId,
} from "@backend/infrastructure/integrations/shared/database-ids";
import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import {
  fixtureCultivarCharacteristics,
  fixtureNoteAction,
  fixtureSpeciesCharacteristics,
} from "../../../../../helpers/gardening/test-fixtures";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import { resolveGardeningRepositoryPorts } from "./resolve-gardening-repository-ports";

export function registerGardeningEventRepositoryContract(
  adapterLabel: string,
  createContainer: () => DependencyContainer,
): void {
  describe(`GardeningEventRepository (${adapterLabel})`, () => {
    let speciesCategoryRepository: ReturnType<
      typeof resolveGardeningRepositoryPorts
    >["speciesCategory"];
    let speciesRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["species"];
    let cultivarRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["cultivar"];
    let plantRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["plant"];
    let locationRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["location"];
    let gardeningEventRepository: ReturnType<
      typeof resolveGardeningRepositoryPorts
    >["gardeningEvent"];

    beforeEach(() => {
      const ports = resolveGardeningRepositoryPorts(createContainer());
      speciesCategoryRepository = ports.speciesCategory;
      speciesRepository = ports.species;
      cultivarRepository = ports.cultivar;
      plantRepository = ports.plant;
      locationRepository = ports.location;
      gardeningEventRepository = ports.gardeningEvent;
    });

    async function plantFixture() {
      const cat = await speciesCategoryRepository.create({ title: "C" });
      const species = await speciesRepository.create({
        categoryId: cat.id,
        characteristics: fixtureSpeciesCharacteristics(),
      });
      const cultivar = await cultivarRepository.create({
        speciesId: species.id,
        characteristics: fixtureCultivarCharacteristics(),
      });
      const plant = await plantRepository.create({
        title: "p",
        description: null,
        cultivarId: cultivar.id,
      });
      return { cultivar, plant, species };
    }

    it("bindToPlant and getForPlant", async () => {
      const { plant } = await plantFixture();
      const action = fixtureNoteAction();
      const ev = await gardeningEventRepository.create({
        action,
      });
      await gardeningEventRepository.bindToPlant({ id: ev.id, plantId: plant.id });
      const { items } = await gardeningEventRepository.getForPlant({ plantId: plant.id });
      expect(items).toHaveLength(1);
      const [first] = items;
      expect(first).toBeDefined();
      expect(first.id).toEqual(ev.id);
    });

    it("bindToLocation and getForLocation", async () => {
      const loc = await locationRepository.create({ name: "GH" });
      const action = fixtureNoteAction();
      const ev = await gardeningEventRepository.create({
        action,
      });
      await gardeningEventRepository.bindToLocation({ id: ev.id, locationId: loc.id });
      const { items } = await gardeningEventRepository.getForLocation({
        locationId: loc.id,
      });
      expect(items).toHaveLength(1);
    });

    it("getBindingsForEvent returns linked plants and locations", async () => {
      const { plant } = await plantFixture();
      const loc = await locationRepository.create({ name: "Bed" });
      const ev = await gardeningEventRepository.create({
        action: fixtureNoteAction(),
      });
      await gardeningEventRepository.bindToPlant({ id: ev.id, plantId: plant.id });
      await gardeningEventRepository.bindToLocation({ id: ev.id, locationId: loc.id });
      const b = await gardeningEventRepository.getBindingsForEvent({ id: ev.id });
      expect(b.plantIds.map(String)).toContain(String(plant.id));
      expect(b.locationIds.map(String)).toContain(String(loc.id));
    });

    it("getBindingsForEvent throws when event missing", async () => {
      await expect(
        gardeningEventRepository.getBindingsForEvent({
          id: gardeningEventId("00000000-0000-4000-8000-000000000001"),
        }),
      ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    });

    it("bindToPlant throws for missing event or plant", async () => {
      const { plant } = await plantFixture();
      await expect(
        gardeningEventRepository.bindToPlant({
          id: gardeningEventId("00000000-0000-4000-8000-000000000001"),
          plantId: plant.id,
        }),
      ).rejects.toBeInstanceOf(RepositoryNotFoundError);
      const ev = await gardeningEventRepository.create({
        action: fixtureNoteAction(),
      });
      await expect(
        gardeningEventRepository.bindToPlant({
          id: ev.id,
          plantId: plantId("00000000-0000-4000-8000-000000000002"),
        }),
      ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    });

    it("delete clears junction links", async () => {
      const { plant } = await plantFixture();
      const loc = await locationRepository.create({ name: "B" });
      const ev = await gardeningEventRepository.create({
        action: fixtureNoteAction(),
      });
      await gardeningEventRepository.bindToPlant({ id: ev.id, plantId: plant.id });
      await gardeningEventRepository.bindToLocation({ id: ev.id, locationId: loc.id });
      await gardeningEventRepository.delete({ id: ev.id });
      const forPlant = await gardeningEventRepository.getForPlant({ plantId: plant.id });
      const forLoc = await gardeningEventRepository.getForLocation({ locationId: loc.id });
      expect(forPlant.items).toHaveLength(0);
      expect(forLoc.items).toHaveLength(0);
    });

    it("bindToLocation throws when location missing", async () => {
      const ev = await gardeningEventRepository.create({
        action: fixtureNoteAction(),
      });
      await expect(
        gardeningEventRepository.bindToLocation({
          id: ev.id,
          locationId: locationId("00000000-0000-4000-8000-000000000099"),
        }),
      ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    });
  });
}
