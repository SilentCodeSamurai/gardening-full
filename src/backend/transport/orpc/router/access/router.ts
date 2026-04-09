import { AccessControlApplicationService } from "@backend/core/application/services/access-control/access-control.application-service";
import { IdentityRef, ResourceRef } from "@backend/core/domain/resource-access";
import { appContainer } from "@backend/di/app-container";

import { createUseCaseContextFromOrpc } from "../../create-use-case-context";
import { procedure } from "../../orpc-procedure";
import { AssignRoleInputSchema } from "./schemas";

export const accessRouter = {
	assignRole: procedure.input(AssignRoleInputSchema).handler(async ({ input, context }) => {
		const ctx = createUseCaseContextFromOrpc(context);
		const access = appContainer.resolve(AccessControlApplicationService);
		return access.assignRole(ctx, {
			subjectRef: IdentityRef.user(input.subjectUserId),
			resourceRef: ResourceRef.create({ type: input.resourceType, id: input.resourceId }),
			role: input.role,
		});
	}),
};
