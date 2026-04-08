export abstract class BaseUseCaseError extends Error {
	public readonly useCaseName: string;
	public readonly context: Record<string, unknown> | undefined;

	protected constructor(params: {
		message: string;
		useCaseName: string;
		context?: Record<string, unknown>;
		cause?: unknown;
	}) {
		super(params.message, { cause: params.cause });
		this.name = new.target.name;
		this.useCaseName = params.useCaseName;
		this.context = params.context;
	}
}
