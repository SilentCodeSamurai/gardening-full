import "reflect-metadata";

import { container } from "tsyringe";

import type { IUseCase } from "../core/application/use-cases/shared/use-case.interface";

import { registerAdapters } from "./register-adapters";
import { registerApplicationServices } from "./register-application-services";
import { registerInMemoryRepositories } from "./register-in-memory-repositories";
import { registerUseCases } from "./register-use-cases";

registerInMemoryRepositories(container);
registerAdapters(container);
registerApplicationServices(container);
registerUseCases(container);

export { container as appContainer };

// Ensure the module doesn't get tree-shaken when bundling.
// (We want side-effects: container registrations.)
const _useCaseKeepAlive: (new (...args: unknown[]) => IUseCase<object, object>)[] = [];
void _useCaseKeepAlive;
