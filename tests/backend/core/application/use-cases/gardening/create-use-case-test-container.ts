import "reflect-metadata";

import type { DependencyContainer } from "tsyringe";
import { container } from "tsyringe";

import { registerAdapters } from "@backend/di/register-adapters";
import { registerApplicationServices } from "@backend/di/register-application-services";
import { registerInMemoryRepositories } from "@backend/di/register-in-memory-repositories";
import { registerUseCases } from "@backend/di/register-use-cases";

import { seedTestsLocalAccessPermissions } from "../../../../helpers/access-control/seed-tests-local-permissions";

/** Per-test TSyringe child container: in-memory repos + gardening use-cases (same wiring as the app). */
export function createUseCaseTestContainer(): DependencyContainer {
  const child = container.createChildContainer();
  registerInMemoryRepositories(child);
  registerAdapters(child);
  seedTestsLocalAccessPermissions(child);
  registerApplicationServices(child);
  registerUseCases(child);
  return child;
}
