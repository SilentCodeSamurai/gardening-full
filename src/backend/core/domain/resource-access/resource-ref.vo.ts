import { TenantRef } from "./tenant-ref.vo";

const RESOURCE_KEY_VERSION = "v1";

export type ResourceRefParams = { readonly type: string; readonly id: string; readonly tenantRef?: TenantRef };

/** Use "*" to mean all resources of this type (wildcard id). */
export class ResourceRef {
	public readonly keyVersion = RESOURCE_KEY_VERSION;
	/** Dot-separated lowercase tokens, e.g. `gardening.plant`. */
	public readonly type: string;
	public readonly id: string;
	public readonly tenantRef?: TenantRef;

	private constructor(params: ResourceRefParams) {
		this.type = ResourceRef.normalizeType(params.type);
		this.id = params.id.trim();
		this.tenantRef = params.tenantRef ? TenantRef.of(params.tenantRef.key) : undefined;
	}

	/** Construct from type, id, and optional tenant (normalized). */
	public static create(params: ResourceRefParams): ResourceRef {
		return new ResourceRef(params);
	}

	/**
	 * Canonical copy with normalized fields (for DTOs and persisted instances).
	 */
	public static normalize(input: ResourceRefParams | ResourceRef): ResourceRef {
		if (input instanceof ResourceRef) {
			return ResourceRef.create({
				type: input.type,
				id: input.id,
				tenantRef: input.tenantRef,
			});
		}
		return ResourceRef.create(input);
	}

	/** Parse {@link ResourceRef.toKey} output. Tenant and id must not contain `:`. */
	public static fromKey(full: string): ResourceRef {
		const noTenant = full.match(/^v1:(.+?)::([^:]+)$/);
		if (noTenant) {
			return ResourceRef.create({ type: noTenant[1], id: noTenant[2] });
		}
		const withTenant = full.match(/^v1:(.+?):v1:(.+?):([^:]+)$/);
		if (withTenant) {
			return ResourceRef.create({
				type: withTenant[1],
				id: withTenant[3],
				tenantRef: TenantRef.of(withTenant[2]),
			});
		}
		throw new Error(`Invalid ResourceRef key: ${full}`);
	}

	private static normalizeType(type: string): string {
		return type.trim().toLowerCase();
	}

	public static wildcard(type: string, tenantRef?: TenantRef): ResourceRef {
		return new ResourceRef({ type, id: "*", tenantRef });
	}

	public toKey(): string {
		const tenant = this.tenantRef ? this.tenantRef.toKey() : "";
		return `${this.keyVersion}:${this.type}:${tenant}:${this.id}`;
	}

	/**
	 * True if this ref (assignment pattern) covers {@link concrete}
	 * (same type and id, or same type with this id `*`, same tenant key).
	 */
	public covers(concrete: ResourceRef): boolean {
		if (this.type !== concrete.type) return false;
		const ak = this.tenantRef?.key ?? "";
		const ck = concrete.tenantRef?.key ?? "";
		if (ak !== ck) return false;
		return this.id === "*" || this.id === concrete.id;
	}
}
