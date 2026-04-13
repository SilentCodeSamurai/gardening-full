import {
  LocationCreateUseCase,
  LocationDeleteManyUseCase,
  LocationDeleteManyUseCasePlacedEntityError,
  LocationDeleteUseCase,
  LocationDeleteUseCasePlacedEntityError,
  LocationGetAllUseCase,
  LocationGetByIdUseCase,
  LocationUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/location.use-cases";
import {
  SpatialNodeCreateUseCase,
  SpatialNodeGetAllUseCase,
} from "@backend/core/application/use-cases/spatial/spatial.use-cases";
import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { UseCaseValidationError } from "@backend/core/application/use-cases/shared/errors";
import { createTestUseCaseContext } from "../create-test-use-case-context";
import { beforeEach, describe, expect, it } from "vitest";

import { createUseCaseTestContainer } from "./create-use-case-test-container";

describe("Location use-cases", () => {
  let c: ReturnType<typeof createUseCaseTestContainer>;
  let context: ReturnType<typeof createTestUseCaseContext>;

  beforeEach(() => {
    c = createUseCaseTestContainer();
    context = createTestUseCaseContext();
  });

  it("create, getById, getAll, update, delete happy path", async () => {
    const create = c.resolve(LocationCreateUseCase);
    const getById = c.resolve(LocationGetByIdUseCase);
    const getAll = c.resolve(LocationGetAllUseCase);
    const update = c.resolve(LocationUpdateUseCase);
    const del = c.resolve(LocationDeleteUseCase);

    const a = await create.run({ context, dto: { name: "Garden" } });
    const b = await create.run({ context, dto: { name: "Bed" } });

    expect((await getById.run({ context, dto: { id: b.id } })).name).toBe("Bed");
    expect((await getAll.run({ context })).items.length).toBeGreaterThanOrEqual(2);

    const renamed = await update.run({ context, dto: { id: b.id, name: "Raised bed" } });
    expect(renamed.name).toBe("Raised bed");

    await del.run({ context, dto: { id: b.id } });
    await expect(getById.run({ context, dto: { id: b.id } })).rejects.toBeInstanceOf(RepositoryNotFoundError);

    await del.run({ context, dto: { id: a.id } });
    await expect(getById.run({ context, dto: { id: a.id } })).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("getById throws when missing", async () => {
    const missingId = "missing-location-id" as never;
    await expect(
      c.resolve(LocationGetByIdUseCase).run({ context, dto: { id: missingId } }),
    ).rejects.toBeInstanceOf(Error);
  });

  it("delete throws when location is placed in spatial layout", async () => {
    const createLocation = c.resolve(LocationCreateUseCase);
    const createSpatial = c.resolve(SpatialNodeCreateUseCase);
    const del = c.resolve(LocationDeleteUseCase);

    const rootLocation = await createLocation.run({ context, dto: { name: "Root" } });
    const placedLocation = await createLocation.run({ context, dto: { name: "Placed" } });

    const rootNode = await createSpatial.run({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 100, height: 100 },
        ref: { entity: "location", entityId: String(rootLocation.id) },
      },
    });
    await createSpatial.run({
      context,
      dto: {
        parentId: rootNode.id,
        kind: "frame",
        rect: { x: 10, y: 10, width: 50, height: 50 },
        ref: { entity: "location", entityId: String(placedLocation.id) },
      },
    });

    const deletePlaced = del.run({ context, dto: { id: placedLocation.id } });
    await expect(deletePlaced).rejects.toBeInstanceOf(LocationDeleteUseCasePlacedEntityError);
    await expect(deletePlaced).rejects.toMatchObject({
      useCaseName: "LocationDeleteUseCase",
      context: { id: String(placedLocation.id) },
    });
  });

  it("delete allows unplaced location and removes isolated bound node", async () => {
    const createLocation = c.resolve(LocationCreateUseCase);
    const createSpatial = c.resolve(SpatialNodeCreateUseCase);
    const getAllSpatial = c.resolve(SpatialNodeGetAllUseCase);
    const del = c.resolve(LocationDeleteUseCase);

    const location = await createLocation.run({ context, dto: { name: "Unplaced" } });
    const isolatedNode = await createSpatial.run({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 30, height: 30 },
        ref: { entity: "location", entityId: String(location.id) },
      },
    });

    await del.run({ context, dto: { id: location.id } });
    const allNodes = await getAllSpatial.run({ context });
    expect(allNodes.items.find((n) => String(n.id) === String(isolatedNode.id))).toBeUndefined();
  });

  it("deleteMany removes multiple unplaced locations and spatial stubs", async () => {
    const createLocation = c.resolve(LocationCreateUseCase);
    const deleteMany = c.resolve(LocationDeleteManyUseCase);
    const createSpatial = c.resolve(SpatialNodeCreateUseCase);
    const getAllSpatial = c.resolve(SpatialNodeGetAllUseCase);
    const getById = c.resolve(LocationGetByIdUseCase);

    const l1 = await createLocation.run({ context, dto: { name: "L1" } });
    const l2 = await createLocation.run({ context, dto: { name: "L2" } });
    const n1 = await createSpatial.run({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 10, height: 10 },
        ref: { entity: "location", entityId: String(l1.id) },
      },
    });
    const n2 = await createSpatial.run({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 20, y: 0, width: 10, height: 10 },
        ref: { entity: "location", entityId: String(l2.id) },
      },
    });

    const { deletedIds } = await deleteMany.run({ context, dto: { ids: [l1.id, l2.id] } });
    expect(deletedIds).toEqual([l1.id, l2.id]);
    await expect(getById.run({ context, dto: { id: l1.id } })).rejects.toBeInstanceOf(RepositoryNotFoundError);
    await expect(getById.run({ context, dto: { id: l2.id } })).rejects.toBeInstanceOf(RepositoryNotFoundError);
    const allNodes = await getAllSpatial.run({ context });
    expect(allNodes.items.find((n) => String(n.id) === String(n1.id))).toBeUndefined();
    expect(allNodes.items.find((n) => String(n.id) === String(n2.id))).toBeUndefined();
  });

  it("deleteMany throws when any location is placed", async () => {
    const createLocation = c.resolve(LocationCreateUseCase);
    const deleteMany = c.resolve(LocationDeleteManyUseCase);
    const createSpatial = c.resolve(SpatialNodeCreateUseCase);

    const rootLocation = await createLocation.run({ context, dto: { name: "Root" } });
    const ok = await createLocation.run({ context, dto: { name: "Ok" } });
    const placed = await createLocation.run({ context, dto: { name: "Placed" } });
    const rootNode = await createSpatial.run({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 100, height: 100 },
        ref: { entity: "location", entityId: String(rootLocation.id) },
      },
    });
    await createSpatial.run({
      context,
      dto: {
        parentId: rootNode.id,
        kind: "frame",
        rect: { x: 1, y: 1, width: 20, height: 20 },
        ref: { entity: "location", entityId: String(placed.id) },
      },
    });

    const run = deleteMany.run({ context, dto: { ids: [ok.id, placed.id] } });
    await expect(run).rejects.toBeInstanceOf(LocationDeleteManyUseCasePlacedEntityError);
    await expect(run).rejects.toMatchObject({
      useCaseName: "LocationDeleteManyUseCase",
      context: { ids: [String(placed.id)] },
    });
  });

  it("deleteMany rejects empty ids", async () => {
    const deleteMany = c.resolve(LocationDeleteManyUseCase);
    await expect(deleteMany.run({ context, dto: { ids: [] } })).rejects.toBeInstanceOf(UseCaseValidationError);
  });

  it("deleteMany rolls back all deletes when request includes missing ids", async () => {
    const createLocation = c.resolve(LocationCreateUseCase);
    const deleteMany = c.resolve(LocationDeleteManyUseCase);
    const getById = c.resolve(LocationGetByIdUseCase);

    const existing = await createLocation.run({ context, dto: { name: "Rollback target" } });
    const missing = "missing-location-id" as never;

    await expect(deleteMany.run({ context, dto: { ids: [existing.id, missing] } })).rejects.toMatchObject({
      useCaseName: "LocationDeleteManyUseCase",
      validationCode: "partial-delete",
    });

    const stillThere = await getById.run({ context, dto: { id: existing.id } });
    expect(stillThere.id).toEqual(existing.id);
  });
});
