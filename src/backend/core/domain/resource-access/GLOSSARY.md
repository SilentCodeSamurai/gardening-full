# Resource access glossary (canonical names)

| Name | Meaning |
|------|---------|
| `ResoursePermissionEntity` | Persisted **role assignment** for a subject on a resource (v1 is role-only). |
| `ResoursePermissionRepositoryPort` | Port for loading/saving role assignments and listing accessible resources. |
| `AccessControlApplicationService` | Application service that evaluates access from role assignments. |
| `UseCaseContext` | Per-invocation: actor + `workspaceRef`. Creates use `assertCanCreate(context, context.workspaceRef)` (or catalog root where applicable). |

Intentional spelling: **`ResoursePermission*`** (not \"Resource\").
