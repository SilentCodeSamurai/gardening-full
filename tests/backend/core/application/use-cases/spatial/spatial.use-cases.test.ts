import {
  SpatialApplyOperationsUseCase,
  SpatialNodeCreateUseCase,
  SpatialNodeGetAllUseCase,
  SpatialNodeGetTreeForRootIdUseCase,
} from "@backend/core/application/use-cases/spatial/spatial.use-cases";
import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { createTestUseCaseContext } from "../create-test-use-case-context";
import { describe, expect, it } from "vitest";
import { createUseCaseTestContainer } from "../gardening/create-use-case-test-container";

describe("Spatial use-cases", () => {
  it("create + getAll + getTreeForRootId happy path", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const create = c.resolve(SpatialNodeCreateUseCase);
    const getAll = c.resolve(SpatialNodeGetAllUseCase);
    const getTree = c.resolve(SpatialNodeGetTreeForRootIdUseCase);

    const root = await create.execute({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 500, height: 400 },
        ref: { entity: "location", entityId: "loc-root" },
      },
    });
    await create.execute({
      context,
      dto: {
        parentId: root.id,
        kind: "leaf",
        rect: { x: 20, y: 30, width: 40, height: 50 },
        ref: { entity: "plant", entityId: "plant-1" },
      },
    });

    expect((await getAll.execute({ context })).items.length).toBeGreaterThanOrEqual(2);
    const tree = await getTree.execute({ context, dto: { id: root.id } });
    expect(tree.children.length).toBe(1);
  });

  it("getTreeForRootId throws when root is missing", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const getTree = c.resolve(SpatialNodeGetTreeForRootIdUseCase);
    await expect(getTree.execute({ context, dto: { id: "missing-root-id" as never } })).rejects.toBeInstanceOf(
      RepositoryNotFoundError,
    );
  });

  it("applyOperations updates node geometry and parent", async () => {
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const create = c.resolve(SpatialNodeCreateUseCase);
    const apply = c.resolve(SpatialApplyOperationsUseCase);

    const root = await create.execute({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 800, height: 600 },
        ref: { entity: "location", entityId: "root" },
      },
    });
    const parentB = await create.execute({
      context,
      dto: {
        parentId: root.id,
        kind: "frame",
        rect: { x: 20, y: 20, width: 200, height: 200 },
        ref: { entity: "location", entityId: "parent-b" },
      },
    });
    const moving = await create.execute({
      context,
      dto: {
        parentId: root.id,
        kind: "leaf",
        rect: { x: 10, y: 10, width: 30, height: 30 },
        ref: { entity: "plant", entityId: "moving-plant" },
      },
    });

    const res = await apply.execute({
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
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const create = c.resolve(SpatialNodeCreateUseCase);
    const apply = c.resolve(SpatialApplyOperationsUseCase);

    const root = await create.execute({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 400, height: 300 },
        ref: { entity: "location", entityId: "root-self" },
      },
    });

    await expect(
      apply.execute({
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
    const c = createUseCaseTestContainer();
    const context = createTestUseCaseContext();
    const create = c.resolve(SpatialNodeCreateUseCase);
    const apply = c.resolve(SpatialApplyOperationsUseCase);

    const root = await create.execute({
      context,
      dto: {
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 600, height: 600 },
        ref: { entity: "location", entityId: "root-cycle" },
      },
    });
    const child = await create.execute({
      context,
      dto: {
        parentId: root.id,
        kind: "frame",
        rect: { x: 20, y: 20, width: 200, height: 200 },
        ref: { entity: "location", entityId: "child-cycle" },
      },
    });
    await create.execute({
      context,
      dto: {
        parentId: child.id,
        kind: "leaf",
        rect: { x: 10, y: 10, width: 30, height: 30 },
        ref: { entity: "plant", entityId: "grandchild-cycle" },
      },
    });

    await expect(
      apply.execute({
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
});
