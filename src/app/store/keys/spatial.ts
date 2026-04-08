import { createQueryKeys } from "@lukemorales/query-key-factory";
import { client as api } from "@/orpc/client";

export const spatialKeys = createQueryKeys("spatial", {
	allNodes: {
		queryKey: null,
		queryFn: api.spatial.getAllNodes,
	},

	tree: (rootId: string) => ({
		queryKey: [rootId],
		queryFn: () => api.spatial.getTreeForRootId({ id: rootId }),
	}),
});
