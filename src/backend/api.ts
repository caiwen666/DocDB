import { ipcMain } from "electron";
import { InvokeWrapper } from "../shared/types/api";
import {
	checkDatabaseLatest,
	getDatabaseSummary,
	pullDatabase, saveDatabase, updateDatabase,
} from "./database";
import { ExportedAPI, ExportedCallback } from "../shared/api";
import { closeWindow, maximizeWindow, minimizeWindow, popMenu } from "./window";
import {
	addDocument,
	deleteDocument,
	fetchBack,
	getDocument, getDocumentByMD5,
	openDocument,
	searchDocument,
	updateDocument,
} from "./document";
import { getFileDetail, openFile } from "./utils";
import { Config } from "./config";

/**
 * 初始化API
 */
export const initAPI = () => {
	// 如果把这个定义放到外面，会导致出现 undefined 的情况
	const API: ExportedAPI = {
		pullDatabase,
		popMenu,
		fetchBack,
		openFile,
		openDocument,
		getDatabaseSummary,
		maximizeWindow,
		minimizeWindow,
		getFileDetail,
		addDocument,
		deleteDocument,
		updateDocument,
		getDocument,
		searchDocument,
		getDocumentByMD5,
		closeWindow,
		updateDatabase,
		saveDatabase,
		checkDatabaseLatest
	};
	ipcMain.handle("invoke_handler", async (_, ...args) => {
		const [func, ...params] = args;
		if (API[func]) {
			try {
				const startTime = new Date().getTime();
				const result = await API[func](...params);
				const resultWrapper: InvokeWrapper = { status: 0, payload: result };
				const endTime = new Date().getTime();
				console.log(`invoke ${func} success, time: ${endTime - startTime}ms`);
				return resultWrapper;
			} catch (e) {
				console.log(`invoke ${func} error:`, e);
				// 传给前端时需要把错误对象转成普通对象，否则会报错
				const formatObj = JSON.parse(JSON.stringify(e));
				const result: InvokeWrapper = { status: 1, payload: formatObj };
				return result;
			}
		} else {
			console.log("API not found: ", func);
			const result: InvokeWrapper = { status: 1, payload: "API not found" };
			return result;
		}
	});
};

export type SendFunction = <T extends keyof ExportedCallback>(
	target: T,
	...args: Parameters<ExportedCallback[T]>
) => void;
/**
 * 发送消息给渲染进程
 * @param target 事件，需要存在于 ExportedCallback 中
 * @param args 参数
 */
export const send: SendFunction = (target, ...args) => {
	if (!Config.window) return;
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	Config.window.webContents.send("handle-send", target, ...args);
};
