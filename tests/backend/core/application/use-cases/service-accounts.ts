import { SubjectVO } from "@backend/core/domain/access/subject.vo";

const testsLocalServiceAccountId = "tests-local";

/** Built-in subject for backend tests and `createTestUseCaseContext`. */
export const testsLocalServiceAccount = SubjectVO.serviceAccount(testsLocalServiceAccountId);
