import {
	Document,
	DocumentFromFile,
	DocumentInfo,
	SelectedDocument,
} from "../shared/types/document";
import { send } from "./api";
import path from "path";
import * as fs from "node:fs";
import { PDFDocument } from "pdf-lib";
import fontkit from "fontkit";
import { Fontkit } from "pdf-lib/es/types/fontkit";
import { Config } from "./config";
import { degrees } from "pdf-lib/es/api/rotations";
import Path from "path";
import { v4 as uuidv4 } from "uuid";
import { Database, saveDatabase, updateDatabase, wait } from "./database";
import { AddRecord, DeleteRecord, ModifyRecord } from "../shared/types/record";
import { openFile } from "./utils";

// 数据库所在目录
const cwd = Path.join(process.cwd(), "data");

/**
 * 取回文件
 * @param target
 * @Returns 取回文件的路径
 */
export const fetchBack = async (
	target: SelectedDocument[],
): Promise<string> => {
	send("onFetchBackProgressUpdated", -1);
	const tmpPath = path.join(process.cwd(), "data", "tmp");
	await fs.promises.mkdir(tmpPath, { recursive: true });
	const time = new Date().getTime();
	const mergedPdf = await PDFDocument.create();
	const pages = [];
	let ok = 0;
	send("onFetchBackProgressUpdated", 0, target.length);
	// 把所有页面都复制出来
	for (const doc of target) {
		const file = await fs.promises.readFile(
			path.join(process.cwd(), "data", "files", doc.document.md5 + ".pdf"),
		);
		const pdf = await PDFDocument.load(file);
		const base = doc.document.info.page;
		if (!doc.double) {
			// 单面的话先批量插页，插到后面
			for (let i = 0; i < base; i++) {
				pdf.addPage();
			}
		} else if (base % 2 === 1) {
			pdf.addPage();
		}
		const copy = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
		const once = [];
		if (!doc.double) {
			//再放到中间来
			for (let i = 0; i < base; i++) {
				once.push(copy[i]);
				once.push(copy[i + base]);
			}
		} else {
			// 直接拷贝过去
			once.push(...copy);
		}
		// 根据份数复制
		for (let i = 0; i < doc.count; i++) {
			pages.push(...once);
		}
		ok++;
		send("onFetchBackProgressUpdated", ok, target.length);
	}
	send("onFetchBackProgressUpdated", -1);
	// 批量添加
	for (let i = 0; i < pages.length; i++) {
		mergedPdf.addPage(pages[i]);
	}
	// 嵌入字体
	mergedPdf.registerFontkit(fontkit as unknown as Fontkit);
	const font = await mergedPdf.embedFont(Config.font);
	// 添加水印
	let p = 0;
	const total = mergedPdf.getPageCount();
	send("onFetchBackProgressUpdated", 0, total);
	for (const doc of target) {
		for (let i = 0; i < doc.count; i++) {
			for (let j = 0; j < doc.document.info.page; j++) {
				const page = mergedPdf.getPage(p);
				const { width, height } = page.getSize();
				if (j == 0) {
					//首页
					const info = doc.document.info;
					let sign1 = "";
					if (info.date) {
						if (info.date.yearType === 0) sign1 += info.date.year + "年";
						else sign1 += info.date.year + "级";
					} else {
						sign1 += "未知年份";
					}
					sign1 += info.name;
					if (info.type === 0) sign1 += "期末";
					else if (info.type === 1) sign1 += "期中";
					for (const tag of info.filter) {
						sign1 += "-" + tag;
					}
					for (const tag of info.tags) {
						sign1 += "-" + tag;
					}
					const sign2 = `DocDB ID:${doc.document.id}`;
					page.drawText(sign1, {
						x: width - font.widthOfTextAtSize(sign1, 12) - 20,
						y: 20,
						size: 12,
						opacity: 0.5,
						font,
					});
					page.drawText(sign2, {
						x: width - font.widthOfTextAtSize(sign2, 12) - 20,
						y: 20 + 12 + 2,
						size: 12,
						opacity: 0.5,
						font,
					});
				}
				page.drawText("本资料由自强整理，仅供复习使用", {
					x: (width - 15 * 12) / 2,
					y: height - 34,
					size: 12,
					opacity: 0.3,
					font,
				});
				page.drawText("自强打印店", {
					x: (width - Math.sqrt(72 * 5)) / 2,
					y: (height - Math.sqrt(72 * 5)) / 2,
					size: 72,
					opacity: 0.3,
					rotate: degrees(45),
					font,
				});
				if (!doc.double) {
					// 单面打印
					p += 2;
				} else if (
					doc.document.info.page % 2 === 1 &&
					j == doc.document.info.page - 1
				) {
					// 双面打印，奇数页，且枚举到了最后一页
					p += 2;
				} else {
					// 双面打印，偶数页
					p++;
				}
				send("onFetchBackProgressUpdated", p, total);
			}
		}
	}
	send("onFetchBackProgressUpdated", -1);
	const mergedPdfBytes = await mergedPdf.save();
	const mergedPdfPath = path.join(tmpPath, time + ".pdf");
	await fs.promises.writeFile(mergedPdfPath, mergedPdfBytes);
	return mergedPdfPath;
};

/**
 * 添加试卷
 * @param docs
 */
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
		// TODO 如果这里文件读入除了差错，那么整个要导入的数据就丢失了，需要解决
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

/**
 * 删除文档
 * @param id
 */
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

/**
 * 更新文档
 * @param id
 * @param info
 */
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

/**
 * 获取文档
 * @param id
 */
export const getDocument = async (id: number) => {
	await wait();
	return Database.index[id];
};

/**
 * 搜索文档
 * @param keyword 关键字
 */
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

/**
 * 打开文件
 * @param id
 */
export const openDocument = async (id: number) => {
	await wait();
	await openFile(path.join(cwd, "files", Database.index[id].md5 + ".pdf"));
};

/**
 * 通过文件md5获取试卷
 * @param md5
 */
export const getDocumentByMD5 = async (md5: string) => {
	await wait();
	return await getDocument(Database.fileIndex[md5]);
};
