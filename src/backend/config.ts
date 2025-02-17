import { BrowserWindow } from "electron";

// 全局配置信息
export interface ISettings {
	settings: { // 在根目录的 config.json 中配置
		database: {
			remote: string;
			token: string;
		};
	},
	window: BrowserWindow, // 主窗口示例
	font: Buffer  // 字体文件，用于取回试卷时嵌入字体
}

export const Config: ISettings = {
	settings: {
		database: {
			remote: "https://doc.caiwen.work/",
			token: "",
		},
	},
	window: null,
	font: null,
};