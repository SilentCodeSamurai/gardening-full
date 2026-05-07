import type { WorkspaceRoleAssignmentEntity } from "@backend/core/domain/access/entities";
import { SubjectVO } from "@backend/core/domain/access/subject.vo";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type {
	CultivarEntity,
	GardeningEventEntity,
	LocationEntity,
	PlantEntity,
	SpeciesCategoryEntity,
	SpeciesEntity,
} from "@backend/core/domain/gardening/entities";
import type { SpatialNodeEntity } from "@backend/core/domain/spatial/entities";
import type {
	CultivarDoc,
	GardeningEventDoc,
	LocationDoc,
	PlantDoc,
	SpatialNodeDoc,
	SpeciesCategoryDoc,
	SpeciesDoc,
	WorkspaceRoleAssignmentDoc,
} from "./mongodb.models";

export function mapSpeciesCategoryDocToEntity(doc: SpeciesCategoryDoc): SpeciesCategoryEntity {
	return { ...doc, workspace: WorkspaceVO.fromKey(doc.workspaceKey as never) };
}

export function mapSpeciesDocToEntity(doc: SpeciesDoc): SpeciesEntity {
	return { ...doc, workspace: WorkspaceVO.fromKey(doc.workspaceKey as never) };
}

export function mapCultivarDocToEntity(doc: CultivarDoc): CultivarEntity {
	return { ...doc, workspace: WorkspaceVO.fromKey(doc.workspaceKey as never) };
}

export function mapPlantDocToEntity(doc: PlantDoc): PlantEntity {
	return { ...doc, workspace: WorkspaceVO.fromKey(doc.workspaceKey as never) };
}

export function mapLocationDocToEntity(doc: LocationDoc): LocationEntity {
	return { ...doc, workspace: WorkspaceVO.fromKey(doc.workspaceKey as never) };
}

export function mapGardeningEventDocToEntity(doc: GardeningEventDoc): GardeningEventEntity {
	return {
		...doc,
		occurredAt: doc.occurredAt ?? null,
		workspace: WorkspaceVO.fromKey(doc.workspaceKey as never),
	};
}

export function mapSpatialNodeDocToEntity(doc: SpatialNodeDoc): SpatialNodeEntity {
	return { ...doc, workspace: WorkspaceVO.fromKey(doc.workspaceKey as never) };
}

export function mapWorkspaceRoleAssignmentDocToEntity(doc: WorkspaceRoleAssignmentDoc): WorkspaceRoleAssignmentEntity {
	return {
		...doc,
		subject: SubjectVO.fromKey(doc.subjectKey as never),
		workspace: WorkspaceVO.fromKey(doc.workspaceKey as never),
	};
}

export const MONGODB_MAPPERS = {
	speciesCategory: mapSpeciesCategoryDocToEntity,
	species: mapSpeciesDocToEntity,
	cultivar: mapCultivarDocToEntity,
	plant: mapPlantDocToEntity,
	location: mapLocationDocToEntity,
	gardeningEvent: mapGardeningEventDocToEntity,
	spatialNode: mapSpatialNodeDocToEntity,
	workspaceRoleAssignment: mapWorkspaceRoleAssignmentDocToEntity,
} as const;
