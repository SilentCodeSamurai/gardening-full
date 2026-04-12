import "reflect-metadata";

import type { DependencyContainer } from "tsyringe";
import { container } from "tsyringe";

import { registerInMemoryRepositories } from "@backend/di/register-in-memory-repositories";

/** Per-test TSyringe child container with fresh in-memory stores (v1 and v2). */
export function createInMemoryAccessTestContainer(): DependencyContainer {
	const child = container.createChildContainer();
	registerInMemoryRepositories(child);
	return child;
}
