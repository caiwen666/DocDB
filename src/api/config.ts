import { APIBase, CallbackBase } from "./index";
import { DatabaseSummary, Document, SelectedDocument } from "../types/document";

// 把要暴露的 api 写到这里
export interface ExportedAPI extends APIBase {
	getRemoteVersion: () => Promise<string>;
	pullDatabase: () => Promise<void>;
	pushDatabase: () => Promise<void>;
	popMenu: (target: Document[], inSearch: boolean) => Promise<void>;
	fetchBack: (target: SelectedDocument[]) => Promise<string>;
	openFile: (path: string) => Promise<void>;
	openDocument: (target: number) => Promise<void>;
	getDatabaseSummary: () => Promise<DatabaseSummary>;
}

// 把要暴露的 callback 写到这里
export interface ExportedCallback extends CallbackBase {
	onDatabaseProgressUpdated: (v1: number, v2?: number) => void;
	onMenuCallback: (
		target: Document[],
		operation: "简单取回" | "删除" | "编辑",
	) => void;
	onFetchBackProgressUpdated: (v1: number, v2?: number) => void;
}
