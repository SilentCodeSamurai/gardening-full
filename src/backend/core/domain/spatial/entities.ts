import type { BaseEntity, BaseEntityId } from "@backend/core/domain/shared/entities";

export type SpatialNodeEntityId = BaseEntityId<string, "SpatialNode">;

export type SpatialRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

/**
 * Points a spatial node to a domain entity (gardening today, other domains later).
 * This keeps the Spatial domain independent from any specific domain schema.
 */
export type SpatialNodeEntityRef = Readonly<{
	entity: "location" | "plant";
	entityId: string;
}>;

export type SpatialNodeKind = "frame" | "leaf";

export type SpatialNodeEntity = BaseEntity<SpatialNodeEntityId> & {
	parentId: SpatialNodeEntityId | null;
	rect: SpatialRect;
	kind: SpatialNodeKind;
	ref: SpatialNodeEntityRef;
};

export type SpatialNodeTreeNode = SpatialNodeEntity & {
	children: SpatialNodeTreeNode[];
};
