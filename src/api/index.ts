import { Result } from "./result";
import { ExportedAPI, ExportedCallback } from "./config";

type AsyncFunction = (...args: any) => Promise<any>;
type ExtractPromiseType<T> = T extends Promise<infer U> ? U : never;
export type APIBase = { [key: string]: AsyncFunction };
export type InvokeType = <T extends keyof ExportedAPI>(
	target: T,
	...args: Parameters<ExportedAPI[T]>
) => Promise<Result<ExtractPromiseType<ReturnType<ExportedAPI[T]>>>>;

export interface InvokeWrapper {
	status: 0 | 1 | 2; //0: 成功调用 1: 调用失败
	payload: any; //返回值
}

export type CallbackBase = { [key: string]: (...args: any) => void };
export type SendType = <T extends keyof ExportedCallback>(
	target: T,
	...args: Parameters<ExportedCallback[T]>
) => void;
export type SubscribeType = <T extends keyof ExportedCallback>(
	target: T,
	callback: ExportedCallback[T],
) => number;
export type UnsubscribeType = <T extends keyof ExportedCallback>(
	target: T,
	index: number,
) => void;
