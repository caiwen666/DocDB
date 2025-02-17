import Path from "path";
import { app, dialog } from "electron";
import * as fs from "node:fs";
import { Config } from "./config";
import FormData from "form-data";
import fetch from "node-fetch";
import { send } from "./api";
import {
	DatabaseSummary,
	DatabaseTrack,
	DocumentDatabase,
	DocumentIndex,
	DocumentNameIndex,
	FileIndex,
} from "../shared/types/database";
import { Document } from "../shared/types/document";
import { TrackItemUI, Record } from "../shared/types/record";
import { readFile, request } from "./utils";

// 数据库所在目录
const cwd = Path.join(process.cwd(), "data");

export interface IDatabase {
	status: "ready" | "pending";
	data: DocumentDatabase;
	track: DatabaseTrack;
	index: DocumentIndex;
	nameIndex: DocumentNameIndex;
	fileIndex: FileIndex;
	version: string;
	summary: DatabaseSummary;
}

export const Database: IDatabase = {
	status: "pending",
	data: [],
	track: [],
	index: {},
	nameIndex: {},
	fileIndex: {},
	version: "",
	summary: {
		documentCount: 0,
		courseCount: 0,
	},
};

/**
 * 等待数据库准备就绪
 */
export const wait = async () => {
	return new Promise((resolve) => {
		if (Database.status === "ready") {
			resolve(Database.status);
		}
		setInterval(() => {
			if (Database.status === "ready") {
				resolve(Database.status);
			}
		});
	});
};

/**
 * 把数据库的变动记录转换为用户界面的展示，能合并的操作会合并
 */
export const getTrack = async (): Promise<TrackItemUI[]> => {
	await wait();
	const result: TrackItemUI[] = [];
	const map: { [id: number]: number } = {};
	let index = -1;
	// 向前检索 sign
	for (let i = Database.track.length - 1; i >= 0; i--) {
		const record = Database.track[i];
		if (record.operation === 3) {
			index = i;
			break;
		}
	}
	const getLastInfo = (id: number) => {
		for (let i = index - 1; i >= 0; i--) {
			const record = Database.track[i];
			if (record.documentID !== id) continue;
			if (record.operation === 3 || record.operation === 2) continue;
			return record.info;
		}
		return null;
	};
	for (let i = index + 1; i < Database.track.length; i++) {
		const record = Database.track[i];
		const id = record.documentID;
		if (record.operation === 0) {
			if (Database.index[id] === undefined) continue; //说明后续已经删除
			result.push({
				operation: 0,
				time: record.time,
				documentID: id,
				id: record.id,
				info: Database.index[id].info, // 不一定是创建的那个文件，但后面的删除操作会废除这个
			});
			map[record.documentID] = result.length - 1;
		}
		if (record.operation === 1) {
			if (Database.index[id] === undefined) continue; //说明后续已经删除
			if (map[id] === undefined) {
				// 说明这个id是首次出现，向前追踪修改前的信息
				result.push({
					operation: 1,
					time: record.time,
					documentID: id,
					id: record.id,
					info: record.info,
					oldInfo: getLastInfo(id),
				});
				map[record.documentID] = result.length - 1;
			} else {
				result[map[id]].info = record.info;
			}
		}
		if (record.operation === 2) {
			if (map[id] === undefined) {
				const lastInfo = getLastInfo(id);
				if (lastInfo === null) continue; // 说明这个删除操作的目标是新添加的试卷，且id没有重用
				result.push({
					operation: 2,
					time: record.time,
					documentID: id,
					id: record.id,
					info: getLastInfo(id),
				});
			} else {
				// 如果这个删除操作的目标是新添加的试卷，且id发生重用，那么就把之前的操作和这个删除操作都给撤销
				// 反之，则仍保留这个删除操作
				if (result[map[id]].operation === 1) {
					result.push({
						operation: 2,
						time: record.time,
						documentID: id,
						id: record.id,
						info: getLastInfo(id),
					});
				}
				result.splice(map[id], 1); // 撤销之前所有操作
				delete map[id];
			}
		}
	}
	return result;
};

/**
 * 更新数据库，相当于重新构建数据库的索引、摘要等信息。在调用之前应先设置好 Database.data 和 Database.track
 */
export const updateDatabase = async () => {
	Database.status = "pending";
	send("onDatabaseStatusChange", "pending");
	// 排序
	Database.data.sort((a, b) => {
		if (a.info.date === undefined) return -1;
		if (b.info.date === undefined) return 1;
		return b.info.date.year - a.info.date.year;
	});
	// 清除索引
	Database.index = {};
	Database.nameIndex = {};
	Database.fileIndex = {};
	// 初始化摘要
	Database.summary.courseCount = 0;
	Database.summary.documentCount = Database.data.length;
	// 追踪版本
	const lastRecord = Database.track[Database.track.length - 1];
	if (lastRecord) {
		if (lastRecord.operation === 3) {
			Database.version = lastRecord.version;
		} else {
			Database.version = "未标记";
		}
	} else {
		Database.version = "空数据库";
	}
	// 建立索引
	for (const doc of Database.data) {
		Database.index[doc.id] = doc;
		if (Database.nameIndex[doc.info.name] === undefined) {
			Database.nameIndex[doc.info.name] = [];
			Database.summary.courseCount++;
		}
		Database.nameIndex[doc.info.name].push(doc.id);
		Database.fileIndex[doc.md5] = doc.id;
	}
	Database.status = "ready";
	send("onDatabaseStatusChange", "ready");
};

/**
 * 初始化数据库，从文件中读取数据
 */
export const initDatabase = async () => {
	try {
		Database.data = JSON.parse(
			await readFile(Path.join(cwd, "data.json"), "[]"),
		);
		Database.track = JSON.parse(
			await readFile(Path.join(cwd, "track.json"), "[]"),
		);
		await updateDatabase();
	} catch (error) {
		dialog.showMessageBoxSync({
			type: "error",
			title: "错误",
			message: "初始化数据库失败\n" + error,
			buttons: ["退出"],
		});
		app.quit();
	}
};

/**
 * 保存当前的数据库数据到文件
 */
export const saveDatabase = async () => {
	await fs.promises.writeFile(
		Path.join(cwd, "data.json"),
		JSON.stringify(Database.data),
		"utf-8",
	);
	await fs.promises.writeFile(
		Path.join(cwd, "track.json"),
		JSON.stringify(Database.track),
		"utf-8",
	);
};

/**
 * 数据库中是否存在了某个文件
 * @param md5
 */
export const isFileExist = async (md5: string) => {
	await wait();
	return Database.fileIndex[md5] !== undefined;
};

/**
 * 将本地数据库推送到远程
 */
export const pullDatabase = async () => {
	send("onDatabaseProgressUpdated", -1);
	await wait();
	const dataRes = await request("data", "GET");
	const data: Document[] = (await dataRes.json()) as Document[];
	const trackRes = await request("track", "GET");
	const track: Record[] = (await trackRes.json()) as Record[];
	send("onDatabaseProgressUpdated", 0, data.length);
	// 清点文件
	let ok = 0;
	for (const doc of data) {
		const target = Path.join(cwd, "files", doc.md5 + ".pdf");
		if (!fs.existsSync(target)) {
			const fileRes = await request("getFile?target=" + doc.md5, "GET");
			await fs.promises.writeFile(target, await fileRes.buffer());
		}
		ok++;
		send("onDatabaseProgressUpdated", ok, data.length);
	}
	Database.data = data;
	Database.track = track;
	await saveDatabase();
	await updateDatabase();
};

/**
 * 从远程拉取数据库
 */
export const pushDatabase = async () => {
	await wait();
	send("onDatabaseProgressUpdated", -1);
	const pushData: Document[] = [];
	const pushTrack: Record[] = [];
	const pushFile: string[] = [];
	let index = -1;
	for (let i = Database.track.length - 1; i >= 0; i--) {
		const record = Database.track[i];
		if (record.operation === 3) {
			index = i;
			break;
		}
	}
	for (let i = index + 1; i < Database.track.length; i++) {
		const record = Database.track[i];
		if (Database.index[record.documentID] !== undefined) {
			pushData.push(Database.index[record.documentID]);
		}
		if (record.operation === 0) {
			pushFile.push(Database.index[record.documentID].md5);
		}
		pushTrack.push(record);
	}
	send("onDatabaseProgressUpdated", 0, pushFile.length);
	const remote = Config.settings.database.remote;
	const token = Config.settings.database.token;
	let ok = 0;
	for (const md5 of pushFile) {
		const form = new FormData();
		const fileStream = fs.createReadStream(
			Path.join(cwd, "files", md5 + ".pdf"),
		);
		form.append("file", fileStream, md5 + ".pdf");
		await fetch(remote + "pushFile", {
			method: "POST",
			body: form,
			headers: {
				...form.getHeaders(),
				Authorization: token,
			},
		});
		ok++;
		send("onDatabaseProgressUpdated", ok, pushFile.length);
	}
	send("onDatabaseProgressUpdated", -1);
	const res = await fetch(remote + "push", {
		method: "POST",
		body: JSON.stringify({ data: pushData, track: pushTrack }),
		headers: {
			"Content-Type": "application/json",
			Authorization: token,
		},
	});
	if (res.status !== 200)
		throw `Push failed: ${await res.text()}\nHttp code: ${res.status}`;
};

/**
 * 获取远程数据库版本
 */
export const getRemoteVersion = async (): Promise<string> => {
	const res = await fetch(Config.settings.database.remote + "version", {
		headers: {
			Authorization: Config.settings.database.token,
		},
	});
	return await res.text();
};

/**
 * 获取数据库摘要
 */
export const getDatabaseSummary = async (): Promise<DatabaseSummary> => {
	await wait();
	return Database.summary;
};

/**
 * 获取数据库状态
 */
export const getDatabaseStatus = async () => {
	return Database.status;
};

/**
 * 获取数据库版本
 */
export const getDatabaseVersion = async () => {
	await wait();
	return Database.version;
};