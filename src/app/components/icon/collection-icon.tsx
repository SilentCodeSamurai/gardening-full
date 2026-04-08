import type { LucideIcon } from "lucide-react";
import { CalendarDays, Dna, Leaf, List, MapPin, Shapes } from "lucide-react";

import { cn } from "@/lib/utils";

/** Keys for gardening list/detail areas that share sidebar + title icons. */
export type GardeningCollectionKey =
	| "speciesCategory"
	| "species"
	| "cultivar"
	| "plant"
	| "location"
	| "gardeningEvent";

export const COLLECTION_NAV_ICONS: Record<GardeningCollectionKey, LucideIcon> = {
	speciesCategory: Shapes,
	species: List,
	cultivar: Dna,
	plant: Leaf,
	location: MapPin,
	gardeningEvent: CalendarDays,
};

type CollectionIconProps = {
	collection: GardeningCollectionKey;
	className?: string;
};

/** Lucide icon for a gardening collection (sidebar nav, page titles). */
export function CollectionIcon({ collection, className }: CollectionIconProps) {
	const Icon = COLLECTION_NAV_ICONS[collection];
	return <Icon className={cn("shrink-0", className)} aria-hidden />;
}
