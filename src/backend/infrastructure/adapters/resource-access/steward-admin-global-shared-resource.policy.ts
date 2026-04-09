import type { GlobalSharedResourcePolicyPort } from "@backend/core/application/ports/access/global-shared-resource-policy.port";
import type { ResoursePermissionRepositoryPort } from "@backend/core/application/ports/repositories/resource-access/resourse-permission.repository.port";
import type { IdentityRef, ResourceRef } from "@backend/core/domain/resource-access";
import { ResourceRef as ResourceRefVo } from "@backend/core/domain/resource-access";

/**
 * Treats a resource as globally readable when the configured steward subject has an admin assignment covering it.
 */
export class StewardAdminGlobalSharedResourcePolicy implements GlobalSharedResourcePolicyPort {
	constructor(
		private readonly permissionRepository: ResoursePermissionRepositoryPort,
		private readonly stewardSubjectRef: IdentityRef,
	) {}

	async flagsForResourceRefs(resourceRefs: readonly ResourceRef[]): Promise<readonly boolean[]> {
		if (resourceRefs.length < 1) return [];
		const normalized = resourceRefs.map((r) => ResourceRefVo.normalize(r));
		const { coveringPerRef } = await this.permissionRepository.listAssignmentsCoveringResources({
			resourceRefs: normalized,
		});
		const sk = this.stewardSubjectRef.toKey();
		return coveringPerRef.map((rows) =>
			rows.some((r) => r.subjectRef.toKey() === sk && r.role === "admin"),
		);
	}
}
