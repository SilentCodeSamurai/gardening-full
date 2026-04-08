import { createQueryKeys } from "@lukemorales/query-key-factory";
import { client as api } from "@/orpc/client";

export const locationKeys = createQueryKeys("location", {
	all: {
		queryKey: null,
		queryFn: api.location.getAll,
	},

	detail: (id: string) => ({
		queryKey: [id],
		queryFn: () => api.location.getById({ id }),
	}),
});
