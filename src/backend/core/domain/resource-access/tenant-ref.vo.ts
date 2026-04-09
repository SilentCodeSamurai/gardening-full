const TENANT_KEY_VERSION = "v1";

/**
 * Optional tenant/account scope for {@link IdentityRef} and {@link ResourceRef}.
 * Reference-only (no tenant aggregate in core).
 */
export class TenantRef {
	public readonly version = TENANT_KEY_VERSION;
	/** Opaque tenant key; trimmed in {@link TenantRef.of}. */
	public readonly key: string;

	private constructor(key: string) {
		this.key = key;
	}

	/** Construct from the raw tenant key string (trimmed). */
	public static of(key: string): TenantRef {
		return new TenantRef(key.trim());
	}

	/** Parse {@link TenantRef.toKey} output. */
	public static fromKey(full: string): TenantRef {
		const m = full.match(/^([^:]+):(.*)$/);
		if (!m || m[1] !== TENANT_KEY_VERSION) {
			throw new Error(`Invalid TenantRef key: ${full}`);
		}
		return TenantRef.of(m[2]);
	}

	public toKey(): string {
		return `${TENANT_KEY_VERSION}:${this.key}`;
	}
}
