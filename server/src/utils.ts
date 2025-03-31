import { DocumentInfo } from "./type";

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