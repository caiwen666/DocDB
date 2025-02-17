export class Result<T> {
	private readonly _value: T | null;
	private readonly _error: unknown | null;
	private readonly _isError: boolean;

	public constructor(isError: boolean, value: T | unknown) {
		this._isError = isError;
		if (isError) this._error = value;
		else this._value = value as T;
	}

	public unwrap(): T {
		if (this._isError) throw this._error;
		return this._value as T;
	}

	public unwrap_or(defaultValue: T): T {
		return this._isError ? defaultValue : (this._value as T);
	}

	public unwrap_or_else(fn: (err: unknown) => T): T {
		return this._isError ? fn(this._error) : (this._value as T);
	}

	public isOk(): boolean {
		return !this._isError;
	}

	public getError(): unknown {
		return this._error;
	}
}

export function Ok<T>(value: T): Result<T> {
	return new Result(false, value);
}

export function Err<T>(error: unknown): Result<T> {
	return new Result(true, error);
}
