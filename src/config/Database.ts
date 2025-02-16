import {
	DatabaseTrack,
	DocumentDatabase,
	DocumentFromFile,
	DocumentIndex,
	DocumentNameIndex,
	FileIndex,
	Document,
	AddRecord,
	DeleteRecord,
	DocumentInfo,
	ModifyRecord,
	TrackItemUI,
	Record,
	DatabaseSummary,
} from "../types/document";
import Path from "path";
import { Global } from "./backend";
import { openFile, readFile, writeFile } from "../utils/backend";
import { app, dialog } from "electron";
import * as fs from "node:fs";
import { v4 as uuidv4 } from "uuid";
import { Settings } from "./settings";
import FormData from "form-data";
import fetch from "node-fetch";
import { send } from "../api/backend";
import path from "path";
import { ExportedAPI } from "../api/config";

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

const wait = async () => {
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

const cwd = Path.join(process.cwd(), "data");

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

export const updateDatabase = async () => {
	Database.status = "pending";
	if (Global.window) Global.window.webContents.send("db-updating");
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
	if (Global.window)
		Global.window.webContents.send("db-ready", Database.version);
};

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

export const isFileExist = async (md5: string) => {
	await wait();
	return Database.fileIndex[md5];
};

export const addDocument = async (docs: DocumentFromFile[]) => {
	await wait();
	fs.mkdirSync(Path.join(cwd, "files"), { recursive: true });
	// 获取文档的起始id
	let startID = 0;
	for (const doc of Database.data) {
		if (doc.id > startID) {
			startID = doc.id;
		}
	}
	startID += 1;
	for (const item of docs) {
		const { path, file, ...doc } = item;
		const target = Path.join(cwd, "files", doc.md5 + ".pdf");
		await fs.promises.copyFile(path, target);
		doc.id = startID;
		Database.data.push(doc);
		const record: AddRecord = {
			id: uuidv4(),
			time: new Date(),
			documentID: startID,
			operation: 0,
			info: doc.info,
			file: doc.md5,
		};
		Database.track.push(record);
		startID += 1;
	}
	await saveDatabase();
	await updateDatabase();
};

export const deleteDocument = async (id: number) => {
	await wait();
	const index = Database.data.findIndex((doc) => doc.id === id);
	if (index === -1) {
		return;
	}
	const doc = Database.data[index];
	Database.data.splice(index, 1);
	const record: DeleteRecord = {
		id: uuidv4(),
		time: new Date(),
		documentID: id,
		operation: 2,
	};
	Database.track.push(record);
	await saveDatabase();
	await updateDatabase();
};

export const updateDocument = async (id: number, info: DocumentInfo) => {
	await wait();
	const index = Database.data.findIndex((doc) => doc.id === id);
	if (index === -1) {
		return;
	}
	Database.data[index].info = info;
	const record: ModifyRecord = {
		id: uuidv4(),
		time: new Date(),
		documentID: id,
		operation: 1,
		info,
	};
	Database.track.push(record);
	await saveDatabase();
	await updateDatabase();
};

export const getDocument = async (id: number) => {
	await wait();
	return Database.index[id];
};

export const searchDocument = async (keyword: string) => {
	await wait();
	const pattern = keyword.split("").join(".*");
	const regex = new RegExp(pattern, "i");
	const result: Document[] = [];
	for (const name in Database.nameIndex) {
		if (regex.test(name)) {
			for (const id of Database.nameIndex[name]) {
				result.push(Database.index[id]);
			}
		}
	}
	return result;
};

export const pullDatabase = async () => {
	send("onDatabaseProgressUpdated", -1);
	await wait();
	const dataRes = await fetch(Settings.database.remote + "data", {
		headers: {
			Authorization: Settings.database.token,
		},
	});
	const data: Document[] = (await dataRes.json()) as Document[];
	const trackRes = await fetch(Settings.database.remote + "track", {
		headers: {
			Authorization: Settings.database.token,
		},
	});
	const track: Record[] = (await trackRes.json()) as Record[];
	send("onDatabaseProgressUpdated", 0, data.length);
	// 清点文件
	let ok = 0;
	for (const doc of data) {
		const target = Path.join(cwd, "files", doc.md5 + ".pdf");
		if (!fs.existsSync(target)) {
			const fileRes = await fetch(
				Settings.database.remote + "getFile?target=" + doc.md5,
				{
					headers: {
						Authorization: Settings.database.token,
					},
				},
			);
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
	let ok = 0;
	for (const md5 of pushFile) {
		const form = new FormData();
		const fileStream = fs.createReadStream(
			Path.join(cwd, "files", md5 + ".pdf"),
		);
		form.append("file", fileStream, md5 + ".pdf");
		await fetch(Settings.database.remote + "pushFile", {
			method: "POST",
			body: form,
			headers: {
				...form.getHeaders(),
				Authorization: Settings.database.token,
			},
		});
		ok++;
		send("onDatabaseProgressUpdated", ok, pushFile.length);
	}
	send("onDatabaseProgressUpdated", -1);
	const res = await fetch(Settings.database.remote + "push", {
		method: "POST",
		body: JSON.stringify({ data: pushData, track: pushTrack }),
		headers: {
			"Content-Type": "application/json",
			Authorization: Settings.database.token,
		},
	});
	if (res.status !== 200)
		throw `Push failed: ${await res.text()}\nHttp code: ${res.status}`;
};

export const getRemoteVersion = async (): Promise<string> => {
	const res = await fetch(Settings.database.remote + "version", {
		headers: {
			Authorization: Settings.database.token,
		},
	});
	return await res.text();
};

export const openDocument = async (id: number) => {
	await wait();
	await openFile(path.join(cwd, "files", Database.index[id].md5 + ".pdf"));
};

export const getDatabaseSummary = async (): Promise<DatabaseSummary> => {
	await wait();
	return Database.summary;
};
