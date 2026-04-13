import { ApplicationError } from "@backend/core/application/shared/errors";
import { ORPCError } from "@orpc/server";

export function transformApplicationErrorToOrpc(error: unknown): never {
	if (!(error instanceof ApplicationError)) {
		throw error;
	}
	const code =
		error.code === "ACCESS_DENIED"
			? "FORBIDDEN"
			: error.code === "NOT_FOUND"
				? "NOT_FOUND"
				: error.code === "CONFLICT"
					? "CONFLICT"
					: error.code === "VALIDATION"
						? "UNPROCESSABLE_CONTENT"
						: error.code === "UNAUTHORIZED"
							? "UNAUTHORIZED"
							: error.code === "INTERNAL"
								? "INTERNAL_SERVER_ERROR"
								: "BAD_REQUEST";
	throw new ORPCError(code, {
		defined: true,
		message: error.message,
		data: {
			applicationCode: error.code,
			source: error.source,
			data: error.data,
		},
		cause: error,
	});
}
