import { createQueryKeys } from "@lukemorales/query-key-factory";
import { client as api } from "@/orpc/client";

export const gardeningEventKeys = createQueryKeys("gardeningEvent", {
	all: {
		queryKey: null,
		queryFn: api.gardeningEvent.getAll,
	},

	detail: (id: string) => ({
		queryKey: [id],
		queryFn: () => api.gardeningEvent.getById({ id }),
	}),

	forPlant: (plantId: string) => ({
		queryKey: [plantId],
		queryFn: () => api.gardeningEvent.getForPlant({ plantId }),
	}),

	forLocation: (locationId: string) => ({
		queryKey: [locationId],
		queryFn: () => api.gardeningEvent.getForLocation({ locationId }),
	}),

	bindings: (id: string) => ({
		queryKey: [id],
		queryFn: () => api.gardeningEvent.getBindingsForEvent({ id }),
	}),
});
