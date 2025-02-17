import { contextBridge, ipcRenderer, webUtils } from "electron";

const invoke = async (target: string, ...args: any[]) => {
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
	getFilePath: (file: File) => {
		return webUtils.getPathForFile(file);
	},
});
