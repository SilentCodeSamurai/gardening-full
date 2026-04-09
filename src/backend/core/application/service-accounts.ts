import { IdentityRef } from "@backend/core/domain/resource-access";

const catalogPopulateServiceAccountId = "catalog-populate";

/** Built-in identity for bootstrap, default catalog population, and steward-based shared-read policy. */
export const catalogPopulateServiceAccount = IdentityRef.serviceAccount(catalogPopulateServiceAccountId);
