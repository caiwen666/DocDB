import { Document, FileDetail, SelectedDocument } from "../types/document";
import * as fs from "fs";
import * as crypto from "crypto";
import path from "path";
import { degrees, PDFDocument } from "pdf-lib";
import { Fontkit } from "pdf-lib/es/types/fontkit";
import fontkit from "fontkit";
import { Global } from "../config/backend";
import { send } from "../api/backend";
import { exec } from "child_process";

export async function getFileDetail(
	pathStr: string,
): Promise<FileDetail | string> {
	const pathObj = path.parse(pathStr);
	const result: FileDetail = {
		name: pathObj.name,
		path: pathStr,
		md5: "",
		page: 0,
	};

	let fileBuffer;
	let hash;
	try {
		fileBuffer = await fs.promises.readFile(pathStr);
		hash = crypto.createHash("md5");
	} catch (error) {
		return "读取文件时出错\n" + error;
	}
	try {
		hash.update(fileBuffer);
		result.md5 = hash.digest("hex");
	} catch (error) {
		return "获取md5时出错\n" + error;
	}
	try {
		const pdf = await PDFDocument.load(fileBuffer);
		result.page = pdf.getPageCount();
	} catch (error) {
		return "解析pdf时出错\n" + error;
	}
	return result;
}

/**
 * 读入文件，如果不存在则创建，并设置指定默认内容，使用 utf-8 编码
 * @param pathStr 文件路径
 * @param defaultContent 默认内容
 * @returns 文件内容
 */
export const readFile = async (pathStr: string, defaultContent: string) => {
	const dir = path.dirname(pathStr);
	await fs.promises.mkdir(dir, { recursive: true });
	if (!fs.existsSync(pathStr)) {
		await fs.promises.writeFile(pathStr, defaultContent);
		return defaultContent;
	} else {
		return await fs.promises.readFile(pathStr, "utf-8");
	}
};

/**
 * 二进制 body 写入文件
 */
export const writeFile = async (target: string, body: any) => {
	body.on("error", (err: unknown) => {
		throw err;
	});
	const stream = fs.createWriteStream(target);
	for await (const chunk of body) {
		stream.write(chunk);
	}
	stream.close();
};

/**
 * 打开文件
 * @param target 文件绝对路径
 */
export const openFile = async (target: string) => {
	exec(`start "" "${target}"`);
};

/**
 * 为什么js的async没有sleep？
 */
export const asyncSleep = (ms: number) => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve("ok");
		}, ms);
	});
};

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
	const font = await mergedPdf.embedFont(Global.font);
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
