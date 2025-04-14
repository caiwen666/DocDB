import { DocumentInfo, SelectedDocument } from "../types/document";

/**
 * 把文件名中潜在的试卷信息自动解析出来
 * @param str 文件名
 * @param info 原始试卷信息
 * @returns 解析后的试卷信息
 */
export const parseName = (str: string, info: DocumentInfo) => {
	const yearMatch = str.match(/[^0-9]*[0-9]+[^0-9]*/g);
	if (yearMatch != null) {
		for (let s of yearMatch) {
			s = s.replace(/[^0-9]*/g, "");
			if (s.length === 2 || s.length === 4) {
				let year = Number(s);
				if (year < 100) year += 2000;
				info.date.year = year;
				str = str.replace(s, "");
			}
		}
	}
	const idMatch = str.match(/[A-Z]+\d+/g);
	if (idMatch != null) {
		const id = idMatch[0];
		info.identifier = id;
		str = str.replace(/[A-Z]+\d+/g, "");
	}
	const keys = [
		"试卷及",
		"试题及",
		"试卷",
		"试题",
		"未知年份",
		"年",
		"级",
		"月",
	];
	for (const key of keys) {
		str = str.replace(key, "");
	}
	if (str.includes("期中")) {
		info.type = 1;
		str = str.replace("期中", "");
	}
	if (str.includes("期末")) {
		info.type = 0;
		str = str.replace("期末", "");
	}
	if (str.includes("机考")) {
		info.type = 2;
		str = str.replace("机考", "");
	}
	if (str.includes("答案")) {
		info.answer = true;
		str = str.replace("答案", "");
	} else {
		info.answer = false;
	}
	str = str.replace(/[^\u4e00-\u9fa5]/g, "");
	info.name = str;
	return info;
};

/**
 * 格式化试卷信息为字符串
 * @param info
 */
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

/**
 * 格式化任意类型为字符串，对象会被转为 JSON 字符串且带缩进。用于把异常信息转为字符串
 * @param v
 */
export const formatToString = (v: unknown) => {
	if (typeof v === "string") return v;
	if (typeof v === "object") return JSON.stringify(v, null, 2);
	return v.toString();
};

/**
 * 计算试卷价格
 * @param target
 */
export const calcMoney = (target: SelectedDocument[]) => {
	let res = 0;
	for (const doc of target) {
		let t = 0;
		const page = doc.document.info.page;
		if (doc.double) {
			t = Math.ceil(page / 2) * 0.12;
		} else {
			t = page * 0.08;
		}
		if (doc.color) t *= 10;
		res += t * doc.count;
	}
	return res.toFixed(2);
};

/**
 * 为什么js的async没有sleep？
 * @param ms
 */
export const asyncSleep = (ms: number) => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve("ok");
		}, ms);
	});
};

/**
 * nodejs这种高级语言还是把持不住
 */
export const clone = <T>(obj: T) => {
	return JSON.parse(JSON.stringify(obj)) as T;
};
