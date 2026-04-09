import { IdentityRef } from "@backend/core/domain/resource-access";

const testsLocalServiceAccountId = "tests-local";

/** Built-in identity for backend tests and `createTestUseCaseContext`. */
export const testsLocalServiceAccount = IdentityRef.serviceAccount(testsLocalServiceAccountId);
