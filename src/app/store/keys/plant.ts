import { createQueryKeys } from "@lukemorales/query-key-factory";
import { client as api } from "@/orpc/client";

export const plantKeys = createQueryKeys("plant", {
	all: {
		queryKey: null,
		queryFn: api.plant.getAll,
	},

	detail: (id: string) => ({
		queryKey: [id],
		queryFn: () => api.plant.getById({ id }),
	}),
});
