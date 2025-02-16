// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer, webUtils } from "electron";
import {
	DatabaseProgressCallback,
	DatabaseStatusChangeCallback,
	WindowChangeCallback,
} from "./types/callback";
import { DocumentFromFile, DocumentInfo } from "./types/document";
import { InvokeType } from "./api";

const invoke: InvokeType = async (target, ...args) => {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	return await ipcRenderer.invoke("invoke_handler", target, ...args);
};

contextBridge.exposeInMainWorld("api", {
	invoke: invoke,
	subscribe: (callback: (target: string, ...args: any[]) => void) => {
		ipcRenderer.on("handle-send", (_, ...args) => {
			const [target, ...params] = args;
			callback(target, ...params);
		});
	},
	maximize: () => ipcRenderer.send("maximize"),
	minimize: () => ipcRenderer.send("minimize"),
	close: () => ipcRenderer.send("close"),
	getFileDetail: (file: File) => {
		const path = webUtils.getPathForFile(file);
		return ipcRenderer.invoke("getFileDetail", path);
	},
	getDatabaseStatus: () => {
		return ipcRenderer.invoke("getDatabaseStatus");
	},
	getDatabaseVersion: () => {
		return ipcRenderer.invoke("getDatabaseVersion");
	},
	isFileExist: (md5: string) => {
		return ipcRenderer.invoke("isFileExist", md5);
	},
	addDocument: (docs: DocumentFromFile[]) => {
		return ipcRenderer.invoke("addDocument", docs);
	},
	deleteDocument: (id: number) => {
		return ipcRenderer.invoke("deleteDocument", id);
	},
	updateDocument: (id: number, info: DocumentInfo) => {
		return ipcRenderer.invoke("updateDocument", id, info);
	},
	getDocument: (id: number) => {
		return ipcRenderer.invoke("getDocument", id);
	},
	searchDocument: (keyword: string) => {
		return ipcRenderer.invoke("searchDocument", keyword);
	},
	getTrack: () => {
		return ipcRenderer.invoke("getTrack");
	},
	pushDatabase: () => {
		return ipcRenderer.invoke("pushDatabase");
	},
	pullDatabase: () => {
		return ipcRenderer.invoke("pullDatabase");
	},
	getRemoteVersion: () => {
		return ipcRenderer.invoke("getRemoteVersion");
	},
	onDatabaseStatusChange: (callback: DatabaseStatusChangeCallback) => {
		ipcRenderer.on("db-updating", () => callback("pending"));
		ipcRenderer.on("db-ready", (_, version) => callback("ready", version));
	},
	onDatabaseProgress: (callback: DatabaseProgressCallback) => {
		ipcRenderer.on("db-progress", (_, v1, v2) => callback(v1, v2));
	},
	onWindowStateChange: (callback: WindowChangeCallback) => {
		ipcRenderer.on("window-state-change", (_, isMaximized) =>
			callback(isMaximized),
		);
	},
});
