import type { AccessAction, AccessDecision } from "@backend/core/domain/resource-access";
import {
	type AccessRole,
	accessRoleAllows,
	accessRoleOrder,
	IdentityRef,
	ResourceRef,
} from "@backend/core/domain/resource-access";
import type { GlobalSharedResourcePolicyPort } from "../../ports/access/global-shared-resource-policy.port";
import type { ResourceAccessAuditPort } from "../../ports/audit/resource-access-audit.port";
import type { ResoursePermissionRepositoryPort } from "../../ports/repositories/resource-access/resourse-permission.repository.port";
import type { SubjectExpansionResolverPort } from "../../ports/resolvers/subject-expansion-resolver.port";
import { defaultWorkspaceRef } from "../../resource-refs";
import type { UseCaseContext } from "../../use-cases/use-case-context";
import {
	AccessForbiddenApplicationError,
	AccessScopeMismatchApplicationError,
	AccessSubjectNotResolvedApplicationError,
} from "./access-control.errors";

export type ResourceIdMask = {
	readonly exactIds: string[];
	/** If true, caller should use domain repository getAll (any id of this type may be readable). */
	readonly includesAllOfType: boolean;
};

export class AccessControlApplicationService {
	static filterItemsByReadableMask<T extends { id: unknown }>(items: T[], mask: ResourceIdMask): T[] {
		if (mask.includesAllOfType) return items;
		const allow = new Set(mask.exactIds);
		return items.filter((i) => allow.has(String(i.id)));
	}

	/**
	 * Combines role-based readable ids with items flagged as globally shared (see {@link GlobalSharedResourcePolicyPort}).
	 */
	static filterReadableOrGlobalShared<T extends { id: unknown; systemCatalog: boolean }>(
		items: T[],
		mask: ResourceIdMask,
	): T[] {
		if (mask.includesAllOfType) return items;
		const allow = new Set(mask.exactIds);
		return items.filter((i) => i.systemCatalog || allow.has(String(i.id)));
	}

	constructor(
		private readonly permissionRepository: ResoursePermissionRepositoryPort,
		private readonly subjectExpansion: SubjectExpansionResolverPort,
		private readonly globalSharedResourcePolicy: GlobalSharedResourcePolicyPort,
		private readonly audit?: ResourceAccessAuditPort,
	) {}

	private assertTenantAligned(actorRef: IdentityRef, resourceRef: ResourceRef): void {
		const ak = actorRef.tenantRef?.key ?? "";
		const rk = resourceRef.tenantRef?.key ?? "";
		if (ak !== rk) {
			throw new AccessScopeMismatchApplicationError({
				context: { actorTenant: ak, resourceTenant: rk },
			});
		}
	}

	private async resolveExpandedSubjects(actorRef: IdentityRef): Promise<IdentityRef[]> {
		try {
			const expanded = await this.subjectExpansion.expandSubjects(actorRef);
			if (expanded.length < 1) {
				throw new AccessSubjectNotResolvedApplicationError({
					context: { actorKey: actorRef.toKey() },
				});
			}
			return expanded;
		} catch (e) {
			if (e instanceof AccessSubjectNotResolvedApplicationError) throw e;
			throw new AccessSubjectNotResolvedApplicationError({
				context: { actorKey: actorRef.toKey(), cause: String(e) },
			});
		}
	}

	private async loadAssignmentsForActor(actorRef: IdentityRef) {
		const subjects = await this.resolveExpandedSubjects(actorRef);
		const rows = await this.permissionRepository.listAssignmentsForSubjects({ subjectRefs: subjects });
		return rows.items;
	}

	public async getGlobalSharedResourceFlags(resourceRefs: readonly ResourceRef[]): Promise<boolean[]> {
		const flags = await this.globalSharedResourcePolicy.flagsForResourceRefs(resourceRefs);
		return [...flags];
	}

	private async allowsGlobalSharedRead(resourceRef: ResourceRef): Promise<boolean> {
		const flags = await this.globalSharedResourcePolicy.flagsForResourceRefs([resourceRef]);
		return flags[0] ?? false;
	}

	public async evaluateAccess(params: {
		actorRef: IdentityRef;
		action: AccessAction;
		resourceRef: ResourceRef;
	}): Promise<AccessDecision> {
		const resourceRef = ResourceRef.normalize(params.resourceRef);
		this.assertTenantAligned(params.actorRef, resourceRef);

		const assignments = await this.loadAssignmentsForActor(params.actorRef);
		let best: { role: AccessRole; assignmentId: string } | undefined;

		for (const a of assignments) {
			if (!a.resourceRef.covers(resourceRef)) continue;
			if (!accessRoleAllows(a.role, params.action)) continue;
			if (!best || accessRoleOrder(a.role) > accessRoleOrder(best.role)) {
				best = { role: a.role, assignmentId: a.id };
			}
		}

		if (best) {
			return {
				allowed: true,
				action: params.action,
				reasonCode: "ALLOW_ROLE",
				matchedRole: best.role,
				matchedAssignmentId: best.assignmentId,
			};
		}

		if (params.action === "read" && (await this.allowsGlobalSharedRead(resourceRef))) {
			return {
				allowed: true,
				action: params.action,
				reasonCode: "ALLOW_GLOBAL_SHARED_READ",
			};
		}

		const shapeMatch = assignments.some((a) => a.resourceRef.covers(resourceRef));
		return {
			allowed: false,
			action: params.action,
			reasonCode: shapeMatch ? "DENY_ROLE_MISSING_ACTION" : "DENY_NO_MATCHING_ASSIGNMENT",
		};
	}

	public async assertCanRead(context: UseCaseContext, resourceRef: ResourceRef): Promise<AccessDecision> {
		const d = await this.evaluateAccess({ actorRef: context.actorRef, action: "read", resourceRef });
		if (!d.allowed) {
			throw new AccessForbiddenApplicationError({ reason: d.reasonCode, context: { action: "read" } });
		}
		return d;
	}

	public async assertCanCreate(context: UseCaseContext, parentScopeRef: ResourceRef): Promise<AccessDecision> {
		const d = await this.evaluateAccess({
			actorRef: context.actorRef,
			action: "create",
			resourceRef: ResourceRef.normalize(parentScopeRef),
		});
		if (!d.allowed) {
			throw new AccessForbiddenApplicationError({ reason: d.reasonCode, context: { action: "create" } });
		}
		return d;
	}

	public async assertCanUpdate(context: UseCaseContext, resourceRef: ResourceRef): Promise<AccessDecision> {
		const d = await this.evaluateAccess({ actorRef: context.actorRef, action: "update", resourceRef });
		if (!d.allowed) {
			throw new AccessForbiddenApplicationError({ reason: d.reasonCode, context: { action: "update" } });
		}
		return d;
	}

	public async assertCanDelete(context: UseCaseContext, resourceRef: ResourceRef): Promise<AccessDecision> {
		const d = await this.evaluateAccess({ actorRef: context.actorRef, action: "delete", resourceRef });
		if (!d.allowed) {
			throw new AccessForbiddenApplicationError({ reason: d.reasonCode, context: { action: "delete" } });
		}
		return d;
	}

	public async assertCanGrantPermission(context: UseCaseContext, resourceRef: ResourceRef): Promise<AccessDecision> {
		const d = await this.evaluateAccess({
			actorRef: context.actorRef,
			action: "grantPermission",
			resourceRef,
		});
		if (!d.allowed) {
			throw new AccessForbiddenApplicationError({
				reason: d.reasonCode,
				context: { action: "grantPermission" },
			});
		}
		return d;
	}

	public async getReadableResourceMask(params: {
		actorRef: IdentityRef;
		resourceType: string;
	}): Promise<ResourceIdMask> {
		const normalizedType = params.resourceType.trim().toLowerCase();
		const assignments = await this.loadAssignmentsForActor(params.actorRef);
		const exactIds = new Set<string>();
		let includesAllOfType = false;

		for (const a of assignments) {
			if (a.resourceRef.type !== normalizedType) continue;
			if (!accessRoleAllows(a.role, "read")) continue;
			try {
				this.assertTenantAligned(params.actorRef, a.resourceRef);
			} catch {
				continue;
			}
			if (a.resourceRef.id === "*") {
				includesAllOfType = true;
			} else {
				exactIds.add(a.resourceRef.id);
			}
		}

		return { exactIds: [...exactIds], includesAllOfType };
	}

	public async assignRole(
		context: UseCaseContext,
		input: { subjectRef: IdentityRef; resourceRef: ResourceRef; role: AccessRole; grantSource?: string },
	) {
		await this.assertCanGrantPermission(context, input.resourceRef);
		const row = await this.permissionRepository.upsertRoleAssignment({
			subjectRef: input.subjectRef,
			resourceRef: input.resourceRef,
			role: input.role,
			grantSource: input.grantSource,
		});
		this.audit?.recordRoleAssigned({
			actorRef: context.actorRef,
			subjectRef: input.subjectRef,
			resourceRef: input.resourceRef,
			role: input.role,
			grantSource: input.grantSource,
		});
		return row;
	}

	public async revokeRole(
		context: UseCaseContext,
		input: { subjectRef: IdentityRef; resourceRef: ResourceRef; role: AccessRole },
	) {
		await this.assertCanGrantPermission(context, input.resourceRef);
		await this.permissionRepository.revokeRoleAssignment({
			subjectRef: input.subjectRef,
			resourceRef: input.resourceRef,
			role: input.role,
		});
		this.audit?.recordRoleRevoked({
			actorRef: context.actorRef,
			subjectRef: input.subjectRef,
			resourceRef: input.resourceRef,
			role: input.role,
		});
	}

	public async bootstrapResourceAdminForActor(context: UseCaseContext, resourceRef: ResourceRef): Promise<void> {
		await this.permissionRepository.upsertRoleAssignment({
			subjectRef: context.actorRef,
			resourceRef,
			role: "admin",
			grantSource: "bootstrap-creator",
		});
	}

	/**
	 * Grants default workspace editor to a newly registered user (no `grantPermission` on caller; not audited as a grant).
	 */
	public async ensureDefaultWorkspaceEditorForNewUser(userId: string): Promise<void> {
		await this.permissionRepository.upsertRoleAssignment({
			subjectRef: IdentityRef.user(userId),
			resourceRef: defaultWorkspaceRef(),
			role: "editor",
			grantSource: "registration-default-workspace",
		});
	}
}
