import type { WorkspaceRoleAssignmentEntity } from "@backend/core/domain/access/workspace-role-assignment.entity";
import type {
	CultivarEntity,
	GardeningEventEntity,
	GardeningEventEntityId,
	LocationEntity,
	LocationEntityId,
	PlantEntity,
	PlantEntityId,
	SpeciesCategoryEntity,
	SpeciesEntity,
} from "@backend/core/domain/gardening/entities";
import type { SpatialNodeEntity } from "@backend/core/domain/spatial/entities";
import type { SubjectKey } from "#/backend/core/domain/access/subject.vo";
import type { WorkspaceKey } from "#/backend/core/domain/access/workspace.vo";
import { idKey, locationId, plantId } from "../shared/database-ids";

/**
 * In-memory persistence client for the gardening aggregate: entity maps plus
 * event↔plant / event↔location associations (events do not embed FK fields).
 */
export class InMemoryStore {
	readonly speciesCategories = new Map<string, SpeciesCategoryEntity>();
	readonly species = new Map<string, SpeciesEntity>();
	readonly cultivars = new Map<string, CultivarEntity>();
	readonly plants = new Map<string, PlantEntity>();
	readonly locations = new Map<string, LocationEntity>();
	readonly spatialNodes = new Map<string, SpatialNodeEntity>();
	readonly gardeningEvents = new Map<string, GardeningEventEntity>();
	readonly workspaceRoleAssignments = new Map<`${SubjectKey}|${WorkspaceKey}`, WorkspaceRoleAssignmentEntity>();

	private readonly eventToPlants = new Map<string, Set<string>>();
	readonly plantToEvents = new Map<string, Set<string>>();
	private readonly eventToLocations = new Map<string, Set<string>>();
	readonly locationToEvents = new Map<string, Set<string>>();

	linkEventToPlant(eventId: GardeningEventEntityId, plantId: PlantEntityId): void {
		const e = idKey(eventId);
		const p = idKey(plantId);
		let plantSet = this.eventToPlants.get(e);
		if (!plantSet) {
			plantSet = new Set();
			this.eventToPlants.set(e, plantSet);
		}
		plantSet.add(p);
		let eventSet = this.plantToEvents.get(p);
		if (!eventSet) {
			eventSet = new Set();
			this.plantToEvents.set(p, eventSet);
		}
		eventSet.add(e);
	}

	linkEventToLocation(eventId: GardeningEventEntityId, locationId: LocationEntityId): void {
		const e = idKey(eventId);
		const l = idKey(locationId);
		let locSet = this.eventToLocations.get(e);
		if (!locSet) {
			locSet = new Set();
			this.eventToLocations.set(e, locSet);
		}
		locSet.add(l);
		let evSet = this.locationToEvents.get(l);
		if (!evSet) {
			evSet = new Set();
			this.locationToEvents.set(l, evSet);
		}
		evSet.add(e);
	}

	/**
	 * Reads association keys for an event (empty arrays when the event exists but has no links).
	 */
	getBindingsForEvent(eventId: GardeningEventEntityId): {
		plantIds: PlantEntityId[];
		locationIds: LocationEntityId[];
	} {
		const e = idKey(eventId);
		const plantKeys = [...(this.eventToPlants.get(e) ?? [])];
		const locKeys = [...(this.eventToLocations.get(e) ?? [])];
		return {
			plantIds: plantKeys.map((k) => plantId(k)),
			locationIds: locKeys.map((k) => locationId(k)),
		};
	}

	clearAllLinksForEvent(eventId: GardeningEventEntityId): void {
		const e = idKey(eventId);
		const plants = this.eventToPlants.get(e);
		if (plants) {
			for (const p of plants) {
				const set = this.plantToEvents.get(p);
				set?.delete(e);
				if (set && set.size === 0) this.plantToEvents.delete(p);
			}
		}
		const locs = this.eventToLocations.get(e);
		if (locs) {
			for (const l of locs) {
				const set = this.locationToEvents.get(l);
				set?.delete(e);
				if (set && set.size === 0) this.locationToEvents.delete(l);
			}
		}
		this.eventToPlants.delete(e);
		this.eventToLocations.delete(e);
	}

	/** Remove every event↔location link for this location (events are kept; other links unchanged). */
	unlinkAllEventsFromLocation(locationId: LocationEntityId): void {
		const l = idKey(locationId);
		const eventIds = this.locationToEvents.get(l);
		if (!eventIds || eventIds.size === 0) return;
		for (const e of [...eventIds]) {
			this.eventToLocations.get(e)?.delete(l);
			if (this.eventToLocations.get(e)?.size === 0) {
				this.eventToLocations.delete(e);
			}
		}
		this.locationToEvents.delete(l);
	}

	/** Remove every event↔plant link for this plant (events are kept; other links unchanged). */
	unlinkAllEventsFromPlant(plantId: PlantEntityId): void {
		const p = idKey(plantId);
		const eventIds = this.plantToEvents.get(p);
		if (!eventIds || eventIds.size === 0) return;
		for (const e of [...eventIds]) {
			this.eventToPlants.get(e)?.delete(p);
			if (this.eventToPlants.get(e)?.size === 0) {
				this.eventToPlants.delete(e);
			}
		}
		this.plantToEvents.delete(p);
	}
}
