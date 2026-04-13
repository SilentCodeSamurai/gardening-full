import type {
	SpatialNodeEntity,
	SpatialNodeEntityId,
	SpatialNodeTreeNode,
} from "@backend/core/domain/spatial/entities";
import type { ItemsContainer } from "@backend/shared/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { SpatialLayoutNode, SpatialLayoutOperation } from "@/components/spatial-layout-editor";
import { orpc } from "@/orpc/client";
import { queryKeys } from "@/store/keys";

type BackendSpatialOp = {
	id: string;
	parentId: string | null;
	rect: { x: number; y: number; width: number; height: number };
};

type BackendRestoreOp = BackendSpatialOp & {
	kind: SpatialNodeEntity["kind"];
	ref: SpatialNodeEntity["ref"];
};
type BackendCommand =
	| { type: "upsert"; op: BackendSpatialOp }
	| { type: "restore"; op: BackendRestoreOp }
	| { type: "delete"; id: string };

function parseBackendCommands(operations: readonly SpatialLayoutOperation<SpatialLayoutNode>[]): BackendCommand[] {
	const commands: BackendCommand[] = [];
	const walk = (op: SpatialLayoutOperation<SpatialLayoutNode>) => {
		switch (op.type) {
			case "batch":
				for (const inner of op.ops) walk(inner as SpatialLayoutOperation<SpatialLayoutNode>);
				return;
			case "updateNode":
			case "reparentNode":
				commands.push({
					type: "upsert",
					op: {
						id: op.after.id,
						parentId: op.after.parentId ?? null,
						rect: {
							x: op.after.geometry.x,
							y: op.after.geometry.y,
							width: op.after.geometry.width,
							height: op.after.geometry.height,
						},
					},
				});
				return;
			case "createNode":
			case "restoreNode": {
				if (!op.after.spatialRef) {
					throw new Error("Spatial restore requires spatialRef in snapshot.");
				}
				commands.push({
					type: "restore",
					op: {
						id: op.after.id,
						parentId: op.after.parentId ?? null,
						rect: {
							x: op.after.geometry.x,
							y: op.after.geometry.y,
							width: op.after.geometry.width,
							height: op.after.geometry.height,
						},
						kind: op.after.acceptsChildren ? "frame" : "leaf",
						ref: op.after.spatialRef,
					},
				});
				return;
			}
			case "deleteNode":
				commands.push({ type: "delete", id: op.before.id });
				return;
			default:
				throw new Error("Spatial layout operation not supported in batch apply");
		}
	};
	for (const op of operations) walk(op);
	return commands;
}

function commandToUpsert(command: BackendCommand): BackendSpatialOp | null {
	if (command.type === "upsert") return command.op;
	if (command.type === "restore") {
		return {
			id: command.op.id,
			parentId: command.op.parentId,
			rect: command.op.rect,
		};
	}
	return null;
}

export function useSpatialLayoutApplyOperationsMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: { operations: readonly SpatialLayoutOperation<SpatialLayoutNode>[] }) => {
			const commands = parseBackendCommands(input.operations);
			for (const command of commands) {
				if (command.type === "upsert") {
					await orpc.spatial.applyOperations.call({
						operations: [
							{
								id: command.op.id as unknown as SpatialNodeEntityId,
								parentId: command.op.parentId as unknown as SpatialNodeEntityId | null,
								rect: command.op.rect,
							},
						],
					});
					continue;
				}
				if (command.type === "restore") {
					await orpc.spatial.restoreNode.call({
						id: command.op.id as unknown as SpatialNodeEntityId,
						parentId: command.op.parentId as unknown as SpatialNodeEntityId | null,
						rect: command.op.rect,
						kind: command.op.kind,
						ref: command.op.ref,
					});
					continue;
				}
				await orpc.spatial.deleteNode.call({ id: command.id as unknown as SpatialNodeEntityId });
			}
		},
		onMutate: async (input) => {
			await queryClient.cancelQueries({ queryKey: queryKeys.spatial._def });

			const previousAllNodes = queryClient.getQueryData<ItemsContainer<SpatialNodeEntity>>(
				queryKeys.spatial.allNodes.queryKey,
			);

			const commands = parseBackendCommands(input.operations);
			const ops = commands.map((c) => commandToUpsert(c)).filter((o): o is BackendSpatialOp => o !== null);
			const deletedIds = new Set(
				commands
					.filter((c): c is { type: "delete"; id: string } => c.type === "delete")
					.map((c) => String(c.id)),
			);

			let nextAllNodesItems: SpatialNodeEntity[] | null = null;
			if (previousAllNodes) {
				const byId = new Map(
					previousAllNodes.items.filter((n) => !deletedIds.has(String(n.id))).map((n) => [String(n.id), n]),
				);
				for (const op of ops) {
					const existing = byId.get(String(op.id));
					if (existing) {
						byId.set(String(op.id), {
							...existing,
							parentId: op.parentId as SpatialNodeEntityId | null,
							rect: op.rect,
							updatedAt: new Date(),
						});
						continue;
					}
					const restoreCommand = commands.find(
						(c): c is { type: "restore"; op: BackendRestoreOp } =>
							c.type === "restore" && String(c.op.id) === String(op.id),
					);
					if (restoreCommand) {
						const workspace =
							[...byId.values()].find((n) => n.workspace)?.workspace ??
							previousAllNodes.items[0]?.workspace;
						if (!workspace) continue;
						byId.set(String(op.id), {
							workspace,
							id: op.id as unknown as SpatialNodeEntityId,
							parentId: op.parentId as SpatialNodeEntityId | null,
							rect: op.rect,
							kind: restoreCommand.op.kind,
							ref: restoreCommand.op.ref,
							createdAt: new Date(),
							updatedAt: new Date(),
						});
					}
				}
				queryClient.setQueryData<ItemsContainer<SpatialNodeEntity>>(queryKeys.spatial.allNodes.queryKey, {
					items: [...byId.values()],
				});
				nextAllNodesItems = [...byId.values()];
			}

			// Rebuild cached trees from the same optimistic allNodes snapshot so multi-op
			// undo/redo updates atomically without transient intermediate positions.
			const treeQueries = queryClient.getQueriesData<SpatialNodeTreeNode>({
				queryKey: queryKeys.spatial.tree._def,
			});
			for (const [key, tree] of treeQueries) {
				if (!tree) continue;
				if (!nextAllNodesItems) continue;
				const rootId = String(tree.id);
				const byId = new Map(nextAllNodesItems.map((n) => [String(n.id), n]));
				const byParent = new Map<string, SpatialNodeEntity[]>();
				for (const n of nextAllNodesItems) {
					const parentKey = n.parentId ? String(n.parentId) : "__root__";
					const arr = byParent.get(parentKey);
					if (arr) arr.push(n);
					else byParent.set(parentKey, [n]);
				}
				const build = (id: string): SpatialNodeTreeNode | null => {
					const row = byId.get(id);
					if (!row) return null;
					const children = (byParent.get(id) ?? [])
						.slice()
						.sort((a, b) => String(a.id).localeCompare(String(b.id)))
						.map((child) => build(String(child.id)))
						.filter((child): child is SpatialNodeTreeNode => child !== null);
					return { ...row, children };
				};
				queryClient.setQueryData(key, build(rootId));
			}

			return { previousAllNodes, treeQueries };
		},
		onError: (_error, _input, ctx) => {
			if (ctx?.previousAllNodes) {
				queryClient.setQueryData(queryKeys.spatial.allNodes.queryKey, ctx.previousAllNodes);
			}
			if (ctx?.treeQueries) {
				for (const [key, value] of ctx.treeQueries) {
					queryClient.setQueryData(key, value);
				}
			}
		},
	});
}
