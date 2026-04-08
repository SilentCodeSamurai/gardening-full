import { createQueryKeys } from "@lukemorales/query-key-factory";
import { client as api } from "@/orpc/client";

export const speciesCategoryKeys = createQueryKeys("speciesCategory", {
	all: {
		queryKey: null,
		queryFn: api.speciesCategory.getAll,
	},

	detail: (id: string) => ({
		queryKey: [id],
		queryFn: () => api.speciesCategory.getById({ id }),
	}),
});
