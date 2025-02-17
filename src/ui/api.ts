import { ExportedAPI, ExportedCallback } from "../shared/api";
import { Err, Ok, Result } from "../shared/utils/result";

const subscribeMap: { [target: string]: AnyFunction[] } = {};  // 订阅的回调函数集合

// 统一处理事件的函数
const handler = (target: string, ...args: any) => {
	if (!subscribeMap[target]) return;
	console.log("broadcast", target, args);
	for (const callback of subscribeMap[target]) {
		try {
			callback(...args);
		} catch (error) {
			console.log(`callback ${target} error:`, error);
		}
	}
};

// 初始化订阅
export const initCallback = () => {
	window.api.subscribe(handler);
};

// 函数的类型定义太长了，提出来写
type SubscribeFunction = <T extends keyof ExportedCallback>(
	target: T,
	callback: ExportedCallback[T],
) => number;
type UnsubscribeType = <T extends keyof ExportedCallback>(
	target: T,
	index: number,
) => void;
type InvokeFunction = <T extends keyof ExportedAPI>(
	target: T,
	...args: Parameters<ExportedAPI[T]>
) => Promise<Result<ExtractPromiseType<ReturnType<ExportedAPI[T]>>>>;

/**
 * 订阅来自主进程的事件
 * @param target 事件名称，名称需要已经存在于 ExportedCallback 中
 * @param callback 回调函数
 * @returns 回调函数在 subscribeMap 中的索引，用于后续取消订阅
 */
export const subscribe: SubscribeFunction = (target, callback) => {
	if (!subscribeMap[target]) subscribeMap[target] = [];
	subscribeMap[target].push(callback);
	return subscribeMap[target].length - 1;
};

/**
 * 取消订阅来自主进程的事件
 * @param target 事件名称，名称需要已经存在于 ExportedCallback 中
 * @param index 回调函数在 subscribeMap 中的索引，由 subscribe 返回
 */
export const unsubscribe: UnsubscribeType = (target, index) => {
	if (!subscribeMap[target]) return;
	subscribeMap[target].splice(index, 1);
};

/**
 * 调用主进程提供的接口
 * @param target 要调用的接口名称，名称需要已经存在于 ExportedAPI 中
 * @param args 提供的参数
 */
export const invoke: InvokeFunction = async (target, ...args) => {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	const result: InvokeWrapper = await window.api.invoke(target, ...args);
	if (result.status === 0) return Ok(result.payload);
	else return Err(result.payload);
};