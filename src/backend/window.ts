import { Menu, MenuItem } from "electron";
import { send } from "./api";
import { Config } from "./config";
import { Document } from "../shared/types/document";

/**
 * 右键菜单
 */
export const popMenu = async (target: Document[], inSearch: boolean) => {
	const menu = new Menu();
	if (inSearch) {
		menu.append(
			new MenuItem({
				label: "简单取回",
				click: () => {
					send("onMenuCallback", target, "简单取回");
				},
				enabled: target.length !== 0,
			}),
		);
		menu.append(new MenuItem({ type: "separator" }));
	}
	menu.append(
		new MenuItem({
			label: "编辑",
			click: () => {
				send("onMenuCallback", target, "编辑");
			},
			enabled: target.length === 1,
		}),
	);
	menu.append(
		new MenuItem({
			label: "删除",
			click: () => {
				send("onMenuCallback", target, "删除");
			},
			enabled: target.length !== 0,
		}),
	);
	menu.popup({ window: Config.window });
};

export const maximizeWindow = async () => {
	if (Config.window.isMaximized()) {
		Config.window.unmaximize();
	} else {
		Config.window.maximize();
	}
};

export const minimizeWindow = async () => {
	Config.window.minimize();
};

export const closeWindow = async () => {
	Config.window.close();
};