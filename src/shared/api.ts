// 渲染进程和主进程之间的API声明
import { DocumentFromFile, DocumentInfo, FileDetail, SelectedDocument, Document } from "./types/document";
import { APIBase, CallbackBase } from "./types/api";
import { DatabaseSummary } from "./types/database";
import { TrackItemUI } from "./types/record";

// 把要暴露的 api 写到这里
export interface ExportedAPI extends APIBase {
	// 文件相关
	getFileDetail: (path: string) => Promise<FileDetail>;  // 获取文件的详细信息
	openFile: (path: string) => Promise<void>; // 打开文件，path 为文件的绝对路径
	// 试卷相关
	addDocument: (docs: DocumentFromFile[]) => Promise<void>;  // 添加试卷
	deleteDocument: (id: number) => Promise<void>;  // 删除试卷
	updateDocument: (id: number, info: DocumentInfo) => Promise<void>;  // 更新试卷信息
	getDocument: (id: number) => Promise<Document>;  // 获取试卷信息
	searchDocument: (keyword: string) => Promise<Document[]>;  // 搜索试卷
	isFileExist: (md5: string) => Promise<boolean>;  // 判断文件是否存在于数据库中
	fetchBack: (target: SelectedDocument[]) => Promise<string>; // 取回文件，返回取回后的文件的绝对路径
	openDocument: (target: number) => Promise<void>;  // 打开指定的文档，target 为文档的 id，相当于 openFile 的一个封装
	getDocumentByMD5: (md5: string) => Promise<Document>;  // 通过 md5 获取文档信息
	// 数据库相关
	getDatabaseStatus: () => Promise<"pending" | "ready">; // 获取数据库状态
	getDatabaseVersion: () => Promise<string>;  // 获取数据库版本
	getTrack: () => Promise<TrackItemUI[]>;  // 获取操作记录
	getRemoteVersion: () => Promise<string>;  // 获取远程版本
	pullDatabase: () => Promise<void>; // 从远程拉取数据库
	pushDatabase: () => Promise<void>; // 推送数据库到远程
	getDatabaseSummary: () => Promise<DatabaseSummary>;  // 获取数据库的摘要信息
	// 窗口相关
	popMenu: (target: Document[], inSearch: boolean) => Promise<void>;  // 弹出右键菜单，用于搜索界面
	maximizeWindow: () => Promise<void>;  // 最大化窗口
	minimizeWindow: () => Promise<void>;  // 最小化窗口
	closeWindow: () => Promise<void>;  // 关闭窗口
}

// 把要暴露的 callback 写到这里
export interface ExportedCallback extends CallbackBase {
	/**
	 * 推送和拉取时的进度
	 * @param v1 当前进度，-1为无法确定
	 * @param v2 总进度，v1为-1时忽略
	 */
	onDatabaseProgressUpdated: (v1: number, v2?: number) => void;
	/**
	 * 右键菜单的回调
	 * @param target 调用openMenu时传递的target再原封不动的传回来
	 * @param operation 操作类型
	 */
	onMenuCallback: (
		target: Document[],
		operation: "简单取回" | "删除" | "编辑",
	) => void;
	/**
	 * 取回文件的进度
	 * @param v1 当前进度，-1为无法确定
	 * @param v2 总进度，v1为-1时忽略
	 */
	onFetchBackProgressUpdated: (v1: number, v2?: number) => void;
	/**
	 * 数据库状态变化，用于界面最底下的显示
	 * @param status 数据库状态
	 */
	onDatabaseStatusChange: (status: "pending" | "ready") => void;
	/**
	 * 窗口状态变化，用于窗口右上角的最大化还是取消最大化按钮显示哪一个
	 * @param isMaximum 是否最大化
	 */
	onWindowStateChange: (isMaximum: boolean) => void;
}