import { BrowserWindow, Menu, MenuItem } from "electron";
import { send } from "../api/backend";
import { Document } from "../types/document";

export interface IGlobal {
	window: BrowserWindow | null;
	font: Buffer | null;
}

export const Global: IGlobal = {
	window: null,
	font: null,
};

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
	menu.popup({ window: Global.window });
};
