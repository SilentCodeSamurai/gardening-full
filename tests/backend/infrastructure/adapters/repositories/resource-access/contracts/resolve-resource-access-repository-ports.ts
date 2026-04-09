import type { ResoursePermissionRepositoryPort } from "@backend/core/application/ports/repositories/resource-access/resourse-permission.repository.port";
import { TOKENS } from "@backend/di/tokens";
import type { DependencyContainer } from "tsyringe";

export type ResourceAccessRepositoryPorts = {
  resoursePermission: ResoursePermissionRepositoryPort;
};

/** Resolves resource-access repository ports from a container that has them registered. */
export function resolveResourceAccessRepositoryPorts(
  c: DependencyContainer,
): ResourceAccessRepositoryPorts {
  return {
    resoursePermission: c.resolve<ResoursePermissionRepositoryPort>(
      TOKENS.ResoursePermissionRepositoryPort,
    ),
  };
}
