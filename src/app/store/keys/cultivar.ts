import { createQueryKeys } from "@lukemorales/query-key-factory";
import { client as api } from "@/orpc/client";

export const cultivarKeys = createQueryKeys("cultivar", {
	all: {
		queryKey: null,
		queryFn: api.cultivar.getAll,
	},

	detail: (id: string) => ({
		queryKey: [id],
		queryFn: () => api.cultivar.getById({ id }),
	}),

	fullById: (id: string) => ({
		queryKey: [id],
		queryFn: () => api.cultivar.getFullById({ id }),
	}),
});
