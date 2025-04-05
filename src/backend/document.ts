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
import { Database, saveDatabase, updateDatabase, wait } from "./database";
import { AddRecord, DeleteRecord, ModifyRecord } from "../shared/types/record";
import { APIResponse, openFile, request } from "./utils";
import fetch from "node-fetch";
import FormData from "form-data";

// 数据库所在目录
const cwd = path.join(process.cwd(), "data");

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
		const pdf = await PDFDocument.load(file, { ignoreEncryption: true });
		const base = doc.document.info.page;
		if (!doc.double) {
			// 单面的话先批量插页，插到后面
			for (let i = 0; i < base; i++) {
				pdf.addPage();
			}
		} else if (base % 2 === 1) {
			pdf.addPage();
		}
		// 根据份数复制
		for (let i = 0; i < doc.count; i++) {
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
					opacity: 0.5,
					font,
				});
				page.drawText("自强打印店", {
					x: (width - (5 * 80) / Math.sqrt(2)) / 2,
					y: (width - 80 / Math.sqrt(2)) / 2,
					size: 80,
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
 * @param doc
 */
export const addDocument = async (doc: DocumentFromFile) => {
	await wait();
	fs.mkdirSync(path.join(cwd, "files"), { recursive: true });
	const remote = Config.settings.database.remote;
	const token = Config.settings.database.token;
	// 先看一下是否已经存在了
	const checkRes = await request("hasFile?md5=" + doc.md5, "GET");
	const checkData = ((await checkRes.json()) as APIResponse).data as boolean;
	if (checkData) {
		throw "文件已经存在于远程数据库中";
	}
	// 上传文件
	const form = new FormData();
	const fileStream = fs.createReadStream(doc.path);
	form.append("file", fileStream, doc.md5 + ".pdf");
	await fetch(remote + "pushFile", {
		method: "POST",
		body: form,
		headers: {
			...form.getHeaders(),
			Authorization: token,
		},
	});
	// 上传信息
	const res = await fetch(
		remote +
			`update?opt=create&rid=${Database.record.length - 1}&md5=${doc.md5}`,
		{
			method: "POST",
			body: JSON.stringify(doc.info),
			headers: {
				"Content-Type": "application/json",
				Authorization: token,
			},
		},
	);
	const data = (await res.json()) as APIResponse;
	if (data.status === "failed") {
		throw data.msg;
	}
	const record = data.data as AddRecord;
	// 然后修改本地数据库
	Database.data[doc.md5] = {
		id: record.documentID,
		md5: doc.md5,
		info: doc.info,
	};
	Database.latest++;
	Database.record.push(record);
	// 入库
	await fs.promises.copyFile(
		doc.path,
		path.join(cwd, "files", doc.md5 + ".pdf"),
	);
};

/**
 * 删除文档
 * @param id
 */
export const deleteDocument = async (id: number) => {
	await wait();

	const doc = Database.index[id];
	const res = await fetch(
		Config.settings.database.remote +
			`update?opt=delete&rid=${Database.record.length - 1}&md5=${doc.md5}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: Config.settings.database.token,
			},
		},
	);
	const data = (await res.json()) as APIResponse;
	if (data.status === "failed") {
		throw data.msg;
	}
	const record = data.data as DeleteRecord;
	delete Database.data[doc.md5];
	Database.record.push(record);
	Database.latest++;
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

	const doc = Database.index[id];
	const res = await fetch(
		Config.settings.database.remote +
			`update?opt=modify&rid=${Database.record.length - 1}&md5=${doc.md5}`,
		{
			method: "POST",
			body: JSON.stringify(info),
			headers: {
				"Content-Type": "application/json",
				Authorization: Config.settings.database.token,
			},
		},
	);
	const data = (await res.json()) as APIResponse;
	if (data.status === "failed") {
		throw data.msg;
	}
	const record = data.data as ModifyRecord;
	Database.data[doc.md5].info = info;
	Database.record.push(record);
	Database.latest++;
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
	return Database.data[md5];
};
