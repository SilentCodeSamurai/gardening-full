import "reflect-metadata";

import { registerIndexedDbGardeningRepositories } from "@backend/di/register-indexed-db-gardening-repositories";
import type { DependencyContainer } from "tsyringe";
import { container } from "tsyringe";

/** Per-test child container with a fresh IndexedDB database name (isolated store). */
export function createIndexedDbGardeningTestContainer(): DependencyContainer {
  const child = container.createChildContainer();
  registerIndexedDbGardeningRepositories(child, {
    databaseName: `gardening-test-${crypto.randomUUID()}`,
  });
  return child;
}
