import { TenantRef } from "./tenant-ref.vo";

const IDENTITY_KEY_VERSION = "v1";

export type IdentityKind = "user" | "organization" | "team" | "serviceAccount";

export type IdentityRefParams = {
	readonly kind: IdentityKind;
	readonly id: string;
	readonly tenantRef?: TenantRef;
};

const IDENTITY_KINDS = new Set<IdentityKind>(["user", "organization", "team", "serviceAccount"]);

function isIdentityKind(s: string): s is IdentityKind {
	return IDENTITY_KINDS.has(s as IdentityKind);
}

/**
 * Reference to an actor or subject identity (no identity aggregate in core).
 */
export class IdentityRef {
	public readonly keyVersion = IDENTITY_KEY_VERSION;
	public readonly kind: IdentityKind;
	public readonly id: string;
	public readonly tenantRef?: TenantRef;

	private constructor(params: IdentityRefParams) {
		this.kind = params.kind;
		this.id = params.id.trim();
		this.tenantRef = params.tenantRef ? TenantRef.of(params.tenantRef.key) : undefined;
	}

	public static user(id: string, tenantRef?: TenantRef): IdentityRef {
		return new IdentityRef({ kind: "user", id, tenantRef });
	}

	public static organization(id: string, tenantRef?: TenantRef): IdentityRef {
		return new IdentityRef({ kind: "organization", id, tenantRef });
	}

	public static team(id: string, tenantRef?: TenantRef): IdentityRef {
		return new IdentityRef({ kind: "team", id, tenantRef });
	}

	public static serviceAccount(id: string, tenantRef?: TenantRef): IdentityRef {
		return new IdentityRef({ kind: "serviceAccount", id, tenantRef });
	}

	/** Parse {@link IdentityRef.toKey} output. Kind and id must not contain `:`. */
	public static fromKey(full: string): IdentityRef {
		const noTenant = full.match(/^v1:(user|organization|team|serviceAccount)::([^:]+)$/);
		if (noTenant && isIdentityKind(noTenant[1])) {
			return new IdentityRef({ kind: noTenant[1], id: noTenant[2] });
		}
		const withTenant = full.match(/^v1:(user|organization|team|serviceAccount):v1:(.+?):([^:]+)$/);
		if (withTenant && isIdentityKind(withTenant[1])) {
			return new IdentityRef({
				kind: withTenant[1],
				id: withTenant[3],
				tenantRef: TenantRef.of(withTenant[2]),
			});
		}
		throw new Error(`Invalid IdentityRef key: ${full}`);
	}

	public toKey(): string {
		const tenant = this.tenantRef ? this.tenantRef.toKey() : "";
		return `${this.keyVersion}:${this.kind}:${tenant}:${this.id}`;
	}
}
