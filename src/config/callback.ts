import { SubscribeType, UnsubscribeType } from "../api";

type AnyFunction = (...args: any) => any;
const subscribeMap: { [target: string]: AnyFunction[] } = {};

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

export const InitCallback = () => {
	window.api.subscribe(handler);
};

export const subscribe: SubscribeType = (target, callback) => {
	if (!subscribeMap[target]) subscribeMap[target] = [];
	subscribeMap[target].push(callback);
	return subscribeMap[target].length - 1;
};

export const unsubscribe: UnsubscribeType = (target, index) => {
	if (!subscribeMap[target]) return;
	subscribeMap[target].splice(index, 1);
};
