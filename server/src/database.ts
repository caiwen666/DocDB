import {
	AddRecord,
	Document,
	ModifyRecord,
	Record,
	DocumentInfo,
} from "./type";
import * as fs from "node:fs";
import path from "node:path";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";

const divStr = "-------------------------------";

// 提交的track为增量
// 只需要把track中提到的试卷id提交到data即可
export const merge = (track: Record[], data: Document[]) => {
	const localTrack: Record[] = JSON.parse(
		fs.readFileSync(path.join(process.cwd(), "data", "track.json"), "utf-8"),
	);
	const localData: Document[] = JSON.parse(
		fs.readFileSync(path.join(process.cwd(), "data", "data.json"), "utf-8"),
	);
	// 建立索引
	type FileIndex = { [md5: string]: number };
	const fileIndex: FileIndex = {}; // 文件md5到localData的下标
	type DocumentIndex = { [id: number]: Document };
	const documentIndex: DocumentIndex = {};
	for (let i = 0; i < localData.length; i++) {
		const doc = localData[i];
		fileIndex[doc.md5] = i;
		documentIndex[doc.id] = doc;
	}
	const pushIndex: DocumentIndex = {};
	for (const doc of data) {
		pushIndex[doc.id] = doc;
	}
	// docdb 同步时是先把本地操作提交到服务器，然后从服务器拉取全量信息
	// 先合并操作
	const mergedTrack: Record[] = [];
	type MergeMap = { [id: number]: number }; // 试卷id到track的id
	const mergeMap: MergeMap = {};
	for (let i = 0; i < track.length; i++) {
		const record = track[i];
		if (record.operation === 0) {
			mergedTrack.push(record);
			mergeMap[record.documentID] = mergedTrack.length - 1;
		} else {
			const id = record.documentID;
			if (record.operation === 1) {
				if (mergeMap[id] !== undefined) {
					// 说明之前有添加或者修改的操作，合并
					(mergedTrack[mergeMap[id]] as ModifyRecord | AddRecord).info =
						record.info;
				} else {
					mergedTrack.push(record);
					mergeMap[id] = mergedTrack.length - 1;
				}
			}
			if (record.operation === 2) {
				if (mergeMap[id] !== undefined) {
					// 说明之前有添加或者修改的操作，撤销。并不去将这个删除操作作用于服务端
					const index = mergeMap[id];
					mergedTrack.splice(index, 1);
					delete mergeMap[id];
				} else {
					mergedTrack.push(record);
					// 这里并不去建立索引，因为删除操作指向的id可能会被复用
				}
			}
		}
	}
	// 合并数据
	let logStr = "已经合并：\n" + divStr + "\n";
	for (const record of mergedTrack) {
		if (record.operation === 0) {
			const md5 = record.file; // 文件md5
			if (fileIndex[md5] !== undefined) {
				// 已经有这个文件了，添加转修改
				const index = fileIndex[md5];
				logStr += "添加转修改\n";
				logStr += "试卷ID：" + localData[index].id + "\n";
				logStr += "MD5：" + md5 + "\n";
				logStr += "- " + formatDocumentInfo(localData[index].info) + "\n";
				logStr += "+ " + formatDocumentInfo(record.info) + "\n";
				logStr += divStr + "\n";
				localData[index].info = record.info;
				localTrack.push({
					id: record.id,
					time: record.time,
					documentID: localData[index].id,
					operation: 1,
					info: record.info,
				});
			} else {
				if (
					!fs.existsSync(path.join(process.cwd(), "data", "file", md5 + ".pdf"))
				) {
					throw `文件没有提交\n${JSON.stringify(record)}`;
				}
				record.documentID = localData.length + 1; // 纠正操作id
				logStr += "添加\n";
				logStr += "试卷ID：" + record.documentID + "\n";
				logStr += "MD5：" + md5 + "\n";
				logStr += "+ " + formatDocumentInfo(record.info) + "\n";
				logStr += divStr + "\n";
				localData.push({
					id: record.documentID,
					md5: md5,
					info: record.info,
				});
				localTrack.push(record);
			}
		} else {
			if (pushIndex[record.documentID] === undefined)
				throw `未提交试卷信息\n${JSON.stringify(record)}`;
			const md5 = pushIndex[record.documentID].md5;
			const index = fileIndex[md5];
			if (record.operation === 1) {
				logStr += "修改\n";
				logStr += "试卷ID：" + localData[index].id + "\n";
				logStr += "MD5：" + md5 + "\n";
				logStr += "- " + formatDocumentInfo(localData[index].info) + "\n";
				logStr += "+ " + formatDocumentInfo(record.info) + "\n";
				logStr += divStr + "\n";
				localData[index].info = record.info;
				localTrack.push(record);
			}
			if (record.operation === 2) {
				logStr += "删除\n";
				logStr += "试卷ID：" + localData[index].id + "\n";
				logStr += "MD5：" + md5 + "\n";
				logStr += "- " + formatDocumentInfo(localData[index].info) + "\n";
				logStr += divStr + "\n";
				localData.splice(index, 1);
				localTrack.push(record);
			}
		}
	}
	// 颁布版本
	const version = dayjs().format("YYMMDDHHmmss");
	localTrack.push({
		id: uuidv4(),
		time: new Date(),
		documentID: 0,
		operation: 3,
		version,
	});
	logStr += divStr + "\n";
	logStr += "版本：" + version + "\n";
	logStr += divStr + "\n";
	// 备份并保存
	const dataStr = JSON.stringify(localData);
	const trackStr = JSON.stringify(localTrack);
	const backupPath = path.join(process.cwd(), "data", "backup", version);
	fs.mkdirSync(backupPath, { recursive: true });
	fs.writeFileSync(path.join(backupPath, "data.json"), dataStr, "utf-8");
	fs.writeFileSync(path.join(backupPath, "track.json"), trackStr, "utf-8");
	fs.writeFileSync(
		path.join(process.cwd(), "data", "data.json"),
		dataStr,
		"utf-8",
	);
	fs.writeFileSync(
		path.join(process.cwd(), "data", "track.json"),
		trackStr,
		"utf-8",
	);
	console.log(logStr);
};

export const formatDocumentInfo = (info: DocumentInfo) => {
	let result = "";
	if (info.date != null) {
		if (info.date.yearType === 0) {
			result += info.date.year + "年";
		} else {
			result += info.date.year + "级";
		}
	} else {
		result += "未知年份-";
	}
	result += info.name;
	if (info.type === 0) {
		result += "期末试卷";
	} else if (info.type === 1) {
		result += "期中试卷";
	} else if (info.type === 2) {
		result += "其他试卷";
	}
	if (info.answer) {
		result += "及答案";
	}
	if (info.identifier) {
		result += "-" + info.identifier;
	}
	for (const tag of info.filter) {
		result += "-" + tag;
	}
	for (const tag of info.tags) {
		result += "-" + tag;
	}
	return result;
};
