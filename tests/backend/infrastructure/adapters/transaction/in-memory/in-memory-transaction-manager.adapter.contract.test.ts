import { InMemoryTransactionManagerAdapter } from "@backend/infrastructure/adapters/transaction/in-memory-transaction-manager.adapter";
import type { InMemoryStore } from "@backend/infrastructure/integrations/in-memory-database/client";
import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryTransactionTestContainer } from "./create-in-memory-transaction-test-container";

describe("InMemoryTransactionManagerAdapter", () => {
	let manager: InMemoryTransactionManagerAdapter;

	const writeMarker = (session: InMemoryStore, marker: string): void => {
		session.workspaceItemLinks.add(marker);
	};

	const hasMarker = (session: InMemoryStore, marker: string): boolean =>
		session.workspaceItemLinks.has(marker);

	beforeEach(() => {
		const container = createInMemoryTransactionTestContainer();
		manager = container.resolve(InMemoryTransactionManagerAdapter);
	});

	it("commit persists writes from transaction session", async () => {
		const marker = "tx-commit-marker";
		expect(hasMarker(manager.session, marker)).toBe(false);

		await manager.begin();
		writeMarker(manager.session, marker);
		await manager.commit();

		expect(hasMarker(manager.session, marker)).toBe(true);
	});

	it("rollback discards writes from transaction session", async () => {
		const marker = "tx-rollback-marker";
		expect(hasMarker(manager.session, marker)).toBe(false);

		await manager.begin();
		writeMarker(manager.session, marker);
		await manager.rollback();

		expect(hasMarker(manager.session, marker)).toBe(false);
	});

	it("nested commit defers persistence until outer commit", async () => {
		const marker = "tx-nested-marker";
		await manager.begin();
		await manager.begin();
		writeMarker(manager.session, marker);

		await manager.commit();
		expect(hasMarker(manager.session, marker)).toBe(true);

		await manager.commit();
		expect(hasMarker(manager.session, marker)).toBe(true);
	});

	it("nested rollback clears all pending writes", async () => {
		const marker = "tx-nested-rollback-marker";
		await manager.begin();
		await manager.begin();
		writeMarker(manager.session, marker);

		await manager.rollback();
		expect(hasMarker(manager.session, marker)).toBe(false);
	});
});
