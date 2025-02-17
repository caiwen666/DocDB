// 主进程和渲染进程通信的类型定义

export type APIBase = { [key: string]: AsyncFunction };
export type CallbackBase = { [key: string]: (...args: any) => void };

// 渲染进程调用主进程的接口，返回的是 InvokeWrapper，包含调用状态和返回值，渲染进程再把 InvokeWrapper 转为 Result
export interface InvokeWrapper {
	status: 0 | 1 | 2; //0: 成功调用 1: 调用失败
	payload: any; //返回值
}
