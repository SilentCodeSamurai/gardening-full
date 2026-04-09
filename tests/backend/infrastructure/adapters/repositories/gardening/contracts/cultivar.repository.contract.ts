import { speciesId } from "@backend/infrastructure/integrations/shared/database-ids";
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import {
  fixtureCultivarCharacteristics,
  fixtureSpeciesCharacteristics,
} from "../../../../../helpers/gardening/test-fixtures";
import { resolveGardeningRepositoryPorts } from "./resolve-gardening-repository-ports";

export function registerCultivarRepositoryContract(
  adapterLabel: string,
  createContainer: () => DependencyContainer,
): void {
  describe(`CultivarRepository (${adapterLabel})`, () => {
    let speciesCategoryRepository: ReturnType<
      typeof resolveGardeningRepositoryPorts
    >["speciesCategory"];
    let speciesRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["species"];
    let cultivarRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["cultivar"];
    let plantRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["plant"];

    beforeEach(() => {
      const ports = resolveGardeningRepositoryPorts(createContainer());
      speciesCategoryRepository = ports.speciesCategory;
      speciesRepository = ports.species;
      cultivarRepository = ports.cultivar;
      plantRepository = ports.plant;
    });

    async function seedSpecies() {
      const cat = await speciesCategoryRepository.create({ title: "C" });
      return speciesRepository.create({
        categoryId: cat.id,
        characteristics: fixtureSpeciesCharacteristics(),
      });
    }

    it("create requires species", async () => {
      await expect(
        cultivarRepository.create({
          speciesId: speciesId("00000000-0000-4000-8000-000000000001"),
          characteristics: fixtureCultivarCharacteristics(),
        }),
      ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    });

    it("getFullById joins species", async () => {
      const species = await seedSpecies();
      const cv = await cultivarRepository.create({
        speciesId: species.id,
        characteristics: fixtureCultivarCharacteristics({ name: "Genovese" }),
      });
      const full = await cultivarRepository.getFullById({ id: cv.id });
      expect(full.species.id).toEqual(species.id);
      expect(full.characteristics.name).toBe("Genovese");
    });

    it("delete removes row", async () => {
      const species = await seedSpecies();
      const cv = await cultivarRepository.create({
        speciesId: species.id,
        characteristics: fixtureCultivarCharacteristics(),
      });
      await cultivarRepository.delete({ id: cv.id });
      await expect(cultivarRepository.getById({ id: cv.id })).rejects.toBeInstanceOf(
        RepositoryNotFoundError,
      );
    });

    it("delete blocks when plants reference cultivar", async () => {
      const species = await seedSpecies();
      const cv = await cultivarRepository.create({
        speciesId: species.id,
        characteristics: fixtureCultivarCharacteristics(),
      });
      await plantRepository.create({
        title: null,
        description: null,
        cultivarId: cv.id,
      });
      const conflict = cultivarRepository.delete({ id: cv.id });
      await expect(conflict).rejects.toBeInstanceOf(RepositoryConflictError);
      await expect(conflict).rejects.toMatchObject({
        reason: "plants-reference-cultivar",
      });
    });
  });
}
