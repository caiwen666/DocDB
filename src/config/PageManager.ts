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
import AltRouteOutlinedIcon from "@mui/icons-material/AltRouteOutlined";
import Push from "../pages/Push";

export interface Page {
	title: string;
	icon: React.ElementType;
	content: React.ElementType;
}

export const Pages: Page[] = [
	{
		title: "首页",
		icon: HomeOutlinedIcon,
		content: Home,
	},
	{
		title: "搜索",
		icon: SearchOutlinedIcon,
		content: Search,
	},
	{
		title: "已选中",
		icon: PlaylistAddCheckIcon,
		content: Checked,
	},
	{
		title: "添加试卷",
		icon: AddOutlinedIcon,
		content: Add,
	},
	{
		title: "推送",
		icon: AltRouteOutlinedIcon,
		content: Push,
	},
];

export interface PageStore {
	now: number;
	setNow: (now: number) => void;
}

export const usePageStore = create<PageStore>((set) => ({
	now: 0,
	setNow: (now: number) => set({ now }),
}));
