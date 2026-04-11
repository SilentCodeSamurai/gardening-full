export type ApplicationErrorCode =
	| "BAD_REQUEST"
	| "UNAUTHORIZED"
	| "ACCESS_DENIED"
	| "NOT_FOUND"
	| "CONFLICT"
	| "VALIDATION"
	| "INTERNAL";

export type ApplicationErrorData = Record<string, unknown>;

export class ApplicationError extends Error {
	private readonly _code: ApplicationErrorCode;
	public readonly source: string;
	public readonly data: ApplicationErrorData | undefined;

	public get code(): ApplicationErrorCode {
		return this._code;
	}

	constructor(params: {
		code: ApplicationErrorCode;
		message: string;
		source: string;
		data?: ApplicationErrorData;
		cause?: unknown;
	}) {
		super(params.message, { cause: params.cause });
		this.name = new.target.name;
		this._code = params.code;
		this.source = params.source;
		this.data = params.data;
	}
}
