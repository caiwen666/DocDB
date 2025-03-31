import { DocumentInfo } from "./document";

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