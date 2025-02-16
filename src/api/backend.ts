import { ipcMain } from "electron";
import { ExportedAPI } from "./config";
import { InvokeWrapper, SendType } from "./index";
import {
	getDatabaseSummary,
	getRemoteVersion,
	openDocument,
	pullDatabase,
	pushDatabase,
} from "../config/Database";
import { Global, popMenu } from "../config/backend";
import { fetchBack, openFile } from "../utils/backend";

export const InitAPI = () => {
	const API: ExportedAPI = {
		getRemoteVersion,
		pullDatabase,
		pushDatabase,
		popMenu,
		fetchBack,
		openFile,
		openDocument,
		getDatabaseSummary,
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
				const formatObj = JSON.parse(JSON.stringify(e));
				console.log(`invoke ${func} error:`, e);
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

export const send: SendType = (target, ...args) => {
	if (!Global.window) return;
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	Global.window.webContents.send("handle-send", target, ...args);
};
