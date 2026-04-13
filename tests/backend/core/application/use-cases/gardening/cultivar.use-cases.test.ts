import {
  CultivarCreateUseCase,
  CultivarDeleteUseCase,
  CultivarGetAllUseCase,
  CultivarGetByIdUseCase,
  CultivarGetFullByIdUseCase,
  CultivarUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/cultivar.use-cases";
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { PlantCreateUseCase } from "@backend/core/application/use-cases/gardening/plant.use-cases";
import { createTestUseCaseContext } from "../create-test-use-case-context";
import { cultivarId, speciesId } from "@backend/infrastructure/integrations/shared/database-ids";
import { describe, expect, it } from "vitest";

import { createUseCaseTestContainer } from "./create-use-case-test-container";
import { seedMinimalCatalog } from "../../../../helpers/gardening/seed-minimal-catalog";
import { fixtureCultivarCharacteristics } from "../../../../helpers/gardening/test-fixtures";

describe("Cultivar use-cases", () => {
  it("CRUD happy path", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { species } = await seedMinimalCatalog(c);
    const create = c.resolve(CultivarCreateUseCase);
    const getById = c.resolve(CultivarGetByIdUseCase);
    const getAll = c.resolve(CultivarGetAllUseCase);
    const update = c.resolve(CultivarUpdateUseCase);
    const del = c.resolve(CultivarDeleteUseCase);

    const row = await create.execute({
      context,
      dto: {
        speciesId: species.id,
        characteristics: fixtureCultivarCharacteristics({ name: "A" }),
      },
    });
    expect((await getById.execute({ context, dto: { id: row.id } })).speciesId).toEqual(species.id);
    expect((await getAll.execute({ context })).items.some((x) => x.id === row.id)).toBe(true);

    const updated = await update.execute({
      context,
      dto: { id: row.id, characteristics: fixtureCultivarCharacteristics({ name: "B" }) },
    });
    expect(updated.characteristics.name).toBe("B");

    await del.execute({ context, dto: { id: row.id } });
    expect((await getAll.execute({ context })).items.some((x) => x.id === row.id)).toBe(false);
    const missing = getById.execute({ context, dto: { id: row.id } });
    await expect(missing).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("getFullById returns embedded species", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { species, cultivar } = await seedMinimalCatalog(c);
    const full = await c.resolve(CultivarGetFullByIdUseCase).execute({ context, dto: { id: cultivar.id } });
    expect(full.species.id).toEqual(species.id);
    expect(full.id).toEqual(cultivar.id);
  });

  it("getById and getFullById throw when cultivar missing", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const ghost = cultivarId();
    await expect(
      c.resolve(CultivarGetByIdUseCase).execute({ context, dto: { id: ghost } }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    await expect(
      c.resolve(CultivarGetFullByIdUseCase).execute({ context, dto: { id: ghost } }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("create throws when speciesId invalid", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    await expect(
      c.resolve(CultivarCreateUseCase).execute({
        context,
        dto: { speciesId: speciesId(), characteristics: fixtureCultivarCharacteristics() },
      }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("update throws when cultivar missing", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    await expect(
      c.resolve(CultivarUpdateUseCase).execute({
        context,
        dto: { id: cultivarId(), characteristics: fixtureCultivarCharacteristics() },
      }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("update throws when speciesId invalid", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { cultivar } = await seedMinimalCatalog(c);
    await expect(
      c.resolve(CultivarUpdateUseCase).execute({
        context,
        dto: { id: cultivar.id, speciesId: speciesId() },
      }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("delete throws when missing", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    await expect(
      c.resolve(CultivarDeleteUseCase).execute({ context, dto: { id: cultivarId() } }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("delete throws when plants still reference cultivar", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { cultivar } = await seedMinimalCatalog(c);
    await c.resolve(PlantCreateUseCase).execute({
      context,
      dto: { cultivarId: cultivar.id, title: null, description: null },
    });
    const conflict = c.resolve(CultivarDeleteUseCase).execute({ context, dto: { id: cultivar.id } });
    await expect(conflict).rejects.toBeInstanceOf(RepositoryConflictError);
    await expect(conflict).rejects.toMatchObject({
      reason: "plant-reference-cultivar",
      context: { cultivarId: cultivar.id },
    });
  });
});
