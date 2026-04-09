import "reflect-metadata";

import type { DependencyContainer } from "tsyringe";
import { container } from "tsyringe";

import { registerInMemoryRepositories } from "@backend/di/register-in-memory-repositories";

/** Per-test TSyringe child container with a fresh in-memory gardening store. */
export function createInMemoryGardeningTestContainer(): DependencyContainer {
  const child = container.createChildContainer();
  registerInMemoryRepositories(child);
  return child;
}
