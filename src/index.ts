import { app, BrowserWindow } from "electron";
import { initDatabase } from "./backend/database";
import { initAPI, send } from "./backend/api";
import * as fs from "node:fs";
import path from "path";
import { Config } from "./backend/config";
import { readFile } from "./backend/utils";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require("electron-squirrel-startup")) {
	app.quit();
}

const createWindow = (): void => {
	const mainWindow = new BrowserWindow({
		frame: false,
		height: 600,
		width: 800,
		minHeight: 600,
		minWidth: 800,
		show: false, // 隐藏窗口，等待加载完成后再显示，避免闪烁
		webPreferences: {
			preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
			nodeIntegration: true,
		},
	});
	// 监听窗口事件
	mainWindow.on("maximize", () => {
		send("onWindowStateChange", true);
	});
	mainWindow.on("unmaximize", () => {
		send("onWindowStateChange", false);
	});
	// 初始化数据
	Config.window = mainWindow;
	Config.font = fs.readFileSync(path.join(process.cwd(), "font.ttf"));
	readFile(
		path.join(process.cwd(), "config.json"),
		JSON.stringify(Config.settings),
	).then((settings) => {
		// TODO: 有可能配置文件还没读完渲染进程就调用相关接口了？
		Config.settings = JSON.parse(settings);
		// Open the DevTools.
		if (Config.settings.dev.devTools) {
			mainWindow.webContents.openDevTools({ mode: "detach" });
		}
	});
	// 清理临时文件
	if (!fs.existsSync(path.join(process.cwd(), "data", "tmp"))) {
		fs.mkdirSync(path.join(process.cwd(), "data", "tmp"), { recursive: true });
	}
	const tempFiles = fs.readdirSync(path.join(process.cwd(), "data", "tmp"));
	for (const file of tempFiles) {
		try {
			fs.rmSync(path.join(process.cwd(), "data", "tmp", file), {
				force: true,
			});
		} catch (e) {
			console.error(`delete ${file} failed`, e);
		}
	}
	// 初始化 API
	initAPI();
	// 初始化数据库
	initDatabase();
	// 加载页面
	mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
	mainWindow.once("ready-to-show", () => {
		mainWindow.show();
	});
};

app.on("ready", createWindow);
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});
