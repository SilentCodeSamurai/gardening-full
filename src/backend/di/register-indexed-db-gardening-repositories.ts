import type { DependencyContainer } from "tsyringe";

import { registerInMemoryRepositories } from "./register-in-memory-repositories";

export type RegisterIndexedDbGardeningRepositoriesOptions = {
  readonly databaseName?: string;
};

/**
 * Compatibility shim for legacy indexed-db tests.
 * The indexed-db adapter is currently not wired in DI, so tests reuse in-memory registrations.
 */
export function registerIndexedDbGardeningRepositories(
  c: DependencyContainer,
  _options?: RegisterIndexedDbGardeningRepositoriesOptions,
): void {
  registerInMemoryRepositories(c);
}

