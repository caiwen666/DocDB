import { DocumentInfo } from "./document";

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

// 用于 ui 界面展示
export interface TrackItemUI extends RecordBase {
	operation: 0 | 1 | 2;
	info: DocumentInfo;
	oldInfo?: DocumentInfo;
}