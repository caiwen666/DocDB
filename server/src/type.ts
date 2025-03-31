export interface Response {
	status: 'ok' | 'failed';
	data?: unknown;
	msg?: string;
}

export interface IConfig {
	token: string;
	port: number;
	record: Record[];
	data: {[md5: string]: Document};
	startID: number;
}

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

export interface RecordBase {
	id: number; // 操作唯一标识
	time: string; // 操作日期
	documentID: number; // 目标试卷id
	file: string; // 操作文件的md5
}

// 操作记录
export interface AddRecord extends RecordBase {
	// 添加操作
	operation: 'create';
	info: DocumentInfo; // 试卷实体
}

export interface ModifyRecord extends RecordBase {
	// 修改操作
	operation: 'modify';
	info: DocumentInfo; // 新的试卷信息
}

export interface DeleteRecord extends RecordBase {
	// 删除操作
	operation: 'delete';
}

export type Record = AddRecord | ModifyRecord | DeleteRecord;
