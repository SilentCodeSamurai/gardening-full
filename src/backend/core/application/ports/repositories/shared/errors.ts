export abstract class BaseRepositoryError extends Error {
	public readonly context: Record<string, unknown> | undefined;

	protected constructor(params: {
		message: string;
		context?: Record<string, unknown>;
		cause?: unknown;
	}) {
		super(params.message, { cause: params.cause });
		this.name = new.target.name;
		this.context = params.context;
	}
}
