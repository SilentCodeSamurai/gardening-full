import type { WorkspaceKey } from "@backend/core/domain/access/workspace.vo";
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
import type { InjectionToken } from "tsyringe";
import type { WorkspaceRoleAssignmentEntity } from "#/backend/core/domain/access/entities";
import type { SubjectKey } from "#/backend/core/domain/access/subject.vo";
import { idKey, locationId, plantId } from "../shared/database-ids";

/**
 * In-memory persistence (v2): entity maps store gardening/spatial rows (each row carries {@link WorkspaceVO}).
 * Repositories validate FK/workspace alignment; callers scope reads with `workspace` in filter clauses where needed.
 * Composite map keys for role assignments use persisted subject/workspace key strings from `toKey()` on the VOs.
 */
export class InMemoryStore {
	/** Workspace↔item link keys (see access in-memory workspace-item repository). */
	readonly workspaceItemLinks = new Set<string>();

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

	linkEventToPlant(eventId: GardeningEventEntityId, plantIdArg: PlantEntityId): void {
		const e = idKey(eventId);
		const p = idKey(plantIdArg);
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

	linkEventToLocation(eventId: GardeningEventEntityId, locationIdArg: LocationEntityId): void {
		const e = idKey(eventId);
		const l = idKey(locationIdArg);
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

	unlinkAllEventsFromLocation(locationIdArg: LocationEntityId): void {
		const l = idKey(locationIdArg);
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

	unlinkAllEventsFromPlant(plantIdArg: PlantEntityId): void {
		const p = idKey(plantIdArg);
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

	createSnapshot(): InMemoryStoreSnapshot {
		return {
			workspaceItemLinks: structuredClone([...this.workspaceItemLinks]),
			speciesCategories: structuredClone([...this.speciesCategories.entries()]),
			species: structuredClone([...this.species.entries()]),
			cultivars: structuredClone([...this.cultivars.entries()]),
			plants: structuredClone([...this.plants.entries()]),
			locations: structuredClone([...this.locations.entries()]),
			spatialNodes: structuredClone([...this.spatialNodes.entries()]),
			gardeningEvents: structuredClone([...this.gardeningEvents.entries()]),
			workspaceRoleAssignments: structuredClone([...this.workspaceRoleAssignments.entries()]),
			eventToPlants: structuredClone([...this.eventToPlants.entries()].map(([k, v]) => [k, [...v]])),
			plantToEvents: structuredClone([...this.plantToEvents.entries()].map(([k, v]) => [k, [...v]])),
			eventToLocations: structuredClone([...this.eventToLocations.entries()].map(([k, v]) => [k, [...v]])),
			locationToEvents: structuredClone([...this.locationToEvents.entries()].map(([k, v]) => [k, [...v]])),
		};
	}

	applySnapshot(snapshot: InMemoryStoreSnapshot): void {
		this.workspaceItemLinks.clear();
		for (const key of snapshot.workspaceItemLinks) {
			this.workspaceItemLinks.add(key);
		}
		this.replaceMap(this.speciesCategories, snapshot.speciesCategories);
		this.replaceMap(this.species, snapshot.species);
		this.replaceMap(this.cultivars, snapshot.cultivars);
		this.replaceMap(this.plants, snapshot.plants);
		this.replaceMap(this.locations, snapshot.locations);
		this.replaceMap(this.spatialNodes, snapshot.spatialNodes);
		this.replaceMap(this.gardeningEvents, snapshot.gardeningEvents);
		this.replaceMap(this.workspaceRoleAssignments, snapshot.workspaceRoleAssignments);
		this.replaceLinkMap(this.eventToPlants, snapshot.eventToPlants);
		this.replaceLinkMap(this.plantToEvents, snapshot.plantToEvents);
		this.replaceLinkMap(this.eventToLocations, snapshot.eventToLocations);
		this.replaceLinkMap(this.locationToEvents, snapshot.locationToEvents);
	}

	private replaceMap<K, V>(target: Map<K, V>, entries: readonly (readonly [K, V])[]): void {
		target.clear();
		for (const [key, value] of entries) {
			target.set(key, value);
		}
	}

	private replaceLinkMap(
		target: Map<string, Set<string>>,
		entries: readonly (readonly [string, readonly string[]])[],
	) {
		target.clear();
		for (const [key, values] of entries) {
			target.set(key, new Set(values));
		}
	}
}

export type InMemoryStoreSnapshot = {
	workspaceItemLinks: readonly string[];
	speciesCategories: readonly (readonly [string, SpeciesCategoryEntity])[];
	species: readonly (readonly [string, SpeciesEntity])[];
	cultivars: readonly (readonly [string, CultivarEntity])[];
	plants: readonly (readonly [string, PlantEntity])[];
	locations: readonly (readonly [string, LocationEntity])[];
	spatialNodes: readonly (readonly [string, SpatialNodeEntity])[];
	gardeningEvents: readonly (readonly [string, GardeningEventEntity])[];
	workspaceRoleAssignments: readonly (readonly [`${SubjectKey}|${WorkspaceKey}`, WorkspaceRoleAssignmentEntity])[];
	eventToPlants: readonly (readonly [string, readonly string[]])[];
	plantToEvents: readonly (readonly [string, readonly string[]])[];
	eventToLocations: readonly (readonly [string, readonly string[]])[];
	locationToEvents: readonly (readonly [string, readonly string[]])[];
};

export class InMemoryDatabaseClient {
	private readonly rootStore = new InMemoryStore();

	getStore(): InMemoryStore {
		return this.rootStore;
	}

	createStoreFromSnapshot(snapshot: InMemoryStoreSnapshot): InMemoryStore {
		const store = new InMemoryStore();
		store.applySnapshot(snapshot);
		return store;
	}
}

export const InMemoryStoreToken: InjectionToken<InMemoryStore> = Symbol.for("InMemoryStore");
export const InMemoryDatabaseClientToken: InjectionToken<InMemoryDatabaseClient> = Symbol.for("InMemoryDatabaseClient");
