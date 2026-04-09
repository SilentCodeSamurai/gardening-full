import type {
	ResoursePermissionRepositoryPort,
	ResoursePermissionRevokeRoleAssignmentInputDTO,
	ResoursePermissionUpsertRoleAssignmentInputDTO,
} from "@backend/core/application/ports/repositories/resource-access/resourse-permission.repository.port";
import { BaseRepositoryErrors } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { ResoursePermissionEntity } from "@backend/core/domain/resource-access";
import { type IdentityRef, ResourceRef } from "@backend/core/domain/resource-access";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { resoursePermissionId } from "@backend/infrastructure/integrations/shared/database-ids";

function compositeKey(subjectRef: IdentityRef, resourceRef: ResourceRef, role: string): string {
	return `${subjectRef.toKey()}|${ResourceRef.normalize(resourceRef).toKey()}|${role}`;
}

export class ResoursePermissionInMemoryRepository
	extends BaseRepositoryErrors
	implements ResoursePermissionRepositoryPort
{
	constructor(private readonly store: InMemoryStore) {
		super();
	}

	/** Synchronous persist for DI / bootstrap (avoids race before first resolve). */
	putRoleAssignmentSync(input: ResoursePermissionUpsertRoleAssignmentInputDTO): ResoursePermissionEntity {
		const resourceRef = ResourceRef.normalize(input.resourceRef);
		const key = compositeKey(input.subjectRef, resourceRef, input.role);
		const existing = this.store.resoursePermissions.get(key);
		const entity: ResoursePermissionEntity = {
			id: existing?.id ?? resoursePermissionId(),
			subjectRef: input.subjectRef,
			resourceRef,
			role: input.role,
			createdAt: existing?.createdAt ?? new Date(),
			grantSource: input.grantSource ?? existing?.grantSource,
		};
		this.store.resoursePermissions.set(key, entity);
		return entity;
	}

	async upsertRoleAssignment(
		input: ResoursePermissionUpsertRoleAssignmentInputDTO,
	): Promise<ResoursePermissionEntity> {
		return this.putRoleAssignmentSync(input);
	}

	async revokeRoleAssignment(input: ResoursePermissionRevokeRoleAssignmentInputDTO): Promise<void> {
		const resourceRef = ResourceRef.normalize(input.resourceRef);
		const key = compositeKey(input.subjectRef, resourceRef, input.role);
		this.store.resoursePermissions.delete(key);
	}

	async listAssignmentsForSubject(input: {
		subjectRef: IdentityRef;
	}): Promise<{ items: ResoursePermissionEntity[] }> {
		const sk = input.subjectRef.toKey();
		return {
			items: [...this.store.resoursePermissions.values()].filter((r) => r.subjectRef.toKey() === sk),
		};
	}

	async listAssignmentsForSubjects(input: {
		subjectRefs: IdentityRef[];
	}): Promise<{ items: ResoursePermissionEntity[] }> {
		const keys = new Set(input.subjectRefs.map((s) => s.toKey()));
		return {
			items: [...this.store.resoursePermissions.values()].filter((r) => keys.has(r.subjectRef.toKey())),
		};
	}

	async listAssignmentsCoveringResources(input: {
		resourceRefs: readonly ResourceRef[];
	}): Promise<{ coveringPerRef: ReadonlyArray<readonly ResoursePermissionEntity[]> }> {
		const all = [...this.store.resoursePermissions.values()];
		const coveringPerRef = input.resourceRefs.map((concrete) => {
			const normalized = ResourceRef.normalize(concrete);
			return all.filter((row) => ResourceRef.normalize(row.resourceRef).covers(normalized));
		});
		return { coveringPerRef };
	}
}
