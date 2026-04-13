import {
  SpatialApplyOperationsUseCase,
  SpatialNodeCreateUseCase,
  SpatialNodeDeleteManyUseCase,
  SpatialNodeDeleteUseCase,
  SpatialNodeGetAllUseCase,
  SpatialNodeGetTreeForRootIdUseCase,
  SpatialNodeRestoreUseCase,
} from "@backend/core/application/use-cases/spatial/spatial.use-cases";
import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { createTestUseCaseContext } from "../create-test-use-case-context";
import { beforeEach, describe, expect, it } from "vitest";
import { createUseCaseTestContainer } from "../gardening/create-use-case-test-container";

describe("Spatial use-cases", () => {
  let c: ReturnType<typeof createUseCaseTestContainer>;
  let context: ReturnType<typeof createTestUseCaseContext>;

  beforeEach(() => {
    c = createUseCaseTestContainer();
    context = createTestUseCaseContext();
  });

  it("create + getAll + getTreeForRootId happy path", async () => {
    const create = c.resolve(SpatialNodeCreateUseCase);
    const getAll = c.resolve(SpatialNodeGetAllUseCase);
    const getTree = c.resolve(SpatialNodeGetTreeForRootIdUseCase);

    const root = await create.run({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 500, height: 400 },
        ref: { entity: "location", entityId: "loc-root" },
      },
    });
    await create.run({
      context,
      dto: {
        parentId: root.id,
        kind: "leaf",
        rect: { x: 20, y: 30, width: 40, height: 50 },
        ref: { entity: "plant", entityId: "plant-1" },
      },
    });

    expect((await getAll.run({ context })).items.length).toBeGreaterThanOrEqual(2);
    const tree = await getTree.run({ context, dto: { id: root.id } });
    expect(tree.children.length).toBe(1);
  });

  it("getTreeForRootId throws when root is missing", async () => {
    const getTree = c.resolve(SpatialNodeGetTreeForRootIdUseCase);
    await expect(getTree.run({ context, dto: { id: "missing-root-id" as never } })).rejects.toBeInstanceOf(
      RepositoryNotFoundError,
    );
  });

  it("applyOperations updates node geometry and parent", async () => {
    const create = c.resolve(SpatialNodeCreateUseCase);
    const apply = c.resolve(SpatialApplyOperationsUseCase);

    const root = await create.run({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 800, height: 600 },
        ref: { entity: "location", entityId: "root" },
      },
    });
    const parentB = await create.run({
      context,
      dto: {
        parentId: root.id,
        kind: "frame",
        rect: { x: 20, y: 20, width: 200, height: 200 },
        ref: { entity: "location", entityId: "parent-b" },
      },
    });
    const moving = await create.run({
      context,
      dto: {
        parentId: root.id,
        kind: "leaf",
        rect: { x: 10, y: 10, width: 30, height: 30 },
        ref: { entity: "plant", entityId: "moving-plant" },
      },
    });

    const res = await apply.run({
      context,
      dto: { operations: [
        {
          id: moving.id,
          parentId: parentB.id,
          rect: { x: 77, y: 88, width: 30, height: 30 },
        },
      ] },
    });

    expect(res.results).toHaveLength(1);
    const updated = res.results[0];
    expect(updated?.parentId).toEqual(parentB.id);
    expect(updated?.rect.x).toBe(77);
    expect(updated?.rect.y).toBe(88);
  });

  it("applyOperations rejects self-parent reparent", async () => {
    const create = c.resolve(SpatialNodeCreateUseCase);
    const apply = c.resolve(SpatialApplyOperationsUseCase);

    const root = await create.run({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 400, height: 300 },
        ref: { entity: "location", entityId: "root-self" },
      },
    });

    await expect(
      apply.run({
        context,
        dto: { operations: [
          {
            id: root.id,
            parentId: root.id,
            rect: { x: 0, y: 0, width: 400, height: 300 },
          },
        ] },
      }),
    ).rejects.toThrow(/cannot be reparented under itself/i);
  });

  it("applyOperations rejects reparent under descendant", async () => {
    const create = c.resolve(SpatialNodeCreateUseCase);
    const apply = c.resolve(SpatialApplyOperationsUseCase);

    const root = await create.run({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 600, height: 600 },
        ref: { entity: "location", entityId: "root-cycle" },
      },
    });
    const child = await create.run({
      context,
      dto: {
        parentId: root.id,
        kind: "frame",
        rect: { x: 20, y: 20, width: 200, height: 200 },
        ref: { entity: "location", entityId: "child-cycle" },
      },
    });
    await create.run({
      context,
      dto: {
        parentId: child.id,
        kind: "leaf",
        rect: { x: 10, y: 10, width: 30, height: 30 },
        ref: { entity: "plant", entityId: "grandchild-cycle" },
      },
    });

    await expect(
      apply.run({
        context,
        dto: { operations: [
          {
            id: root.id,
            parentId: child.id,
            rect: { x: 0, y: 0, width: 600, height: 600 },
          },
        ] },
      }),
    ).rejects.toThrow(/cannot be reparented under its own descendant/i);
  });

  it("applyOperations rolls back earlier successful updates when a later operation fails", async () => {
    const create = c.resolve(SpatialNodeCreateUseCase);
    const apply = c.resolve(SpatialApplyOperationsUseCase);
    const getTree = c.resolve(SpatialNodeGetTreeForRootIdUseCase);

    const root = await create.run({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 400, height: 300 },
        ref: { entity: "location", entityId: "root-rollback" },
      },
    });
    const child = await create.run({
      context,
      dto: {
        parentId: root.id,
        kind: "leaf",
        rect: { x: 10, y: 20, width: 40, height: 50 },
        ref: { entity: "plant", entityId: "child-rollback" },
      },
    });

    await expect(
      apply.run({
        context,
        dto: {
          operations: [
            {
              id: child.id,
              parentId: root.id,
              rect: { x: 99, y: 111, width: 40, height: 50 },
            },
            {
              id: root.id,
              parentId: root.id,
              rect: { x: 0, y: 0, width: 400, height: 300 },
            },
          ],
        },
      }),
    ).rejects.toThrow(/cannot be reparented under itself/i);

    const tree = await getTree.run({ context, dto: { id: root.id } });
    const persistedChild = tree.children.find((n) => n.id === child.id);
    expect(persistedChild?.rect.x).toBe(10);
    expect(persistedChild?.rect.y).toBe(20);
  });

  it("delete removes existing spatial node", async () => {
    const create = c.resolve(SpatialNodeCreateUseCase);
    const del = c.resolve(SpatialNodeDeleteUseCase);
    const getAll = c.resolve(SpatialNodeGetAllUseCase);

    const root = await create.run({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 400, height: 300 },
        ref: { entity: "location", entityId: "root-delete" },
      },
    });
    const leaf = await create.run({
      context,
      dto: {
        parentId: root.id,
        kind: "leaf",
        rect: { x: 12, y: 16, width: 20, height: 30 },
        ref: { entity: "plant", entityId: "leaf-delete" },
      },
    });

    await del.run({ context, dto: { id: leaf.id } });
    const { items } = await getAll.run({ context });
    expect(items.some((node) => node.id === leaf.id)).toBe(false);
  });

  it("restore uses create permission for missing node and update permission for existing node", async () => {
    const create = c.resolve(SpatialNodeCreateUseCase);
    const restore = c.resolve(SpatialNodeRestoreUseCase);
    const getAll = c.resolve(SpatialNodeGetAllUseCase);

    const root = await create.run({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 500, height: 500 },
        ref: { entity: "location", entityId: "root-restore" },
      },
    });

    const restoredId = "restored-spatial-id" as never;
    const createdViaRestore = await restore.run({
      context,
      dto: {
        id: restoredId,
        parentId: root.id,
        kind: "leaf",
        rect: { x: 5, y: 5, width: 10, height: 10 },
        ref: { entity: "plant", entityId: "restore-created" },
      },
    });
    expect(createdViaRestore.id).toEqual(restoredId);

    const updatedViaRestore = await restore.run({
      context,
      dto: {
        id: restoredId,
        parentId: root.id,
        kind: "leaf",
        rect: { x: 42, y: 84, width: 10, height: 10 },
        ref: { entity: "plant", entityId: "restore-created" },
      },
    });
    expect(updatedViaRestore.rect.x).toBe(42);
    expect(updatedViaRestore.rect.y).toBe(84);

    const { items } = await getAll.run({ context });
    expect(items.some((node) => node.id === restoredId)).toBe(true);
  });

  it("deleteMany removes requested nodes", async () => {
    const create = c.resolve(SpatialNodeCreateUseCase);
    const deleteMany = c.resolve(SpatialNodeDeleteManyUseCase);
    const getAll = c.resolve(SpatialNodeGetAllUseCase);

    const root = await create.run({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 300, height: 300 },
        ref: { entity: "location", entityId: "root-dm" },
      },
    });
    const childA = await create.run({
      context,
      dto: {
        parentId: root.id,
        kind: "leaf",
        rect: { x: 10, y: 10, width: 20, height: 20 },
        ref: { entity: "plant", entityId: "dm-a" },
      },
    });
    const childB = await create.run({
      context,
      dto: {
        parentId: root.id,
        kind: "leaf",
        rect: { x: 40, y: 10, width: 20, height: 20 },
        ref: { entity: "plant", entityId: "dm-b" },
      },
    });

    const out = await deleteMany.run({ context, dto: { ids: [childA.id, childB.id] } });
    expect(out.count).toBe(2);

    const { items } = await getAll.run({ context });
    expect(items.some((n) => n.id === childA.id)).toBe(false);
    expect(items.some((n) => n.id === childB.id)).toBe(false);
    expect(items.some((n) => n.id === root.id)).toBe(true);
  });
});
