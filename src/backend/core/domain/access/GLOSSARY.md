# Access control glossary (canonical names)

| Name | Meaning |
|------|---------|
| `WorkspaceKey` | Key identifier for a workspace. Format: `version:type:externalId` |
| `WorkspaceVO` | Value object that represents a workspace. |
| `WorkspaceType` | Type of the workspace. |
| `SubjectKey` | Key identifier for a subject. Format: `version:type:externalId` |
| `SubjectVO` | Value object that represents a subject. |
| `SubjectType` | Type of the subject. |
| `WorkspaceRoleAssignmentEntity` | Persisted role assignment for a subject on a workspace scope. |
| `WorkspaceRoleAssignmentRepositoryPort` | Port for loading/saving workspace-scoped role assignments. |
| `AccessControlApplicationService` | Application service that evaluates access from workspace role assignments. |
| `UseCaseContext` | Per-invocation: actor: `subjectEntity`.
