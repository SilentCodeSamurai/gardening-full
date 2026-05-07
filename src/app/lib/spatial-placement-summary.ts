import type { LocationEntity } from "@backend/core/domain/gardening/entities";
import type { ItemPresentationValueObject } from "@backend/core/domain/gardening/value-objects";
import type { SpatialNodeEntity } from "@backend/core/domain/spatial/entities";

import { collectPlacedEntityIds } from "@/store/spatial-placement";

export type LocationPlacementSummary =
	| { kind: "unplaced" }
	| {
			kind: "underParent";
			parentLocationId: string;
			parentName: string;
			parentPresentation?: ItemPresentationValueObject | null;
	  }
	| {
			kind: "rootCanvas";
			selfLocationId: string;
			selfName: string;
			selfPresentation?: ItemPresentationValueObject | null;
	  };

export type PlantPlacementSummary =
	| { kind: "unplaced" }
	| {
			kind: "underLocation";
			locationId: string;
			locationName: string;
			locationPresentation?: ItemPresentationValueObject | null;
	  };

/** Column filter value for locations list placement column (matches `TablePlacementFilterCombobox`). */
export function locationPlacementFilterToken(summary: LocationPlacementSummary): string {
	if (summary.kind === "unplaced") return "unplaced";
	if (summary.kind === "rootCanvas") return "self";
	return `under:${summary.parentLocationId}`;
}

/** Column filter value for plants list placement column. */
export function plantPlacementFilterToken(summary: PlantPlacementSummary): string {
	if (summary.kind === "unplaced") return "unplaced";
	return `under:${summary.locationId}`;
}

function locationMap(items: readonly LocationEntity[]): ReadonlyMap<string, LocationEntity> {
	return new Map(items.map((l) => [String(l.id), l]));
}

/**
 * Resolves how a location sits in the spatial graph for list UX: unplaced, nested under another
 * location (parent presentation + title), or root canvas (no parent but has children — link to self).
 */
export function getLocationPlacementSummary(
	spatialItems: readonly SpatialNodeEntity[],
	location: LocationEntity,
	allLocations: readonly LocationEntity[],
): LocationPlacementSummary {
	const id = String(location.id);
	const placed = collectPlacedEntityIds(spatialItems, "location").has(id);
	if (!placed) return { kind: "unplaced" };

	const node = spatialItems.find((n) => n.ref.entity === "location" && String(n.ref.entityId) === id) ?? null;
	if (!node) return { kind: "unplaced" };

	const byId = locationMap(allLocations);

	if (node.parentId !== null) {
		const parentNode = spatialItems.find((n) => String(n.id) === String(node.parentId)) ?? null;
		if (parentNode?.ref.entity === "location") {
			const parentLoc = byId.get(String(parentNode.ref.entityId));
			if (parentLoc) {
				return {
					kind: "underParent",
					parentLocationId: String(parentLoc.id),
					parentName: parentLoc.name,
					parentPresentation: parentLoc.presentation,
				};
			}
		}
		return { kind: "unplaced" };
	}

	// Root frame: no spatial parent and still “placed” ⇒ has children in the graph.
	return {
		kind: "rootCanvas",
		selfLocationId: id,
		selfName: location.name,
		selfPresentation: location.presentation,
	};
}

/**
 * Plant leaf placement: parent location frame’s presentation + title, or unplaced.
 */
export function getPlantPlacementSummary(
	spatialItems: readonly SpatialNodeEntity[],
	plantId: string,
	allLocations: readonly LocationEntity[],
): PlantPlacementSummary {
	const id = String(plantId);
	const placed = collectPlacedEntityIds(spatialItems, "plant").has(id);
	if (!placed) return { kind: "unplaced" };

	const node = spatialItems.find((n) => n.ref.entity === "plant" && String(n.ref.entityId) === id) ?? null;
	if (!node?.parentId) return { kind: "unplaced" };

	const parentNode = spatialItems.find((n) => String(n.id) === String(node.parentId)) ?? null;
	if (!parentNode || parentNode.ref.entity !== "location") return { kind: "unplaced" };

	const byId = locationMap(allLocations);
	const loc = byId.get(String(parentNode.ref.entityId));
	if (!loc) return { kind: "unplaced" };

	return {
		kind: "underLocation",
		locationId: String(loc.id),
		locationName: loc.name,
		locationPresentation: loc.presentation,
	};
}
