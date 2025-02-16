export interface FileDetail {
	name: string; // 文件名
	path: string; // 绝对路径
	md5: string; // md5，防止资料重复
	page: number; // pdf文件页数
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

export interface DocumentFromFile extends Document {
	path: string;
	file: string;
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

export type DocumentDatabase = Document[]; // data.json
export type DatabaseTrack = Record[]; // track.json，数据库变动记录，用于回溯和同步
export type DocumentIndex = { [id: number]: Document }; // 试卷索引，按从近到远排序
export type DocumentNameIndex = { [name: string]: number[] }; // 试卷名称索引，把课程名称一样的合在一块
export type FileIndex = { [md5: string]: number }; // 文件索引，文件md5与试卷id的映射

/*
 搜索时，先从名称索引中找到对应的试卷id
 然后把试卷按类型分类
 filter标签筛选时，直接大力枚举过滤
*/

// 用于 ui 界面展示
export interface TrackItemUI extends RecordBase {
	operation: 0 | 1 | 2;
	info: DocumentInfo;
	oldInfo?: DocumentInfo;
}

export interface SelectedDocument {
	document: Document;
	color: boolean; // 是否彩印
	double: boolean; // 是否双面
	count: number; // 份数
}

export interface DatabaseSummary {
	documentCount: number; // 试卷总数
	courseCount: number; // 课程总数
}
