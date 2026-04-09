import { speciesCategoryId } from "@backend/infrastructure/integrations/shared/database-ids";
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import { fixtureSpeciesCharacteristics } from "../../../../../helpers/gardening/test-fixtures";
import { resolveGardeningRepositoryPorts } from "./resolve-gardening-repository-ports";

export function registerSpeciesRepositoryContract(
  adapterLabel: string,
  createContainer: () => DependencyContainer,
): void {
  describe(`SpeciesRepository (${adapterLabel})`, () => {
    let speciesCategoryRepository: ReturnType<
      typeof resolveGardeningRepositoryPorts
    >["speciesCategory"];
    let speciesRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["species"];
    let cultivarRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["cultivar"];

    beforeEach(() => {
      const ports = resolveGardeningRepositoryPorts(createContainer());
      speciesCategoryRepository = ports.speciesCategory;
      speciesRepository = ports.species;
      cultivarRepository = ports.cultivar;
    });

    it("create requires existing category", async () => {
      await expect(
        speciesRepository.create({
          categoryId: speciesCategoryId("00000000-0000-4000-8000-000000000001"),
          characteristics: fixtureSpeciesCharacteristics(),
        }),
      ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    });

    it("full CRUD", async () => {
      const cat = await speciesCategoryRepository.create({ title: "Cat" });
      const row = await speciesRepository.create({
        categoryId: cat.id,
        characteristics: fixtureSpeciesCharacteristics({ name: "Basil" }),
      });
      expect(row.characteristics.name).toBe("Basil");

      const got = await speciesRepository.getById({ id: row.id });
      expect(got.id).toEqual(row.id);

      const updated = await speciesRepository.update({
        id: row.id,
        characteristics: fixtureSpeciesCharacteristics({ name: "Sweet basil" }),
      });
      expect(updated.characteristics.name).toBe("Sweet basil");

      const another = await speciesCategoryRepository.create({ title: "Other" });
      const moved = await speciesRepository.update({
        id: row.id,
        categoryId: another.id,
      });
      expect(moved.categoryId).toEqual(another.id);

      await speciesRepository.delete({ id: row.id });
      await expect(speciesRepository.getById({ id: row.id })).rejects.toBeInstanceOf(
        RepositoryNotFoundError,
      );
    });

    it("update with bad categoryId throws", async () => {
      const cat = await speciesCategoryRepository.create({ title: "Cat" });
      const sp = await speciesRepository.create({
        categoryId: cat.id,
        characteristics: fixtureSpeciesCharacteristics(),
      });
      await expect(
        speciesRepository.update({
          id: sp.id,
          categoryId: speciesCategoryId("00000000-0000-4000-8000-000000000099"),
        }),
      ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    });

    it("delete blocks when cultivars exist", async () => {
      const cat = await speciesCategoryRepository.create({ title: "C" });
      const sp = await speciesRepository.create({
        categoryId: cat.id,
        characteristics: fixtureSpeciesCharacteristics(),
      });
      await cultivarRepository.create({
        speciesId: sp.id,
        characteristics: { name: "cv", description: null },
      });
      const conflict = speciesRepository.delete({ id: sp.id });
      await expect(conflict).rejects.toBeInstanceOf(RepositoryConflictError);
      await expect(conflict).rejects.toMatchObject({
        reason: "cultivars-reference-species",
      });
    });
  });
}
