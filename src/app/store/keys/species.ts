import { createQueryKeys } from "@lukemorales/query-key-factory";
import { client as api } from "@/orpc/client";

export const speciesKeys = createQueryKeys("species", {
	all: {
		queryKey: null,
		queryFn: api.species.getAll,
	},

	detail: (id: string) => ({
		queryKey: [id],
		queryFn: () => api.species.getById({ id }),
	}),
});
