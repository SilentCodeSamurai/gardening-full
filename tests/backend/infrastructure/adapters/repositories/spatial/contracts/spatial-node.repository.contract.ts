import {
	RepositoryConflictError,
	RepositoryNotFoundError,
} from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { SpatialNodeEntityId } from "@backend/core/domain/spatial/entities";
import { spatialNodeId } from "@backend/infrastructure/integrations/shared/database-ids";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import {
	contractTestWorkspaceKey as wk,
	contractTestWorkspaceKeyB as wkB,
} from "../../shared/test-workspace-keys";
import { resolveSpatialRepositoryPorts } from "./resolve-spatial-repository-ports";

export function registerSpatialNodeRepositoryContract(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	describe(`SpatialNodeRepositoryPort (${adapterLabel})`, () => {
		let spatialNode: ReturnType<typeof resolveSpatialRepositoryPorts>["spatialNode"];

		beforeEach(() => {
			spatialNode = resolveSpatialRepositoryPorts(createContainer()).spatialNode;
		});

		const rect = (x: number, y: number, w: number, h: number) => ({ x, y, width: w, height: h });

		const nodeIn = (partial: {
			parentId: SpatialNodeEntityId | null;
			kind: "frame" | "leaf";
			rect: ReturnType<typeof rect>;
			ref: { entity: "location" | "plant"; entityId: string };
		}) => ({ workspaceKey: wk, ...partial });

		it("createOne, getOne, getOneByRef, getMany without filters", async () => {
			const root = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "frame",
					rect: rect(0, 0, 400, 300),
					ref: { entity: "location", entityId: "loc-root" },
				}),
			);
			const child = await spatialNode.createOne(
				nodeIn({
					parentId: root.id,
					kind: "leaf",
					rect: rect(10, 12, 30, 22),
					ref: { entity: "plant", entityId: "plant-1" },
				}),
			);

			const byId = await spatialNode.getOne({ filters: [{ id: child.id }] });
			expect(byId.id).toEqual(child.id);

			const byRef = await spatialNode.getOneByRef({
				filters: [{ ref: child.ref, workspaceKey: wk }],
			});
			expect(byRef.id).toEqual(child.id);

			const { items } = await spatialNode.getMany();
			expect(items.length).toBeGreaterThanOrEqual(2);
		});

		it("createMany returns count", async () => {
			const { count } = await spatialNode.createMany({
				items: [
					nodeIn({
						parentId: null,
						kind: "leaf",
						rect: rect(0, 0, 1, 1),
						ref: { entity: "plant", entityId: "cm-1" },
					}),
					nodeIn({
						parentId: null,
						kind: "leaf",
						rect: rect(1, 1, 1, 1),
						ref: { entity: "plant", entityId: "cm-2" },
					}),
				],
			});
			expect(count).toBe(2);
		});

		it("getMany filters: [] returns empty", async () => {
			await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "leaf",
					rect: rect(0, 0, 5, 5),
					ref: { entity: "plant", entityId: "empty-filter" },
				}),
			);
			const { items } = await spatialNode.getMany({ filters: [] });
			expect(items).toHaveLength(0);
		});

		it("getMany OR by ref entityId and by kind", async () => {
			const a = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "leaf",
					rect: rect(0, 0, 2, 2),
					ref: { entity: "plant", entityId: "or-a" },
				}),
			);
			const b = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "frame",
					rect: rect(3, 3, 2, 2),
					ref: { entity: "location", entityId: "or-b" },
				}),
			);
			const { items } = await spatialNode.getMany({
				filters: [{ ref: a.ref, workspaceKey: wk }, { ref: b.ref, workspaceKey: wk }],
			});
			expect(items).toHaveLength(2);
		});

		it("getOne OR filters", async () => {
			const n = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "leaf",
					rect: rect(0, 0, 1, 1),
					ref: { entity: "plant", entityId: "or-one" },
				}),
			);
			const got = await spatialNode.getOne({
				filters: [{ id: spatialNodeId("00000000-0000-4000-8000-00000000bad") }, { id: n.id }],
			});
			expect(got.id).toEqual(n.id);
		});

		it("getOneByRef OR: first clause misses, second matches", async () => {
			const node = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "leaf",
					rect: rect(0, 0, 10, 10),
					ref: { entity: "plant", entityId: "solo" },
				}),
			);
			await expect(
				spatialNode.getOneByRef({
					filters: [{ ref: { entity: "plant", entityId: "nonexistent-ref" }, workspaceKey: wk }],
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
			const got = await spatialNode.getOneByRef({
				filters: [
					{ ref: { entity: "plant", entityId: "nonexistent-ref" }, workspaceKey: wk },
					{ ref: node.ref, workspaceKey: wk },
				],
			});
			expect(got.id).toEqual(node.id);
		});

		it("createOne fails when parent does not exist", async () => {
			await expect(
				spatialNode.createOne(
					nodeIn({
						parentId: spatialNodeId("00000000-0000-4000-8000-000000000001"),
						kind: "leaf",
						rect: rect(0, 0, 10, 10),
						ref: { entity: "plant", entityId: "ghost-plant" },
					}),
				),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("updateOne fails when target node does not exist", async () => {
			await expect(
				spatialNode.updateOne({
					filters: [{ id: spatialNodeId("00000000-0000-4000-8000-000000000111") }],
					dto: { rect: rect(1, 2, 3, 4) },
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("updateOne partial patch preserves unspecified fields", async () => {
			const n = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "leaf",
					rect: rect(0, 0, 10, 10),
					ref: { entity: "plant", entityId: "patch-partial" },
				}),
			);
			const u = await spatialNode.updateOne({
				filters: [{ id: n.id }],
				dto: { kind: "frame" },
			});
			expect(u.kind).toBe("frame");
			expect(u.rect).toEqual(rect(0, 0, 10, 10));
		});

		it("updateMany updates all matches", async () => {
			const a = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "leaf",
					rect: rect(0, 0, 1, 1),
					ref: { entity: "plant", entityId: "um-a" },
				}),
			);
			const b = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "leaf",
					rect: rect(0, 0, 1, 1),
					ref: { entity: "plant", entityId: "um-b" },
				}),
			);
			const { count } = await spatialNode.updateMany({
				filters: [{ id: a.id }, { id: b.id }],
				dto: { kind: "frame" },
			});
			expect(count).toBe(2);
		});

		it("deleteOne throws when node missing", async () => {
			await expect(
				spatialNode.deleteOne({ filters: [{ id: spatialNodeId("00000000-0000-4000-8000-00000000dead") }] }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteOne fails when node has children", async () => {
			const root = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "frame",
					rect: rect(0, 0, 400, 300),
					ref: { entity: "location", entityId: "loc-root" },
				}),
			);
			await spatialNode.createOne(
				nodeIn({
					parentId: root.id,
					kind: "frame",
					rect: rect(10, 10, 80, 80),
					ref: { entity: "location", entityId: "loc-child" },
				}),
			);

			await expect(spatialNode.deleteOne({ filters: [{ id: root.id }] })).rejects.toBeInstanceOf(
				RepositoryConflictError,
			);
		});

		it("deleteMany skips nodes with children; deletes leaves", async () => {
			const root = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "frame",
					rect: rect(0, 0, 100, 100),
					ref: { entity: "location", entityId: "dm-root" },
				}),
			);
			const leaf = await spatialNode.createOne(
				nodeIn({
					parentId: root.id,
					kind: "leaf",
					rect: rect(1, 1, 5, 5),
					ref: { entity: "plant", entityId: "dm-leaf" },
				}),
			);
			const solo = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "leaf",
					rect: rect(0, 0, 2, 2),
					ref: { entity: "plant", entityId: "dm-solo" },
				}),
			);
			const { count } = await spatialNode.deleteMany({
				filters: [{ id: root.id }, { id: leaf.id }, { id: solo.id }],
			});
			expect(count).toBe(2);
			await spatialNode.getOne({ filters: [{ id: root.id }] });
		});

		it("restoreOne upserts existing id preserving createdAt", async () => {
			const n = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "leaf",
					rect: rect(0, 0, 5, 5),
					ref: { entity: "plant", entityId: "restore-1" },
				}),
			);
			const createdAt = n.createdAt;
			const r = await spatialNode.restoreOne({
				id: n.id,
				workspaceKey: wk,
				parentId: null,
				rect: rect(1, 1, 9, 9),
				kind: "frame",
				ref: { entity: "plant", entityId: "restore-1-changed" },
			});
			expect(r.createdAt.getTime()).toBe(createdAt.getTime());
			expect(r.rect).toEqual(rect(1, 1, 9, 9));
			expect(r.kind).toBe("frame");
		});

		it("restoreOne new id with parent appears in parent's tree", async () => {
			const parent = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "frame",
					rect: rect(0, 0, 50, 50),
					ref: { entity: "location", entityId: "restore-parent" },
				}),
			);
			const newId = spatialNodeId("00000000-0000-4000-8000-00000000ab01");
			const r = await spatialNode.restoreOne({
				id: newId,
				workspaceKey: wk,
				parentId: parent.id,
				rect: rect(2, 2, 4, 4),
				kind: "leaf",
				ref: { entity: "plant", entityId: "child-restored" },
			});
			expect(r.id).toEqual(newId);
			const tree = await spatialNode.getTreeForRootOne({
				filters: [{ id: parent.id, workspaceKey: wk }],
			});
			expect(tree.children.some((c) => c.id === newId)).toBe(true);
		});

		it("restoreOne throws when parentId set but parent missing", async () => {
			await expect(
				spatialNode.restoreOne({
					id: spatialNodeId("00000000-0000-4000-8000-00000000ab02"),
					workspaceKey: wk,
					parentId: spatialNodeId("00000000-0000-4000-8000-00000000ffff"),
					rect: rect(0, 0, 1, 1),
					kind: "leaf",
					ref: { entity: "plant", entityId: "bad-parent" },
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("getTreeForRootOne returns nested children", async () => {
			const root = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "frame",
					rect: rect(0, 0, 500, 500),
					ref: { entity: "location", entityId: "root" },
				}),
			);
			const branch = await spatialNode.createOne(
				nodeIn({
					parentId: root.id,
					kind: "frame",
					rect: rect(5, 5, 200, 120),
					ref: { entity: "location", entityId: "branch" },
				}),
			);
			await spatialNode.createOne(
				nodeIn({
					parentId: branch.id,
					kind: "leaf",
					rect: rect(8, 9, 20, 20),
					ref: { entity: "plant", entityId: "leaf" },
				}),
			);

			const tree = await spatialNode.getTreeForRootOne({
				filters: [{ id: root.id, workspaceKey: wk }],
			});
			expect(tree.children.length).toBe(1);
			expect(tree.children[0]?.children.length).toBe(1);
		});

		it("getTreeForRootOne OR root clauses", async () => {
			const root = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "frame",
					rect: rect(0, 0, 10, 10),
					ref: { entity: "location", entityId: "or-tree" },
				}),
			);
			const t = await spatialNode.getTreeForRootOne({
				filters: [
					{ id: spatialNodeId("00000000-0000-4000-8000-00000000bad"), workspaceKey: wk },
					{ id: root.id, workspaceKey: wk },
				],
			});
			expect(t.id).toEqual(root.id);
		});

		it("getTreeForRootOne throws when filters empty", async () => {
			await expect(spatialNode.getTreeForRootOne({ filters: [] })).rejects.toBeInstanceOf(
				RepositoryNotFoundError,
			);
		});

		it("getTreeForRootOne subtree does not include unrelated root as child", async () => {
			const rootA = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "frame",
					rect: rect(0, 0, 20, 20),
					ref: { entity: "location", entityId: "iso-a" },
				}),
			);
			await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "leaf",
					rect: rect(0, 0, 1, 1),
					ref: { entity: "plant", entityId: "sibling-root" },
				}),
			);
			const tree = await spatialNode.getTreeForRootOne({
				filters: [{ id: rootA.id, workspaceKey: wk }],
			});
			expect(tree.children.length).toBe(0);
		});

		it("getMany single-field filter by kind", async () => {
			await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "frame",
					rect: rect(0, 0, 3, 3),
					ref: { entity: "location", entityId: "kind-frame-only" },
				}),
			);
			const leaf = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "leaf",
					rect: rect(0, 0, 2, 2),
					ref: { entity: "plant", entityId: "kind-leaf-target" },
				}),
			);
			const { items } = await spatialNode.getMany({ filters: [{ kind: "leaf", workspaceKey: wk }] });
			expect(items.some((n) => n.id === leaf.id)).toBe(true);
		});

		it("getMany multi-field AND: wrong workspaceKey excludes row", async () => {
			const n = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "leaf",
					rect: rect(0, 0, 1, 1),
					ref: { entity: "plant", entityId: "ws-exclude-node" },
				}),
			);
			const { items } = await spatialNode.getMany({ filters: [{ id: n.id, workspaceKey: wkB }] });
			expect(items).toHaveLength(0);
		});

		it("getMany OR combines id miss with ref hit", async () => {
			const n = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "leaf",
					rect: rect(0, 0, 4, 4),
					ref: { entity: "plant", entityId: "or-mix-spatial" },
				}),
			);
			const { items } = await spatialNode.getMany({
				filters: [
					{ id: spatialNodeId("00000000-0000-4000-8000-00000000bad") },
					{ ref: n.ref, workspaceKey: wk },
				],
			});
			expect(items).toHaveLength(1);
			expect(items[0]?.id).toEqual(n.id);
		});

		it("getOne throws when no row matches", async () => {
			await expect(
				spatialNode.getOne({ filters: [{ id: spatialNodeId("00000000-0000-4000-8000-00000000cafe") }] }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("updateOne OR filters", async () => {
			const n = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "leaf",
					rect: rect(0, 0, 6, 6),
					ref: { entity: "plant", entityId: "uo-or-spatial" },
				}),
			);
			const u = await spatialNode.updateOne({
				filters: [{ id: spatialNodeId("00000000-0000-4000-8000-00000000bad") }, { id: n.id }],
				dto: { kind: "frame" },
			});
			expect(u.kind).toBe("frame");
		});

		it("updateMany count 0 when nothing matches", async () => {
			const { count } = await spatialNode.updateMany({
				filters: [{ ref: { entity: "plant", entityId: "nonexistent-um-spatial" }, workspaceKey: wk }],
				dto: { kind: "frame" },
			});
			expect(count).toBe(0);
		});

		it("deleteMany count 0 when nothing matches", async () => {
			const { count } = await spatialNode.deleteMany({
				filters: [{ ref: { entity: "plant", entityId: "nonexistent-dm-spatial" }, workspaceKey: wk }],
			});
			expect(count).toBe(0);
		});

		it("deleteOne OR filters", async () => {
			const n = await spatialNode.createOne(
				nodeIn({
					parentId: null,
					kind: "leaf",
					rect: rect(0, 0, 1, 1),
					ref: { entity: "plant", entityId: "del-or-spatial" },
				}),
			);
			await spatialNode.deleteOne({
				filters: [{ id: spatialNodeId("00000000-0000-4000-8000-00000000bad") }, { id: n.id }],
			});
			await expect(spatialNode.getOne({ filters: [{ id: n.id }] })).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});
	});
}
