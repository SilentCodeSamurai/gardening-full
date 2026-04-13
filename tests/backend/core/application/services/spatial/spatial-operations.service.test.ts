import "reflect-metadata";

import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { SpatialNodeRepositoryPort } from "@backend/core/application/ports/repositories/spatial/spatial-node.repository.port";
import { SpatialOperationsService } from "@backend/core/application/services/spatial/spatial-operations.service";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { SpatialNodeEntity, SpatialNodeTreeNode } from "@backend/core/domain/spatial/entities";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("SpatialOperationsService", () => {
	let service: SpatialOperationsService;
	let repo: SpatialNodeRepositoryPort;

	const wk = WorkspaceVO.user("u1");
	const wkOther = WorkspaceVO.user("u2");
	const ref = { entity: "plant", entityId: "p1" } as const;
	const baseRect = { x: 0, y: 0, width: 100, height: 50 };

	const makeNode = (overrides?: Partial<SpatialNodeEntity>): SpatialNodeEntity =>
		({
			id: "node-1" as never,
			createdAt: new Date(),
			updatedAt: new Date(),
			workspace: wk,
			parentId: null,
			rect: baseRect,
			kind: "leaf",
			ref,
			...overrides,
		}) as SpatialNodeEntity;

	beforeEach(() => {
		repo = {
			createOne: vi.fn(),
			createMany: vi.fn(),
			getOne: vi.fn(),
			getMany: vi.fn(),
			updateOne: vi.fn(),
			updateMany: vi.fn(),
			deleteOne: vi.fn(),
			deleteMany: vi.fn(),
			getOneByRef: vi.fn(),
			restoreOne: vi.fn(),
			getTreeForRootOne: vi.fn(),
		};
		service = new SpatialOperationsService(repo);
	});

	it("getPlacementStatusByRef returns unplaced when node is missing", async () => {
		(repo.getOneByRef as ReturnType<typeof vi.fn>).mockRejectedValue(
			new RepositoryNotFoundError({ resource: "SpatialNodeEntity", context: { ref } }),
		);

		const result = await service.getPlacementStatusByRef({ ref, workspaces: [wk] });

		expect(result).toEqual({ node: null, isPlaced: false });
	});

	it("getPlacementStatusByRef returns unplaced when node workspace is outside scope", async () => {
		(repo.getOneByRef as ReturnType<typeof vi.fn>).mockResolvedValue(makeNode({ workspace: wkOther }));

		const result = await service.getPlacementStatusByRef({ ref, workspaces: [wk] });

		expect(result).toEqual({ node: null, isPlaced: false });
	});

	it("getPlacementStatusByRef marks node as placed when it has a parent", async () => {
		const node = makeNode({ parentId: "parent-1" as never });
		(repo.getOneByRef as ReturnType<typeof vi.fn>).mockResolvedValue(node);
		(repo.getMany as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [node] });

		const result = await service.getPlacementStatusByRef({ ref, workspaces: [wk] });

		expect(result.isPlaced).toBe(true);
		expect(result.node?.id).toEqual(node.id);
	});

	it("getPlacementStatusByRef marks node as placed when it has children", async () => {
		const node = makeNode();
		const child = makeNode({ id: "node-2" as never, parentId: node.id });
		(repo.getOneByRef as ReturnType<typeof vi.fn>).mockResolvedValue(node);
		(repo.getMany as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [node, child] });

		const result = await service.getPlacementStatusByRef({ ref, workspaces: [wk] });

		expect(result.isPlaced).toBe(true);
	});

	it("deleteUnplacedNodeByRef deletes only when node is not placed", async () => {
		const node = makeNode();
		(repo.getOneByRef as ReturnType<typeof vi.fn>).mockResolvedValue(node);
		(repo.getMany as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [node] });

		await service.deleteUnplacedNodeByRef({ ref, workspaces: [wk] });

		expect(repo.deleteOne).toHaveBeenCalledWith({
			filters: [{ id: node.id, workspace: node.workspace }],
		});

		(repo.deleteOne as ReturnType<typeof vi.fn>).mockClear();
		(repo.getMany as ReturnType<typeof vi.fn>).mockResolvedValue({
			items: [node, makeNode({ id: "node-2" as never, parentId: node.id })],
		});
		await service.deleteUnplacedNodeByRef({ ref, workspaces: [wk] });
		expect(repo.deleteOne).not.toHaveBeenCalled();
	});

	it("placeNode updates node geometry and parent when reparenting is valid", async () => {
		const existing = makeNode({ id: "node-a" as never });
		const parent = makeNode({ id: "node-parent" as never, kind: "frame", ref: { entity: "location", entityId: "l1" } });
		const updated = makeNode({ id: existing.id, parentId: parent.id, rect: { x: 1, y: 2, width: 3, height: 4 } });
		(repo.getOne as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(existing)
			.mockResolvedValueOnce(parent);
		(repo.getTreeForRootOne as ReturnType<typeof vi.fn>).mockResolvedValue({
			...existing,
			children: [],
		} as SpatialNodeTreeNode);
		(repo.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

		const result = await service.placeNode({
			workspace: wk,
			id: existing.id,
			parentId: parent.id,
			rect: updated.rect,
		});

		expect(result.parentId).toEqual(parent.id);
		expect(repo.updateOne).toHaveBeenCalledWith({
			filters: [{ id: existing.id, workspace: wk }],
			dto: { parentId: parent.id, rect: updated.rect },
		});
	});

	it("placeNode throws when parent is self", async () => {
		const existing = makeNode({ id: "node-self" as never });
		(repo.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

		await expect(
			service.placeNode({
				workspace: wk,
				id: existing.id,
				parentId: existing.id,
				rect: baseRect,
			}),
		).rejects.toThrow("cannot be reparented under itself");
	});

	it("placeNode throws when parent is in node descendant subtree", async () => {
		const existing = makeNode({ id: "root" as never });
		const descendant = makeNode({ id: "child" as never, parentId: existing.id });
		(repo.getOne as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(existing)
			.mockResolvedValueOnce(makeNode({ id: descendant.id }));
		(repo.getTreeForRootOne as ReturnType<typeof vi.fn>).mockResolvedValue({
			...existing,
			children: [{ ...descendant, children: [] }],
		} as SpatialNodeTreeNode);

		await expect(
			service.placeNode({
				workspace: wk,
				id: existing.id,
				parentId: descendant.id,
				rect: baseRect,
			}),
		).rejects.toThrow("cannot be reparented under its own descendant");
	});
});
