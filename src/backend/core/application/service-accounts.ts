import { SubjectVO } from "@backend/core/domain/access/subject.vo";

const bootstrapPopulateServiceAccountId = "bootstrap-populate";

/** Built-in subject for bootstrap - default data population */
export const bootstrapPopulateServiceAccount = SubjectVO.serviceAccount(bootstrapPopulateServiceAccountId);
