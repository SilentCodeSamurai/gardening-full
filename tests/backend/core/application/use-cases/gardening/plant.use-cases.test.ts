import {
  PlantCreateManyUseCase,
  PlantCreateUseCase,
  PlantDeleteManyUseCase,
  PlantDeleteManyUseCasePlacedEntityError,
  PlantDeleteUseCase,
  PlantDeleteUseCasePlacedEntityError,
  PlantGetAllUseCase,
  PlantGetByIdUseCase,
  PlantUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/plant.use-cases";
import {
  SpatialNodeCreateUseCase,
  SpatialNodeGetAllUseCase,
} from "@backend/core/application/use-cases/spatial/spatial.use-cases";
import {
  RepositoryNotFoundError,
  RepositoryValidationError,
} from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { createTestUseCaseContext } from "../create-test-use-case-context";
import { describe, expect, it } from "vitest";

import { createUseCaseTestContainer } from "./create-use-case-test-container";
import { seedMinimalCatalog } from "../../../../helpers/gardening/seed-minimal-catalog";

describe("Plant use-cases", () => {
  it("create, getById, getAll, update, delete happy path", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { cultivar } = await seedMinimalCatalog(c);

    const create = c.resolve(PlantCreateUseCase);
    const getById = c.resolve(PlantGetByIdUseCase);
    const getAll = c.resolve(PlantGetAllUseCase);
    const update = c.resolve(PlantUpdateUseCase);
    const del = c.resolve(PlantDeleteUseCase);

    const p = await create.execute({
      context,
      dto: { cultivarId: cultivar.id, title: "Tomato", description: null },
    });

    expect((await getById.execute({ context, dto: { id: p.id } })).id).toEqual(p.id);
    expect((await getAll.execute({ context })).items.length).toBeGreaterThanOrEqual(1);

    const updated = await update.execute({ context, dto: { id: p.id, title: "Cherry tomato" } });
    expect(updated.title).toBe("Cherry tomato");

    await del.execute({ context, dto: { id: p.id } });
    await expect(getById.execute({ context, dto: { id: p.id } })).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("PlantCreateManyUseCase persists explicit rows", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { cultivar } = await seedMinimalCatalog(c);
    const createMany = c.resolve(PlantCreateManyUseCase);

    const res = await createMany.execute({
      context,
      dto: { rows: [
        { cultivarId: cultivar.id, title: "A", description: null },
        { cultivarId: cultivar.id, title: "B", description: "d" },
      ] },
    });

    expect(res.items).toHaveLength(2);
    expect(res.items.map((p) => p.title)).toEqual(["A", "B"]);
  });

  it("delete throws when plant is placed in spatial layout", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { cultivar } = await seedMinimalCatalog(c);
    const createPlant = c.resolve(PlantCreateUseCase);
    const deletePlant = c.resolve(PlantDeleteUseCase);
    const createSpatial = c.resolve(SpatialNodeCreateUseCase);

    const placedPlant = await createPlant.execute({
      context,
      dto: { cultivarId: cultivar.id, title: "Parent", description: null },
    });

    const rootFrame = await createSpatial.execute({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 100, height: 100 },
        ref: { entity: "location", entityId: "layout-root" },
      },
    });
    await createSpatial.execute({
      context,
      dto: {
        parentId: rootFrame.id,
        kind: "frame",
        rect: { x: 20, y: 30, width: 40, height: 40 },
        ref: { entity: "plant", entityId: String(placedPlant.id) },
      },
    });

    const deletePlaced = deletePlant.execute({ context, dto: { id: placedPlant.id } });
    await expect(deletePlaced).rejects.toBeInstanceOf(PlantDeleteUseCasePlacedEntityError);
    await expect(deletePlaced).rejects.toMatchObject({
      useCaseName: "PlantDeleteUseCase",
      context: { id: String(placedPlant.id) },
    });
  });

  it("delete allows unplaced plant and removes isolated bound node", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { cultivar } = await seedMinimalCatalog(c);
    const createPlant = c.resolve(PlantCreateUseCase);
    const deletePlant = c.resolve(PlantDeleteUseCase);
    const createSpatial = c.resolve(SpatialNodeCreateUseCase);
    const getAllSpatial = c.resolve(SpatialNodeGetAllUseCase);

    const plant = await createPlant.execute({
      context,
      dto: { cultivarId: cultivar.id, title: "Isolated", description: null },
    });
    const isolatedNode = await createSpatial.execute({
      context,
      dto: {
        parentId: null,
        kind: "leaf",
        rect: { x: 1, y: 2, width: 10, height: 10 },
        ref: { entity: "plant", entityId: String(plant.id) },
      },
    });

    await deletePlant.execute({ context, dto: { id: plant.id } });
    const allNodes = await getAllSpatial.execute({ context });
    expect(allNodes.items.find((n) => String(n.id) === String(isolatedNode.id))).toBeUndefined();
  });

  it("deleteMany removes multiple unplaced plants and spatial stubs", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { cultivar } = await seedMinimalCatalog(c);
    const createPlant = c.resolve(PlantCreateUseCase);
    const deleteMany = c.resolve(PlantDeleteManyUseCase);
    const createSpatial = c.resolve(SpatialNodeCreateUseCase);
    const getAllSpatial = c.resolve(SpatialNodeGetAllUseCase);
    const getById = c.resolve(PlantGetByIdUseCase);

    const p1 = await createPlant.execute({
      context,
      dto: { cultivarId: cultivar.id, title: "One", description: null },
    });
    const p2 = await createPlant.execute({
      context,
      dto: { cultivarId: cultivar.id, title: "Two", description: null },
    });
    const n1 = await createSpatial.execute({
      context,
      dto: {
        parentId: null,
        kind: "leaf",
        rect: { x: 0, y: 0, width: 1, height: 1 },
        ref: { entity: "plant", entityId: String(p1.id) },
      },
    });
    const n2 = await createSpatial.execute({
      context,
      dto: {
        parentId: null,
        kind: "leaf",
        rect: { x: 2, y: 0, width: 1, height: 1 },
        ref: { entity: "plant", entityId: String(p2.id) },
      },
    });

    const { deletedIds } = await deleteMany.execute({ context, dto: { ids: [p1.id, p2.id] } });
    expect(deletedIds).toEqual([p1.id, p2.id]);
    await expect(getById.execute({ context, dto: { id: p1.id } })).rejects.toBeInstanceOf(RepositoryNotFoundError);
    await expect(getById.execute({ context, dto: { id: p2.id } })).rejects.toBeInstanceOf(RepositoryNotFoundError);
    const allNodes = await getAllSpatial.execute({ context });
    expect(allNodes.items.find((n) => String(n.id) === String(n1.id))).toBeUndefined();
    expect(allNodes.items.find((n) => String(n.id) === String(n2.id))).toBeUndefined();
  });

  it("deleteMany throws when any plant is placed", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { cultivar } = await seedMinimalCatalog(c);
    const createPlant = c.resolve(PlantCreateUseCase);
    const deleteMany = c.resolve(PlantDeleteManyUseCase);
    const createSpatial = c.resolve(SpatialNodeCreateUseCase);

    const ok = await createPlant.execute({
      context,
      dto: { cultivarId: cultivar.id, title: "Ok", description: null },
    });
    const placed = await createPlant.execute({
      context,
      dto: { cultivarId: cultivar.id, title: "Placed", description: null },
    });
    const rootFrame = await createSpatial.execute({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 100, height: 100 },
        ref: { entity: "location", entityId: "layout-root" },
      },
    });
    await createSpatial.execute({
      context,
      dto: {
        parentId: rootFrame.id,
        kind: "frame",
        rect: { x: 1, y: 1, width: 10, height: 10 },
        ref: { entity: "plant", entityId: String(placed.id) },
      },
    });

    const run = deleteMany.execute({ context, dto: { ids: [ok.id, placed.id] } });
    await expect(run).rejects.toBeInstanceOf(PlantDeleteManyUseCasePlacedEntityError);
    await expect(run).rejects.toMatchObject({
      useCaseName: "PlantDeleteManyUseCase",
      context: { ids: [String(placed.id)] },
    });
  });

  it("deleteMany rejects empty ids", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const deleteMany = c.resolve(PlantDeleteManyUseCase);
    await expect(deleteMany.execute({ context, dto: { ids: [] } })).rejects.toBeInstanceOf(RepositoryValidationError);
  });
});
