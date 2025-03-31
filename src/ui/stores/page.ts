import React from "react";
import { create } from "zustand";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import Home from "../pages/Home";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Search from "../pages/Search";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import Checked from "../pages/Checked";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import Add from "../pages/Add";
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import Setting from "../pages/Setting";

export interface Page {
	title: string;
	id: string;
	icon: React.ElementType;
	content: React.ElementType;
}

export const Pages: Page[] = [
	{
		title: "首页",
		id: "home",
		icon: HomeOutlinedIcon,
		content: Home,
	},
	{
		title: "搜索",
		id: "search",
		icon: SearchOutlinedIcon,
		content: Search,
	},
	{
		title: "已选中",
		id: "checked",
		icon: PlaylistAddCheckIcon,
		content: Checked,
	},
	{
		title: "添加试卷",
		id: "add",
		icon: AddOutlinedIcon,
		content: Add,
	},
	{
		title: "设置",
		id: "setting",
		icon: SettingsOutlinedIcon,
		content: Setting,
	},
];

export interface PageStore {
	now: number;
	setNow: (now: number) => void;
}

export const usePageStore = create<PageStore>((set) => ({
	now: 1,
	setNow: (now: number) => set({ now }),
}));
