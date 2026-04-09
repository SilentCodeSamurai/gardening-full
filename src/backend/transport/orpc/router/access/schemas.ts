import * as z from "zod";

export const AssignRoleInputSchema = z.object({
	subjectUserId: z.string().min(1),
	resourceType: z.string().min(1),
	resourceId: z.string().min(1),
	role: z.enum(["viewer", "editor", "admin"]),
});
