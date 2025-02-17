export interface FileDetail {
	name: string; // 文件名
	path: string; // 绝对路径
	md5: string; // md5，防止资料重复
	page: number; // pdf文件页数
}

// 试卷信息
export interface DocumentInfo {
	name: string; // 课程名称，正式名称，以试卷卷头为准。试卷名称不应包含其他信息，如高等数学A1，应填高等数学，A1应添加到标签部分
	identifier?: string; // 课程代码
	date?: {
		year: number; // 年份
		yearType: 0 | 1; // 0:年份是考试年份 1:年份是参加考试学生的入学年份
	};
	type: 0 | 1 | 2; // 试卷类型，0:期末考试 1:期中考试 2:机考题库/其他题库
	answer: boolean; // 是否有答案
	page: number; // 页数
	filter: string[]; // 筛选标签，课程类型，如A1，下
	tags: string[]; // 指示标签，指定学院、专业用卷；特殊试卷，如B卷、补考；
}

// 试卷实体
export interface Document {
	id: number; // 试卷编号
	md5: string; // 对应文件的 md5
	info: DocumentInfo; // 试卷信息
}

// 包含了文件信息的试卷实体，用于文件导入
export interface DocumentFromFile extends Document {
	path: string;
	file: string;
}

// 选中的试卷，用于取回
export interface SelectedDocument {
	document: Document;
	color: boolean; // 是否彩印
	double: boolean; // 是否双面
	count: number; // 份数
}


