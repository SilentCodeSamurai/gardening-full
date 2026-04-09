import {
  GardeningEventCreateUseCase,
  GardeningEventCreateForLocationUseCase,
  GardeningEventCreateForPlantListUseCase,
  GardeningEventDeleteUseCase,
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
import { TOKENS } from "@backend/di/tokens";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import {
  gardeningEventId,
  locationId,
} from "@backend/infrastructure/integrations/shared/database-ids";
import { createTestUseCaseContext } from "../create-test-use-case-context";
import { describe, expect, it } from "vitest";

import { createUseCaseTestContainer } from "./create-use-case-test-container";
import { seedMinimalCatalog } from "../../../../helpers/gardening/seed-minimal-catalog";
import { fixtureNoteAction } from "../../../../helpers/gardening/test-fixtures";

describe("Gardening event use-cases", () => {
  it("GardeningEventCreateUseCase creates an unbound event", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const created = await c.resolve(GardeningEventCreateUseCase).execute({
      context,
      dto: { action: fixtureNoteAction({ content: "unbound" }) },
    });
    const bindings = await c.resolve(GardeningEventGetBindingsForEventUseCase).execute({
      context,
      dto: { id: created.id },
    });
    expect(bindings.plantIds).toHaveLength(0);
    expect(bindings.locationIds).toHaveLength(0);
  });

  it("getAll returns empty then items", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const getAll = c.resolve(GardeningEventGetAllUseCase);
    expect((await getAll.execute({ context })).items).toHaveLength(0);
    await c.resolve(GardeningEventCreateForPlantListUseCase).execute({
      context,
      dto: { action: fixtureNoteAction({ content: "c" }), plantIds: [] },
    });
    expect((await getAll.execute({ context })).items).toHaveLength(1);
  });

  it("getById throws when missing", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    await expect(
      c.resolve(GardeningEventGetByIdUseCase).execute({ context, dto: { id: gardeningEventId() } }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("update changes action and content", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const created = await c.resolve(GardeningEventCreateForPlantListUseCase).execute({
      context,
      dto: { action: fixtureNoteAction({ content: "old" }), plantIds: [] },
    });
    const updated = await c.resolve(GardeningEventUpdateUseCase).execute({
      context,
      dto: {
        id: created.id,
        action: fixtureNoteAction({ type: "watering", content: "new body" }),
      },
    });
    expect(updated.action.type).toBe("watering");
    expect(updated.action.content).toBe("new body");
  });

  it("delete throws when missing", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    await expect(
      c.resolve(GardeningEventDeleteUseCase).execute({ context, dto: { id: gardeningEventId() } }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("GardeningEventCreateForLocationUseCase links location and plants from spatial mapping", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { cultivar } = await seedMinimalCatalog(c);
    const spatialCreate = c.resolve(SpatialNodeCreateUseCase);
    const loc = await c.resolve(LocationCreateUseCase).execute({ context, dto: { name: "Bed" } });
    const p1 = await c.resolve(PlantCreateUseCase).execute({
      context,
      dto: { cultivarId: cultivar.id, title: null, description: null },
    });
    const p2 = await c.resolve(PlantCreateUseCase).execute({
      context,
      dto: { cultivarId: cultivar.id, title: null, description: null },
    });
    const locNode = await spatialCreate.execute({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 200, height: 200 },
        ref: { entity: "location", entityId: String(loc.id) },
      },
    });
    await spatialCreate.execute({
      context,
      dto: {
        parentId: locNode.id,
        kind: "leaf",
        rect: { x: 10, y: 10, width: 20, height: 20 },
        ref: { entity: "plant", entityId: String(p1.id) },
      },
    });
    await spatialCreate.execute({
      context,
      dto: {
        parentId: locNode.id,
        kind: "leaf",
        rect: { x: 40, y: 10, width: 20, height: 20 },
        ref: { entity: "plant", entityId: String(p2.id) },
      },
    });
    const ev = await c.resolve(GardeningEventCreateForLocationUseCase).execute({
      context,
      dto: { locationId: loc.id, action: fixtureNoteAction({ content: "loc event" }) },
    });
    const forLoc = await c.resolve(GardeningEventGetForLocationUseCase).execute({
      context,
      dto: { locationId: loc.id },
    });
    expect(forLoc.items.map((e) => e.id)).toContainEqual(ev.id);

    const forP1 = await c.resolve(GardeningEventGetForPlantUseCase).execute({ context, dto: { plantId: p1.id } });
    const forP2 = await c.resolve(GardeningEventGetForPlantUseCase).execute({ context, dto: { plantId: p2.id } });
    expect(forP1.items.map((e) => e.id)).toContainEqual(ev.id);
    expect(forP2.items.map((e) => e.id)).toContainEqual(ev.id);
  });

  it("GardeningEventCreateForLocationUseCase with no plants still links location", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const loc = await c.resolve(LocationCreateUseCase).execute({ context, dto: { name: "Empty" } });
    const ev = await c.resolve(GardeningEventCreateForLocationUseCase).execute({
      context,
      dto: { locationId: loc.id, action: fixtureNoteAction({ content: "x" }) },
    });
    const forLoc = await c.resolve(GardeningEventGetForLocationUseCase).execute({
      context,
      dto: { locationId: loc.id },
    });
    expect(forLoc.items).toHaveLength(1);
    const [linked] = forLoc.items;
    expect(linked).toBeDefined();
    expect(linked.id).toEqual(ev.id);
  });

  it("GardeningEventCreateForLocationUseCase rejects invalid location and leaves orphan event row", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const store = c.resolve<InMemoryStore>(TOKENS.InMemoryStore);
    const before = store.gardeningEvents.size;
    await expect(
      c.resolve(GardeningEventCreateForLocationUseCase).execute({
        context,
        dto: { locationId: locationId(), action: fixtureNoteAction({ content: "x" }) },
      }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    expect(store.gardeningEvents.size).toBe(before);
  });

  it("GardeningEventCreateForPlantListUseCase binds listed readable plants", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { cultivar } = await seedMinimalCatalog(c);
    const plant = await c.resolve(PlantCreateUseCase).execute({
      context,
      dto: { cultivarId: cultivar.id, title: null, description: null },
    });
    const ev = await c.resolve(GardeningEventCreateForPlantListUseCase).execute({
      context,
      dto: { action: fixtureNoteAction({ content: "multi" }), plantIds: [plant.id] },
    });
    const forPlant = await c.resolve(GardeningEventGetForPlantUseCase).execute({
      context,
      dto: { plantId: plant.id },
    });
    expect(forPlant.items.map((e) => e.id)).toContainEqual(ev.id);
  });

  it("GardeningEventCreateForPlantListUseCase with empty plantIds creates event without plant links", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { cultivar } = await seedMinimalCatalog(c);
    const plant = await c.resolve(PlantCreateUseCase).execute({
      context,
      dto: { cultivarId: cultivar.id, title: null, description: null },
    });
    const ev = await c.resolve(GardeningEventCreateForPlantListUseCase).execute({
      context,
      dto: { action: fixtureNoteAction({ content: "none" }), plantIds: [] },
    });
    const forPlant = await c.resolve(GardeningEventGetForPlantUseCase).execute({
      context,
      dto: { plantId: plant.id },
    });
    expect(forPlant.items.some((e) => e.id === ev.id)).toBe(false);
  });

  it("getForPlant and getForLocation return empty when no links", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { cultivar } = await seedMinimalCatalog(c);
    const loc = await c.resolve(LocationCreateUseCase).execute({ context, dto: { name: "L" } });
    const plant = await c.resolve(PlantCreateUseCase).execute({
      context,
      dto: { cultivarId: cultivar.id, title: null, description: null },
    });
    expect(
      (await c.resolve(GardeningEventGetForPlantUseCase).execute({ context, dto: { plantId: plant.id } })).items,
    ).toHaveLength(0);
    expect(
      (await c.resolve(GardeningEventGetForLocationUseCase).execute({ context, dto: { locationId: loc.id } })).items,
    ).toHaveLength(0);
  });

  it("GardeningEventGetBindingsForEventUseCase returns plant ids after create-for-plants", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const { cultivar } = await seedMinimalCatalog(c);
    const plant = await c.resolve(PlantCreateUseCase).execute({
      context,
      dto: { cultivarId: cultivar.id, title: null, description: null },
    });
    const ev = await c.resolve(GardeningEventCreateForPlantListUseCase).execute({
      context,
      dto: { action: fixtureNoteAction({ content: "bindings" }), plantIds: [plant.id] },
    });
    const b = await c.resolve(GardeningEventGetBindingsForEventUseCase).execute({ context, dto: { id: ev.id } });
    expect(b.plantIds.map(String)).toContain(String(plant.id));
    expect(b.locationIds).toHaveLength(0);
  });
});
