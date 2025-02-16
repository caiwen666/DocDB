export interface IConfig {
	token: string;
	port: number;
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
	id: string; // 操作唯一标识
	time: Date; // 操作日期
	documentID: number; // 目标试卷id
}

// 版本操作记录
export interface AddRecord extends RecordBase {
	// 添加操作
	operation: 0; // 0:添加
	info: DocumentInfo; // 试卷实体
	file: string; // 文件md5
}

export interface ModifyRecord extends RecordBase {
	// 修改操作
	operation: 1; // 1:修改
	info: DocumentInfo; // 新的试卷信息
}

export interface DeleteRecord extends RecordBase {
	// 删除操作
	operation: 2; // 2:删除
}

export interface SignRecord extends RecordBase {
	// 标记版本
	operation: 3; // 3:标记
	version: string; // 版本号
}

export type Record = AddRecord | ModifyRecord | DeleteRecord | SignRecord;

export type DocumentIndex = { [id: number]: Document }; // 试卷索引
