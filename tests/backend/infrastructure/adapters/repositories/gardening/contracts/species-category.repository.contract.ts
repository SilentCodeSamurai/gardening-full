import { speciesCategoryId } from "@backend/infrastructure/integrations/shared/database-ids";
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import { resolveGardeningRepositoryPorts } from "./resolve-gardening-repository-ports";

export function registerSpeciesCategoryRepositoryContract(
  adapterLabel: string,
  createContainer: () => DependencyContainer,
): void {
  describe(`SpeciesCategoryRepository (${adapterLabel})`, () => {
    let speciesCategoryRepository: ReturnType<
      typeof resolveGardeningRepositoryPorts
    >["speciesCategory"];
    let speciesRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["species"];

    beforeEach(() => {
      const ports = resolveGardeningRepositoryPorts(createContainer());
      speciesCategoryRepository = ports.speciesCategory;
      speciesRepository = ports.species;
    });

    it("create, getById, getAll, update", async () => {
      const row = await speciesCategoryRepository.create({ title: "Herbs" });
      expect(row.title).toBe("Herbs");
      expect(row.id).toBeDefined();

      const got = await speciesCategoryRepository.getById({ id: row.id });
      expect(got.title).toBe("Herbs");

      const { items } = await speciesCategoryRepository.getAll();
      expect(items).toHaveLength(1);

      const updated = await speciesCategoryRepository.update({
        id: row.id,
        title: "Herbs 2",
      });
      expect(updated.title).toBe("Herbs 2");
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(row.updatedAt.getTime());
    });

    it("getById throws when missing", async () => {
      await expect(
        speciesCategoryRepository.getById({
          id: speciesCategoryId("00000000-0000-4000-8000-000000000000"),
        }),
      ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    });

    it("delete returns id and removes row", async () => {
      const row = await speciesCategoryRepository.create({ title: "X" });
      const deleted = await speciesCategoryRepository.delete({ id: row.id });
      expect(deleted).toBe(row.id);
      await expect(speciesCategoryRepository.getById({ id: row.id })).rejects.toBeInstanceOf(
        RepositoryNotFoundError,
      );
    });

    it("delete blocks when species reference category", async () => {
      const cat = await speciesCategoryRepository.create({ title: "C" });
      await speciesRepository.create({
        categoryId: cat.id,
        characteristics: { name: "S", description: null },
      });
      const conflict = speciesCategoryRepository.delete({ id: cat.id });
      await expect(conflict).rejects.toBeInstanceOf(RepositoryConflictError);
      await expect(conflict).rejects.toMatchObject({
        reason: "species-reference-category",
      });
    });
  });
}
