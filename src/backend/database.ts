import Path from "path";
import { app, dialog } from "electron";
import * as fs from "node:fs";
import { send } from "./api";
import {
	DatabaseSummary,
	DocumentDatabase,
	DocumentIndex,
	DocumentNameIndex,
} from "../shared/types/database";
import { Record } from "../shared/types/record";
import { APIResponse, readFile, request } from "./utils";
// 数据库所在目录
const cwd = Path.join(process.cwd(), "data");

export interface IDatabase {
	status: "ready" | "pending";
	data: DocumentDatabase;
	record: Record[];
	index: DocumentIndex;
	nameIndex: DocumentNameIndex;
	summary: DatabaseSummary;
	latest: number; // 最新操作
}

export const Database: IDatabase = {
	status: "pending",
	data: {},
	record: [],
	index: {},
	nameIndex: {},
	latest: 0,
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
		}, 100);
	});
};

/**
 * 更新数据库，相当于重新构建数据库的索引、摘要等信息。在调用之前应先设置好 Database.data 和 Database.track
 */
export const updateDatabase = async () => {
	// TODO: 未来可能会做到基于操作类型，直接在原有基础上快速更新索引？
	Database.status = "pending";
	send("onDatabaseStatusChange", "pending", -1, -1);
	// 清除索引
	Database.index = {};
	Database.nameIndex = {};
	// 初始化摘要
	Database.summary.courseCount = 0;
	Database.summary.documentCount = 0;
	// 建立索引
	for (const md5 of Object.keys(Database.data)) {
		const doc = Database.data[md5];
		Database.summary.documentCount++;
		Database.index[doc.id] = doc;
		if (Database.nameIndex[doc.info.name] === undefined) {
			Database.nameIndex[doc.info.name] = [];
			Database.summary.courseCount++;
		}
		Database.nameIndex[doc.info.name].push(doc.id);
	}
	Database.status = "ready";
	send(
		"onDatabaseStatusChange",
		"ready",
		Database.record.length - 1,
		Database.latest,
	);
};

/**
 * 检查数据库是否为最新版本
 */
export const checkDatabaseLatest = async () => {
	await wait();
	const res = await request("latest", "GET");
	const data = (await res.json()) as APIResponse;
	if (data.status === "ok") {
		Database.latest = data.data as number;
		send(
			"onDatabaseStatusChange",
			Database.status,
			Database.record.length - 1,
			Database.latest,
		);
	} else throw new Error(data.msg);
};

/**
 * 初始化数据库，从文件中读取数据
 */
export const initDatabase = async () => {
	try {
		Database.data = JSON.parse(
			await readFile(Path.join(cwd, "data.json"), "{}"),
		);
		Database.record = JSON.parse(
			await readFile(Path.join(cwd, "record.json"), "[]"),
		);
		await updateDatabase();
		// 定期检查是否为最新版本
		const checkUpdate = async () => {
			try {
				await checkDatabaseLatest();
			} catch (e) {
				console.error("Check database updated failed.", e);
			}
		};
		checkUpdate();
		setInterval(checkUpdate, 30 * 1000);
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
	console.log("saveDatabase");
	await fs.promises.writeFile(
		Path.join(cwd, "data.json"),
		JSON.stringify(Database.data),
		"utf-8",
	);
	await fs.promises.writeFile(
		Path.join(cwd, "record.json"),
		JSON.stringify(Database.record),
		"utf-8",
	);
};

/**
 * 更新本地数据库
 */
export const pullDatabase = async () => {
	send("onPullProgressUpdated", -1);
	await wait();
	// 创建相关文件夹
	if (!fs.existsSync(Path.join(cwd, "files"))) {
		await fs.promises.mkdir(Path.join(cwd, "files"), { recursive: true });
	}
	const res = await request(
		"pull?target=" + (Database.record.length - 1),
		"GET",
	);
	const data = (await res.json()) as APIResponse;
	const records = data.data as Record[];
	if (data.status === "failed") {
		throw new Error(data.msg as string);
	}
	send("onPullProgressUpdated", 0, records.length);
	// 大力模拟操作就可以了
	let ok = 0;
	for (const record of records) {
		if (record.operation === "create") {
			// 看下文件是否存在
			if (!fs.existsSync(Path.join(cwd, "files", record.file + ".pdf"))) {
				const res = await request("getFile?md5=" + record.file, "GET");
				await fs.promises.writeFile(
					Path.join(cwd, "files", record.file + ".pdf"),
					await res.buffer(),
				);
			}
			Database.data[record.file] = {
				id: record.documentID,
				md5: record.file,
				info: record.info,
			};
		}
		if (record.operation === "modify") {
			Database.data[record.file].info = record.info;
		}
		if (record.operation === "delete") {
			delete Database.data[record.file];
		}
		Database.record.push(record);
		ok++;
		send("onPullProgressUpdated", ok, records.length);
	}
	await saveDatabase();
	await updateDatabase();
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
 * 获取远程数据库最新的操作记录id
 */
export const getDatabaseLatest = async () => {
	return Database.latest;
};
