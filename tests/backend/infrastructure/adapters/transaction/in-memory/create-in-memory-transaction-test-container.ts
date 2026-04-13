import "reflect-metadata";

import type { DependencyContainer } from "tsyringe";
import { container } from "tsyringe";

import { registerAdapters } from "@backend/di/register-adapters";
import { registerInMemoryRepositories } from "@backend/di/register-in-memory-repositories";

export function createInMemoryTransactionTestContainer(): DependencyContainer {
	const child = container.createChildContainer();
	registerInMemoryRepositories(child);
	registerAdapters(child);
	return child;
}
