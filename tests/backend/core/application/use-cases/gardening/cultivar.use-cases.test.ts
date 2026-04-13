import {
  CultivarCreateUseCase,
  CultivarDeleteManyUseCase,
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
import { beforeEach, describe, expect, it } from "vitest";

import { createUseCaseTestContainer } from "./create-use-case-test-container";
import { seedMinimalCatalog } from "../../../../helpers/gardening/seed-minimal-catalog";
import { fixtureCultivarCharacteristics } from "../../../../helpers/gardening/test-fixtures";

describe("Cultivar use-cases", () => {
  let c: ReturnType<typeof createUseCaseTestContainer>;
  let context: ReturnType<typeof createTestUseCaseContext>;

  beforeEach(() => {
    c = createUseCaseTestContainer();
    context = createTestUseCaseContext();
  });

  it("CRUD happy path", async () => {
    const { species } = await seedMinimalCatalog(c);
    const create = c.resolve(CultivarCreateUseCase);
    const getById = c.resolve(CultivarGetByIdUseCase);
    const getAll = c.resolve(CultivarGetAllUseCase);
    const update = c.resolve(CultivarUpdateUseCase);
    const del = c.resolve(CultivarDeleteUseCase);

    const row = await create.run({
      context,
      dto: {
        speciesId: species.id,
        characteristics: fixtureCultivarCharacteristics({ name: "A" }),
      },
    });
    expect((await getById.run({ context, dto: { id: row.id } })).speciesId).toEqual(species.id);
    expect((await getAll.run({ context })).items.some((x) => x.id === row.id)).toBe(true);

    const updated = await update.run({
      context,
      dto: { id: row.id, characteristics: fixtureCultivarCharacteristics({ name: "B" }) },
    });
    expect(updated.characteristics.name).toBe("B");

    await del.run({ context, dto: { id: row.id } });
    expect((await getAll.run({ context })).items.some((x) => x.id === row.id)).toBe(false);
    const missing = getById.run({ context, dto: { id: row.id } });
    await expect(missing).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("getFullById returns embedded species", async () => {
    const { species, cultivar } = await seedMinimalCatalog(c);
    const full = await c.resolve(CultivarGetFullByIdUseCase).run({ context, dto: { id: cultivar.id } });
    expect(full.species.id).toEqual(species.id);
    expect(full.id).toEqual(cultivar.id);
  });

  it("getById and getFullById throw when cultivar missing", async () => {
    const ghost = "missing-cultivar-id" as never;
    await expect(
      c.resolve(CultivarGetByIdUseCase).run({ context, dto: { id: ghost } }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    await expect(
      c.resolve(CultivarGetFullByIdUseCase).run({ context, dto: { id: ghost } }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("create throws when speciesId invalid", async () => {
    await expect(
      c.resolve(CultivarCreateUseCase).run({
        context,
        dto: { speciesId: "missing-species-id" as never, characteristics: fixtureCultivarCharacteristics() },
      }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("update throws when cultivar missing", async () => {
    await expect(
      c.resolve(CultivarUpdateUseCase).run({
        context,
        dto: { id: "missing-cultivar-id" as never, characteristics: fixtureCultivarCharacteristics() },
      }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("update throws when speciesId invalid", async () => {
    const { cultivar } = await seedMinimalCatalog(c);
    await expect(
      c.resolve(CultivarUpdateUseCase).run({
        context,
        dto: { id: cultivar.id, speciesId: "missing-species-id" as never },
      }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("delete throws when missing", async () => {
    await expect(
      c.resolve(CultivarDeleteUseCase).run({ context, dto: { id: "missing-cultivar-id" as never } }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("delete throws when plants still reference cultivar", async () => {
    const { cultivar } = await seedMinimalCatalog(c);
    await c.resolve(PlantCreateUseCase).run({
      context,
      dto: { cultivarId: cultivar.id, title: null, description: null },
    });
    const conflict = c.resolve(CultivarDeleteUseCase).run({ context, dto: { id: cultivar.id } });
    await expect(conflict).rejects.toBeInstanceOf(RepositoryConflictError);
    await expect(conflict).rejects.toMatchObject({
      reason: "plant-reference-cultivar",
      context: { cultivarId: cultivar.id },
    });
  });

  it("deleteMany removes requested cultivars", async () => {
    const { species } = await seedMinimalCatalog(c);
    const create = c.resolve(CultivarCreateUseCase);
    const deleteMany = c.resolve(CultivarDeleteManyUseCase);
    const getAll = c.resolve(CultivarGetAllUseCase);

    const c1 = await create.run({
      context,
      dto: { speciesId: species.id, characteristics: fixtureCultivarCharacteristics({ name: "DM-1" }) },
    });
    const c2 = await create.run({
      context,
      dto: { speciesId: species.id, characteristics: fixtureCultivarCharacteristics({ name: "DM-2" }) },
    });

    const out = await deleteMany.run({ context, dto: { ids: [c1.id, c2.id] } });
    expect(out.count).toBe(2);

    const remaining = await getAll.run({ context });
    expect(remaining.items.some((x) => x.id === c1.id)).toBe(false);
    expect(remaining.items.some((x) => x.id === c2.id)).toBe(false);
  });
});
