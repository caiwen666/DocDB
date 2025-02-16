import React, { useEffect, useState } from "react";
import { ButtonBase, CircularProgress, Paper } from "@mui/material";
import RemoveOutlinedIcon from "@mui/icons-material/RemoveOutlined";
import CropSquareOutlinedIcon from "@mui/icons-material/CropSquareOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import CloseFullscreenOutlinedIcon from "@mui/icons-material/CloseFullscreenOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import { animated, useSpring } from "@react-spring/web";
import SideMenuItem from "./components/SideMenuItem";
import { Pages, usePageStore } from "./config/PageManager";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import DialogBase from "./components/DialogBase";

export default function Window({
	title,
	icon,
	children,
	sideMenu = true,
}: {
	title: string;
	icon: React.ReactNode;
	children: React.ReactNode;
	sideMenu?: boolean;
}) {
	const [isMaximized, setIsMaximized] = useState(false);
	const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
	const [isDatabaseReady, setIsDatabaseReady] = useState(false);
	const [databaseVersion, setDatabaseVersion] = useState("");
	const pageStore = usePageStore();
	const menuStyles = useSpring({
		width: isSideMenuOpen ? "192px" : "40px",
		overflow: "hidden",
	});
	useEffect(() => {
		window.api.onWindowStateChange((isMaximized) => {
			setIsMaximized(isMaximized);
		});
		window.api.onDatabaseStatusChange((status, version) => {
			if (status === "ready") {
				setIsDatabaseReady(true);
				setDatabaseVersion(version);
			} else {
				setIsDatabaseReady(false);
			}
		});

		async function asyncInit() {
			if ((await window.api.getDatabaseStatus()) === "pending") {
				setIsDatabaseReady(false);
			} else {
				setIsDatabaseReady(true);
				setDatabaseVersion(await window.api.getDatabaseVersion());
			}
		}

		asyncInit();
	}, []);
	return (
		<div className={"h-screen w-screen flex flex-col"}>
			<Paper
				elevation={0}
				className={"h-10 flex titlebar bg-white1 flex-shrink-0"}
				square
			>
				{sideMenu && (
					<ButtonBase
						className={
							"w-10 h-full hover:bg-gray-200 transition text-primary bg-white0 btn"
						}
						component={"div"}
						onClick={() => setIsSideMenuOpen(!isSideMenuOpen)}
					>
						<MenuIcon fontSize={"small"} />
					</ButtonBase>
				)}
				<div className={"text-2xl text-primary self-center flex mx-2"}>
					{icon}
				</div>
				<div className={"self-center text-primary text-sm"}>{title}</div>
				<div className={"ml-auto btn"}>
					<ButtonBase
						className={"w-10 h-full hover:bg-gray-200 transition text-primary"}
						component={"div"}
						onClick={window.api.minimize}
					>
						<RemoveOutlinedIcon fontSize={"small"} />
					</ButtonBase>
					<ButtonBase
						className={"w-10 h-full hover:bg-gray-200 transition text-primary"}
						component={"div"}
						onClick={window.api.maximize}
					>
						{isMaximized ? (
							<CloseFullscreenOutlinedIcon fontSize={"small"} />
						) : (
							<CropSquareOutlinedIcon fontSize={"small"} />
						)}
					</ButtonBase>
					<ButtonBase
						className={
							"w-10 h-full hover:bg-red-600 hover:text-white transition text-primary"
						}
						component={"div"}
						onClick={window.api.close}
					>
						<CloseOutlinedIcon fontSize={"small"} />
					</ButtonBase>
				</div>
			</Paper>
			<div className={"flex w-full flex-1 overflow-y-auto"}>
				{sideMenu && (
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					<animated.div style={{ ...menuStyles }}>
						<div className={"w-full h-full bg-white1"}>
							{Pages.map((page, index) => (
								<SideMenuItem
									Icon={page.icon}
									title={page.title}
									active={pageStore.now == index}
									onClick={() => {
										pageStore.setNow(index);
									}}
									key={index}
								/>
							))}
						</div>
					</animated.div>
				)}
				<div className={"flex-1 bg-background overflow-y-auto p-2"}>
					{children}
				</div>
			</div>
			<div
				className={
					"h-7 bg-primary flex-shrink-0 flex text-white text-opacity-80"
				}
			>
				<ButtonBase
					component={"div"}
					className={
						"h-full px-2 bg-black bg-opacity-0 hover:bg-opacity-20 transition"
					}
					onClick={() => pageStore.setNow(4)}
				>
					{isDatabaseReady ? (
						<CheckOutlinedIcon fontSize={"inherit"} />
					) : (
						<CircularProgress size="12px" className={"text-white ml-1"} />
					)}
					<div className={"text-xs ml-2 mr-1"}>
						{isDatabaseReady ? `本地版本：${databaseVersion}` : "正在加载"}
					</div>
				</ButtonBase>
			</div>
			<DialogBase />
		</div>
	);
}
