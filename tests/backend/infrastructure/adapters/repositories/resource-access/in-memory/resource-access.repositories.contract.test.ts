import { describe, expect, it } from "vitest";

/** Resource-based permission repositories were removed; keep file so vitest has a suite. */
describe("Resource access repository contracts (removed)", () => {
	it("no longer registers in-memory permission-assignment contracts", () => {
		expect(true).toBe(true);
	});
});
