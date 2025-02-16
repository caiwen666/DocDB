import {
	DocumentFromFile,
	DocumentInfo,
	FileDetail,
	Document,
	TrackItemUI,
} from "./document";
import { DatabaseStatusChangeCallback, WindowChangeCallback } from "./callback";

declare global {
	interface Window {
		api: {
			subscribe: any;
			invoke: any;
			maximize: () => void;
			minimize: () => void;
			close: () => void;
			getFileDetail: (file: File) => Promise<string | FileDetail>;
			getDatabaseStatus: () => Promise<"pending" | "ready">;
			getDatabaseVersion: () => Promise<string>;
			/**
			 * 获取文件是否在数据库中存在
			 * @param md5
			 * @returns 试卷id，不存在则返回 undefined
			 */
			isFileExist: (md5: string) => Promise<number | undefined>;
			/**
			 * 添加试卷到数据库
			 * @param doc 要添加的试卷
			 */
			addDocument: (docs: DocumentFromFile[]) => Promise<void>;
			/**
			 * 删除指定试卷
			 * @param id 试卷id
			 */
			deleteDocument: (id: number) => Promise<void>;
			/**
			 * 更新指定试卷
			 * @param id 试卷id
			 * @param info 新的试卷信息
			 */
			updateDocument: (id: number, info: DocumentInfo) => Promise<void>;
			/**
			 * 获取指定试卷
			 * @param id 试卷id
			 * @returns 试卷,不存在则返回 undefined
			 */
			getDocument: (id: number) => Promise<Document | undefined>;
			/**
			 * 根据关键字搜索试卷，后续的二次筛选由渲染进程完成
			 * @param keyword 关键字
			 * @returns 符合条件的试卷
			 */
			searchDocument: (keyword: string) => Promise<Document[]>;
			pushDatabase: () => Promise<boolean>;
			pullDatabase: () => Promise<void>;
			getTrack: () => Promise<TrackItemUI[]>;
			getRemoteVersion: () => Promise<string>;
			onWindowStateChange: (callback: WindowChangeCallback) => void;
			onDatabaseStatusChange: (callback: DatabaseStatusChangeCallback) => void;
		};
	}
}
export {};
