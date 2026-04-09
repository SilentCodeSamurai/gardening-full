import "reflect-metadata";

import { registerInMemoryRepositories } from "@backend/di/register-in-memory-repositories";
import { container } from "tsyringe";
import type { DependencyContainer } from "tsyringe";

/** Per-test TSyringe child container with a fresh in-memory store and access repo registration. */
export function createInMemoryResourceAccessTestContainer(): DependencyContainer {
  const child = container.createChildContainer();
  registerInMemoryRepositories(child);
  return child;
}
