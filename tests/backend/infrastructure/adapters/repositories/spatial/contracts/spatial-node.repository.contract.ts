import { spatialNodeId } from "@backend/infrastructure/integrations/shared/database-ids";
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";
import { resolveSpatialRepositoryPorts } from "./resolve-spatial-repository-ports";

export function registerSpatialNodeRepositoryContract(
  adapterLabel: string,
  createContainer: () => DependencyContainer,
): void {
  describe(`SpatialNodeRepository (${adapterLabel})`, () => {
    let spatialNodeRepository: ReturnType<typeof resolveSpatialRepositoryPorts>["spatialNode"];

    beforeEach(() => {
      spatialNodeRepository = resolveSpatialRepositoryPorts(createContainer()).spatialNode;
    });

    it("create/getById/getAll/getByRef happy path", async () => {
      const root = await spatialNodeRepository.create({
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 400, height: 300 },
        ref: { entity: "location", entityId: "loc-root" },
      });
      const child = await spatialNodeRepository.create({
        parentId: root.id,
        kind: "leaf",
        rect: { x: 10, y: 12, width: 30, height: 22 },
        ref: { entity: "plant", entityId: "plant-1" },
      });

      expect((await spatialNodeRepository.getById({ id: child.id })).id).toEqual(child.id);
      expect((await spatialNodeRepository.getByRef({ ref: child.ref })).id).toEqual(child.id);
      expect((await spatialNodeRepository.getAll()).items.length).toBeGreaterThanOrEqual(2);
    });

    it("create fails when parent does not exist", async () => {
      await expect(
        spatialNodeRepository.create({
          parentId: spatialNodeId("00000000-0000-4000-8000-000000000001"),
          kind: "leaf",
          rect: { x: 0, y: 0, width: 10, height: 10 },
          ref: { entity: "plant", entityId: "ghost-plant" },
        }),
      ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    });

    it("update fails when target node does not exist", async () => {
      await expect(
        spatialNodeRepository.update({
          id: spatialNodeId("00000000-0000-4000-8000-000000000111"),
          rect: { x: 1, y: 2, width: 3, height: 4 },
        }),
      ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    });

    it("delete fails when node has children", async () => {
      const root = await spatialNodeRepository.create({
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 400, height: 300 },
        ref: { entity: "location", entityId: "loc-root" },
      });
      await spatialNodeRepository.create({
        parentId: root.id,
        kind: "frame",
        rect: { x: 10, y: 10, width: 80, height: 80 },
        ref: { entity: "location", entityId: "loc-child" },
      });

      await expect(spatialNodeRepository.delete({ id: root.id })).rejects.toBeInstanceOf(
        RepositoryConflictError,
      );
    });

    it("getTreeForRootId returns nested children", async () => {
      const root = await spatialNodeRepository.create({
        parentId: null,
        kind: "frame",
        rect: { x: 0, y: 0, width: 500, height: 500 },
        ref: { entity: "location", entityId: "root" },
      });
      const branch = await spatialNodeRepository.create({
        parentId: root.id,
        kind: "frame",
        rect: { x: 5, y: 5, width: 200, height: 120 },
        ref: { entity: "location", entityId: "branch" },
      });
      await spatialNodeRepository.create({
        parentId: branch.id,
        kind: "leaf",
        rect: { x: 8, y: 9, width: 20, height: 20 },
        ref: { entity: "plant", entityId: "leaf" },
      });

      const tree = await spatialNodeRepository.getTreeForRootId({ id: root.id });
      expect(tree.children.length).toBe(1);
      expect(tree.children[0]?.children.length).toBe(1);
    });
  });
}
