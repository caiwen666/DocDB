import { FileDetail } from "../shared/types/document";
import * as fs from "fs";
import * as crypto from "crypto";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { exec } from "child_process";
import { Config } from "./config";
import fetch, { Response } from "node-fetch";

/**
 * 获取文件的详细信息
 * @param pathStr 文件的绝对路径
 */
export async function getFileDetail(pathStr: string): Promise<FileDetail> {
	const pathObj = path.parse(pathStr);
	const fileBuffer = await fs.promises.readFile(pathStr);
	const hash = crypto.createHash("md5");
	hash.update(fileBuffer);
	const pdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
	return {
		name: pathObj.name,
		path: pathStr,
		md5: hash.digest("hex"),
		page: pdf.getPageCount(),
	};
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
 * @param target 文件绝对路径
 * @param body node-fetch 的 body
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
 * 打开临时目录
 */
export const openTempDir = async () => {
	await openFile(path.join(process.cwd(), "data", "tmp"));
};

// 统一响应格式
export interface APIResponse {
	status: "ok" | "failed";
	data?: unknown;
	msg?: string;
}

/**
 * 简单封装 http请求，自动添加 token 和请求地址
 */
export const request = async (
	target: string,
	method: "POST" | "GET",
): Promise<Response> => {
	return await fetch(Config.settings.database.remote + target, {
		headers: {
			Authorization: Config.settings.database.token,
		},
		method: method,
	});
};
