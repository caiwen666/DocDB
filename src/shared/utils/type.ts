//一些工具作用的泛型

type AnyFunction = (...args: any) => any;  // 任意函数
type AsyncFunction = (...args: any) => Promise<any>;  // 任意的异步函数
type ExtractPromiseType<T> = T extends Promise<infer U> ? U : never;  // 提取Promise的返回值类型
