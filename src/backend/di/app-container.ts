import "reflect-metadata";

import { container } from "tsyringe";

import type { IUseCase } from "../core/application/use-cases/shared/use-case.interface";

import { registerGardeningUseCases } from "./register-gardening-use-cases";
import { registerInMemoryGardeningRepositories } from "./register-in-memory-gardening-repositories";

registerInMemoryGardeningRepositories(container);
registerGardeningUseCases(container);

export { container as appContainer };

// Ensure the module doesn't get tree-shaken when bundling.
// (We want side-effects: container registrations.)
const _useCaseKeepAlive: (new (...args: unknown[]) => IUseCase<object, object>)[] = [];
void _useCaseKeepAlive;
