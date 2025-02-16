import React, { SetStateAction, useEffect, useRef, useState } from "react";
import AltRouteOutlinedIcon from "@mui/icons-material/AltRouteOutlined";
import {
	Button,
	CircularProgress,
	Dialog,
	DialogContent,
	DialogContentText,
	DialogTitle,
	LinearProgress,
} from "@mui/material";
import Timeline from "@mui/lab/Timeline";
import TimelineItem, { timelineItemClasses } from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";
import { TrackItemUI } from "../types/document";
import _ from "lodash";
import dayjs from "dayjs";
import DocumentItem from "../components/DocumentItem";
import { formatToString, invoke } from "../utils";
import { useDialogStore } from "../utils/dialog";
import { subscribe } from "../config/callback";
import { usePageStore } from "../config/PageManager";

export default function Push() {
	const pushDialog = useDialogStore((state) => state.push);
	const [track, setTrack] = useState<TrackItemUI[]>(null);
	const [remoteVersion, setRemoteVersion] = useState("未获取");
	const [localVersion, setLocalVersion] = useState("未获取");
	const localVersionRef = useRef(localVersion);
	const remoteVersionRef = useRef(remoteVersion);
	const [loading, setLoading] = useState(0);
	const [syncProgress, setSyncProgress] = useState([-1, -1]);
	const getRemoteVersion = async () => {
		setLoading(1);
		const version = (await invoke("getRemoteVersion")).unwrap_or_else((e) => {
			pushDialog({
				title: "错误",
				content: (
					<DialogContent>
						<DialogContentText>获取远程版本失败</DialogContentText>
						<div className={"whitespace-break-spaces mt-2"}>
							{formatToString(e)}
						</div>
					</DialogContent>
				),
			});
			return "获取失败";
		});
		setRemoteVersion(version);
		remoteVersionRef.current = version;
		setLoading(0);
	};
	const doSync = async () => {
		if (
			remoteVersionRef.current === "未获取" ||
			remoteVersionRef.current === "获取失败"
		) {
			pushDialog({
				title: "错误",
				content: (
					<DialogContent>
						<DialogContentText>未获取远程版本</DialogContentText>
					</DialogContent>
				),
			});
			return;
		}
		if (localVersionRef.current === remoteVersionRef.current) {
			const op = await new Promise((resolve) => {
				pushDialog({
					title: "提示",
					content: (
						<DialogContent>
							<DialogContentText>
								本地版本和远程版本一致，是否仍继续同步？
							</DialogContentText>
						</DialogContent>
					),
					buttons: ["取消", "继续"],
					callback: resolve,
				});
			});
			if (op === "取消") {
				return;
			}
		}
		setLoading(2);
		try {
			(await invoke("pushDatabase")).unwrap();
			(await invoke("pullDatabase")).unwrap();
			setLoading(0);
			pushDialog({
				title: "成功",
				content: (
					<DialogContent>
						<DialogContentText>同步成功</DialogContentText>
					</DialogContent>
				),
			});
			window.api.getTrack().then((data) => setTrack(data));
			window.api.getDatabaseVersion().then((v) => {
				setLocalVersion(v);
				localVersionRef.current = v;
			});
		} catch (e) {
			setLoading(0);
			pushDialog({
				title: "错误",
				content: (
					<DialogContent>
						<DialogContentText>同步失败</DialogContentText>
						<div className={"whitespace-break-spaces mt-2"}>
							{formatToString(e)}
						</div>
					</DialogContent>
				),
			});
		}
	};
	const handleProgress = (v1: number, v2?: number) => {
		setSyncProgress([v1, v2]);
	};
	useEffect(() => {
		const init = () => {
			setTrack(null);
			window.api.getTrack().then((data) => setTrack(data));
			getRemoteVersion();
			window.api.getDatabaseVersion().then((v) => {
				setLocalVersion(v);
				localVersionRef.current = v;
			});
		};
		usePageStore.subscribe((state) => {
			if (state.now !== 4) return;
			init();
		});
		init();
		subscribe("onDatabaseProgressUpdated", handleProgress);
	}, []);
	return (
		<div>
			<div className={"rounded p-2 bg-white flex items-center"}>
				<AltRouteOutlinedIcon className={"text-primary"} fontSize={"large"} />
				<div className={"text-title text-xs ml-2"}>
					<div>本地版本：{localVersion}</div>
					<div className={"mt-0.5"}>远程版本：{remoteVersion}</div>
				</div>
				<div className={"ml-auto"}>
					<Button
						onClick={() => getRemoteVersion()}
						loading={loading === 1}
						disabled={loading !== 0}
					>
						重新获取远程版本
					</Button>
					<Button
						onClick={() => doSync()}
						loading={loading === 2}
						disabled={loading !== 0}
					>
						同步
					</Button>
				</div>
			</div>
			<div className={"text-title text-lg select-none ml-2 mt-2"}>
				未提交的更改
			</div>
			{track === null && (
				<CircularProgress className={"mt-2 ml-2"}></CircularProgress>
			)}
			{track !== null &&
				(track.length === 0 ? (
					<div className={"text-title text-sm mt-2 ml-2"}>暂无更改</div>
				) : (
					<Timeline
						sx={{
							[`& .${timelineItemClasses.root}:before`]: {
								flex: 0,
								padding: 0,
							},
						}}
					>
						{_.reverse(track).map((item) => {
							let op = "";
							if (item.operation === 0) op = "添加试卷";
							if (item.operation === 1) op = "修改试卷";
							if (item.operation === 2) op = "删除试卷";
							return (
								<TimelineItem key={item.id}>
									<TimelineSeparator>
										<TimelineDot variant="outlined" color="primary" />
										<TimelineConnector />
									</TimelineSeparator>
									<TimelineContent>
										<div className={"text-sm"}>
											{op} - {dayjs(item.time).format("YYYY-MM-DD HH:ss")}
										</div>
										{item.operation === 0 && (
											<DocumentItem
												variant={1}
												info={item.info}
												className={"bg-primary bg-opacity-20 mt-2"}
											/>
										)}
										{item.operation === 1 && (
											<>
												<DocumentItem
													variant={1}
													info={item.info}
													className={"bg-success bg-opacity-20 mt-2"}
												/>
												<DocumentItem
													variant={1}
													info={item.oldInfo}
													className={"bg-error bg-opacity-20 mt-2"}
												/>
											</>
										)}
										{item.operation === 2 && (
											<DocumentItem
												variant={1}
												info={item.info}
												className={"bg-error bg-opacity-20 mt-2"}
											/>
										)}
									</TimelineContent>
								</TimelineItem>
							);
						})}
					</Timeline>
				))}
			{loading === 2 && (
				<Dialog fullWidth open={true}>
					<DialogTitle>同步</DialogTitle>
					<DialogContent>
						<DialogContentText>
							{syncProgress[0] === -1 ? "正在同步" : "正在同步文件"}
						</DialogContentText>
						<LinearProgress
							className={"mt-2"}
							variant={syncProgress[0] === -1 ? "indeterminate" : "determinate"}
							value={
								syncProgress[0] === -1
									? undefined
									: syncProgress[0] / syncProgress[1]
							}
						/>
						{syncProgress[0] !== -1 && (
							<DialogContentText className={"text-right mt-1"}>
								{syncProgress[0]}/{syncProgress[1]}
							</DialogContentText>
						)}
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
