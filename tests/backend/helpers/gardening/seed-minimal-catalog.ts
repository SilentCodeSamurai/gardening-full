import type { CultivarRepositoryPort } from "@backend/core/application/ports/repositories/gardening/cultivar.repositort.port";
import type { ResoursePermissionRepositoryPort } from "@backend/core/application/ports/repositories/resource-access/resourse-permission.repository.port";
import { gardeningCultivarRef, gardeningSpeciesCategoryRef, gardeningSpeciesRef } from "#/backend/core/application/resource-refs";
import type { SpeciesCategoryRepositoryPort } from "@backend/core/application/ports/repositories/gardening/species-category.repository.port";
import type { SpeciesRepositoryPort } from "@backend/core/application/ports/repositories/gardening/species.repository.port";
import { TOKENS } from "@backend/di/tokens";
import type { DependencyContainer } from "tsyringe";

import { testsLocalServiceAccount } from "../../core/application/use-cases/service-accounts";

import { fixtureCultivarCharacteristics, fixtureSpeciesCharacteristics } from "./test-fixtures";

/** Minimal catalog: category → species → cultivar (via repository ports only). */
export async function seedMinimalCatalog(c: DependencyContainer) {
  const speciesCategoryRepository = c.resolve<SpeciesCategoryRepositoryPort>(
    TOKENS.SpeciesCategoryRepositoryPort,
  );
  const speciesRepository = c.resolve<SpeciesRepositoryPort>(TOKENS.SpeciesRepositoryPort);
  const cultivarRepository = c.resolve<CultivarRepositoryPort>(TOKENS.CultivarRepositoryPort);
  const permissionRepository = c.resolve<ResoursePermissionRepositoryPort>(
    TOKENS.ResoursePermissionRepositoryPort,
  );

  const category = await speciesCategoryRepository.create({ title: "Test category" });
  const species = await speciesRepository.create({
    categoryId: category.id,
    characteristics: fixtureSpeciesCharacteristics(),
  });
  const cultivar = await cultivarRepository.create({
    speciesId: species.id,
    characteristics: fixtureCultivarCharacteristics(),
  });

  await permissionRepository.upsertRoleAssignment({
    subjectRef: testsLocalServiceAccount,
    resourceRef: gardeningSpeciesCategoryRef(String(category.id)),
    role: "admin",
    grantSource: "seed-minimal-catalog",
  });
  await permissionRepository.upsertRoleAssignment({
    subjectRef: testsLocalServiceAccount,
    resourceRef: gardeningSpeciesRef(String(species.id)),
    role: "admin",
    grantSource: "seed-minimal-catalog",
  });
  await permissionRepository.upsertRoleAssignment({
    subjectRef: testsLocalServiceAccount,
    resourceRef: gardeningCultivarRef(String(cultivar.id)),
    role: "admin",
    grantSource: "seed-minimal-catalog",
  });

  return { category, species, cultivar };
}
