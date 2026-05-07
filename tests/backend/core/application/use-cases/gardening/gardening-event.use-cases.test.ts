import {
  GardeningEventBulkEditByIdsUseCase,
  GardeningEventCreateUseCase,
  GardeningEventCreateForLocationUseCase,
  GardeningEventCreateForPlantListUseCase,
  GardeningEventDeleteUseCase,
  GardeningEventDeleteManyUseCase,
  GardeningEventGetAllUseCase,
  GardeningEventGetBindingsForEventUseCase,
  GardeningEventGetByIdUseCase,
  GardeningEventGetForLocationUseCase,
  GardeningEventGetForPlantUseCase,
  GardeningEventUpdateUseCase,
} from "@backend/core/application/use-cases/gardening/gardening-event.use-cases";
import { SpatialNodeCreateUseCase } from "@backend/core/application/use-cases/spatial/spatial.use-cases";
import { PlantCreateUseCase } from "@backend/core/application/use-cases/gardening/plant.use-cases";
import { LocationCreateUseCase } from "@backend/core/application/use-cases/gardening/location.use-cases";
import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { createTestUseCaseContext } from "../create-test-use-case-context";
import { beforeEach, describe, expect, it } from "vitest";

import { createUseCaseTestContainer } from "./create-use-case-test-container";
import { seedMinimalCatalog } from "../../../../helpers/gardening/seed-minimal-catalog";
import { fixtureNoteAction } from "../../../../helpers/gardening/test-fixtures";

describe("Gardening event use-cases", () => {
  let c: ReturnType<typeof createUseCaseTestContainer>;
  let context: ReturnType<typeof createTestUseCaseContext>;

  beforeEach(() => {
    c = createUseCaseTestContainer();
    context = createTestUseCaseContext();
  });

  it("GardeningEventCreateUseCase creates an unbound event", async () => {
    const created = await c.resolve(GardeningEventCreateUseCase).run({
      context,
      dto: { action: fixtureNoteAction({ content: "unbound" }), occurredAt: null },
    });
    const bindings = await c.resolve(GardeningEventGetBindingsForEventUseCase).run({
      context,
      dto: { id: created.id },
    });
    expect(bindings.plantIds).toHaveLength(0);
    expect(bindings.locationIds).toHaveLength(0);
  });

  it("getAll returns empty then items", async () => {
    const getAll = c.resolve(GardeningEventGetAllUseCase);
    expect((await getAll.run({ context })).items).toHaveLength(0);
    await c.resolve(GardeningEventCreateForPlantListUseCase).run({
      context,
      dto: { action: fixtureNoteAction({ content: "c" }), plantIds: [], occurredAt: null },
    });
    expect((await getAll.run({ context })).items).toHaveLength(1);
  });

  it("getById throws when missing", async () => {
    await expect(
      c.resolve(GardeningEventGetByIdUseCase).run({ context, dto: { id: "missing-event-id" as never } }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("update changes action and content", async () => {
    const occurredAt = new Date("2026-04-20T10:00:00.000Z");
    const created = await c.resolve(GardeningEventCreateForPlantListUseCase).run({
      context,
      dto: { action: fixtureNoteAction({ content: "old" }), plantIds: [], occurredAt },
    });
    const updatedOccurredAt = new Date("2026-04-20T11:30:00.000Z");
    const updated = await c.resolve(GardeningEventUpdateUseCase).run({
      context,
      dto: {
        id: created.id,
        action: fixtureNoteAction({ type: "watering", content: "new body" }),
        occurredAt: updatedOccurredAt,
      },
    });
    expect(updated.action.type).toBe("watering");
    expect(updated.action.content).toBe("new body");
    if (updated.occurredAt === null) throw new Error("occurredAt should be present after explicit update");
    expect(updated.occurredAt.toISOString()).toBe(updatedOccurredAt.toISOString());
  });

  it("delete throws when missing", async () => {
    await expect(
      c.resolve(GardeningEventDeleteUseCase).run({ context, dto: { id: "missing-event-id" as never } }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("GardeningEventCreateForLocationUseCase links location and plants from spatial mapping", async () => {
    const { cultivar } = await seedMinimalCatalog(c);
    const spatialCreate = c.resolve(SpatialNodeCreateUseCase);
    const loc = await c.resolve(LocationCreateUseCase).run({ context, dto: { name: "Bed", presentation: null } });
    const p1 = await c.resolve(PlantCreateUseCase).run({
      context,
      dto: { cultivarId: cultivar.id, title: null, description: null, presentation: null },
    });
    const p2 = await c.resolve(PlantCreateUseCase).run({
      context,
      dto: { cultivarId: cultivar.id, title: null, description: null, presentation: null },
    });
    const locNode = await spatialCreate.run({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 200, height: 200 },
        ref: { entity: "location", entityId: String(loc.id) },
      },
    });
    await spatialCreate.run({
      context,
      dto: {
        parentId: locNode.id,
        kind: "leaf",
        rect: { x: 10, y: 10, width: 20, height: 20 },
        ref: { entity: "plant", entityId: String(p1.id) },
      },
    });
    await spatialCreate.run({
      context,
      dto: {
        parentId: locNode.id,
        kind: "leaf",
        rect: { x: 40, y: 10, width: 20, height: 20 },
        ref: { entity: "plant", entityId: String(p2.id) },
      },
    });
    const ev = await c.resolve(GardeningEventCreateForLocationUseCase).run({
      context,
      dto: { locationId: loc.id, action: fixtureNoteAction({ content: "loc event" }), occurredAt: null },
    });
    const forLoc = await c.resolve(GardeningEventGetForLocationUseCase).run({
      context,
      dto: { locationId: loc.id },
    });
    expect(forLoc.items.map((e) => e.id)).toContainEqual(ev.id);

    const forP1 = await c.resolve(GardeningEventGetForPlantUseCase).run({ context, dto: { plantId: p1.id } });
    const forP2 = await c.resolve(GardeningEventGetForPlantUseCase).run({ context, dto: { plantId: p2.id } });
    expect(forP1.items.map((e) => e.id)).toContainEqual(ev.id);
    expect(forP2.items.map((e) => e.id)).toContainEqual(ev.id);
  });

  it("GardeningEventCreateForLocationUseCase with no plants still links location", async () => {
    const loc = await c.resolve(LocationCreateUseCase).run({ context, dto: { name: "Empty", presentation: null } });
    const ev = await c.resolve(GardeningEventCreateForLocationUseCase).run({
      context,
      dto: { locationId: loc.id, action: fixtureNoteAction({ content: "x" }), occurredAt: null },
    });
    const forLoc = await c.resolve(GardeningEventGetForLocationUseCase).run({
      context,
      dto: { locationId: loc.id },
    });
    expect(forLoc.items).toHaveLength(1);
    const [linked] = forLoc.items;
    expect(linked).toBeDefined();
    expect(linked.id).toEqual(ev.id);
  });

  it("GardeningEventCreateForLocationUseCase rejects invalid location without persisting an event", async () => {
    const getAll = c.resolve(GardeningEventGetAllUseCase);
    const before = (await getAll.run({ context })).items.length;
    await expect(
      c.resolve(GardeningEventCreateForLocationUseCase).run({
        context,
        dto: {
          locationId: "missing-location-id" as never,
          action: fixtureNoteAction({ content: "x" }),
          occurredAt: null,
        },
      }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    const after = (await getAll.run({ context })).items.length;
    expect(after).toBe(before);
  });

  it("GardeningEventCreateForPlantListUseCase binds listed readable plants", async () => {
    const { cultivar } = await seedMinimalCatalog(c);
    const plant = await c.resolve(PlantCreateUseCase).run({
      context,
      dto: { cultivarId: cultivar.id, title: null, description: null, presentation: null },
    });
    const ev = await c.resolve(GardeningEventCreateForPlantListUseCase).run({
      context,
      dto: { action: fixtureNoteAction({ content: "multi" }), plantIds: [plant.id], occurredAt: null },
    });
    const forPlant = await c.resolve(GardeningEventGetForPlantUseCase).run({
      context,
      dto: { plantId: plant.id },
    });
    expect(forPlant.items.map((e) => e.id)).toContainEqual(ev.id);
  });

  it("GardeningEventCreateForPlantListUseCase with empty plantIds creates event without plant links", async () => {
    const { cultivar } = await seedMinimalCatalog(c);
    const plant = await c.resolve(PlantCreateUseCase).run({
      context,
      dto: { cultivarId: cultivar.id, title: null, description: null, presentation: null },
    });
    const ev = await c.resolve(GardeningEventCreateForPlantListUseCase).run({
      context,
      dto: { action: fixtureNoteAction({ content: "none" }), plantIds: [], occurredAt: null },
    });
    const forPlant = await c.resolve(GardeningEventGetForPlantUseCase).run({
      context,
      dto: { plantId: plant.id },
    });
    expect(forPlant.items.some((e) => e.id === ev.id)).toBe(false);
  });

  it("getForPlant and getForLocation return empty when no links", async () => {
    const { cultivar } = await seedMinimalCatalog(c);
    const loc = await c.resolve(LocationCreateUseCase).run({ context, dto: { name: "L", presentation: null } });
    const plant = await c.resolve(PlantCreateUseCase).run({
      context,
      dto: { cultivarId: cultivar.id, title: null, description: null, presentation: null },
    });
    expect(
      (await c.resolve(GardeningEventGetForPlantUseCase).run({ context, dto: { plantId: plant.id } })).items,
    ).toHaveLength(0);
    expect(
      (await c.resolve(GardeningEventGetForLocationUseCase).run({ context, dto: { locationId: loc.id } })).items,
    ).toHaveLength(0);
  });

  it("GardeningEventGetBindingsForEventUseCase returns plant ids after create-for-plants", async () => {
    const { cultivar } = await seedMinimalCatalog(c);
    const plant = await c.resolve(PlantCreateUseCase).run({
      context,
      dto: { cultivarId: cultivar.id, title: null, description: null, presentation: null },
    });
    const ev = await c.resolve(GardeningEventCreateForPlantListUseCase).run({
      context,
      dto: { action: fixtureNoteAction({ content: "bindings" }), plantIds: [plant.id], occurredAt: null },
    });
    const b = await c.resolve(GardeningEventGetBindingsForEventUseCase).run({ context, dto: { id: ev.id } });
    expect(b.plantIds.map(String)).toContain(String(plant.id));
    expect(b.locationIds).toHaveLength(0);
  });

  it("deleteMany removes requested events", async () => {
    const create = c.resolve(GardeningEventCreateUseCase);
    const deleteMany = c.resolve(GardeningEventDeleteManyUseCase);
    const getAll = c.resolve(GardeningEventGetAllUseCase);

    const e1 = await create.run({ context, dto: { action: fixtureNoteAction({ content: "dm-1" }), occurredAt: null } });
    const e2 = await create.run({ context, dto: { action: fixtureNoteAction({ content: "dm-2" }), occurredAt: null } });

    const out = await deleteMany.run({ context, dto: { ids: [e1.id, e2.id] } });
    expect(out.count).toBe(2);

    const remaining = await getAll.run({ context });
    expect(remaining.items.some((e) => e.id === e1.id)).toBe(false);
    expect(remaining.items.some((e) => e.id === e2.id)).toBe(false);
  });

  it("bulkEditByIds updates selected events via repository updateMany", async () => {
    const create = c.resolve(GardeningEventCreateUseCase);
    const bulkEdit = c.resolve(GardeningEventBulkEditByIdsUseCase);
    const getAll = c.resolve(GardeningEventGetAllUseCase);

    const e1 = await create.run({ context, dto: { action: fixtureNoteAction({ content: "be-1" }), occurredAt: null } });
    const e2 = await create.run({ context, dto: { action: fixtureNoteAction({ content: "be-2" }), occurredAt: null } });

    const nextOccurredAt = new Date("2026-04-20T12:00:00.000Z");
    const out = await bulkEdit.run({
      context,
      dto: {
        ids: [e1.id, e2.id],
        action: fixtureNoteAction({ type: "watering", content: "bulk-edited" }),
        occurredAt: nextOccurredAt,
      },
    });
    expect(out.count).toBe(2);

    const edited = (await getAll.run({ context })).items.filter((x) => [e1.id, e2.id].includes(x.id));
    expect(edited).toHaveLength(2);
    expect(edited.every((x) => x.action.type === "watering" && x.action.content === "bulk-edited")).toBe(true);
    expect(edited.every((x) => x.occurredAt?.toISOString() === nextOccurredAt.toISOString())).toBe(true);
  });
});
