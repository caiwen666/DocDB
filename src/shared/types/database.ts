import { Document } from "./document";
import { Record } from "./record";

// 数据库摘要信息，用于展示
export interface DatabaseSummary {
	documentCount: number; // 试卷总数
	courseCount: number; // 课程总数
}

// 数据库的数据集合信息，用于检索
export type DocumentDatabase = { [md5: string]: Document }; // data.json
export type DocumentIndex = { [id: number]: Document }; // 试卷索引，按从近到远排序
export type DocumentNameIndex = { [name: string]: number[] }; // 试卷名称索引，把课程名称一样的合在一块
export type FileIndex = { [md5: string]: number }; // 文件索引，文件md5与试卷id的映射