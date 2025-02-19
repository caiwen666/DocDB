import React, { useEffect, useRef, useState } from "react";
import AltRouteOutlinedIcon from "@mui/icons-material/AltRouteOutlined";
import {
	Button,
	CircularProgress,
	DialogContent,
	DialogContentText,
} from "@mui/material";
import Timeline from "@mui/lab/Timeline";
import TimelineItem, { timelineItemClasses } from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";
import _ from "lodash";
import dayjs from "dayjs";
import DocumentItem from "../components/DocumentItem";
import { useDialogStore } from "../stores/dialog";
import { Pages, usePageStore } from "../stores/page";
import { TrackItemUI } from "../../shared/types/record";
import { invoke } from "../api";
import DialogErrorTemplate from "../components/dialog/DialogErrorTemplate";
import DialogBarProgressTemplate from "../components/dialog/DialogBarProgressTemplate";

export default function Push() {
	const pushDialog = useDialogStore((state) => state.push);
	const pushWaitingDialog = useDialogStore((state) => state.pushWaitingDialog);
	const closeWaitingDialog = useDialogStore(
		(state) => state.closeWaitingDialog,
	);
	const [track, setTrack] = useState<TrackItemUI[]>(null);
	const [remoteVersion, setRemoteVersion] = useState("未获取");
	const [localVersion, setLocalVersion] = useState("未获取");
	const localVersionRef = useRef(localVersion);
	const remoteVersionRef = useRef(remoteVersion);
	const [loading, setLoading] = useState(false);
	const getRemoteVersion = async () => {
		setLoading(true);
		const version = (await invoke("getRemoteVersion")).unwrap_or_else((e) => {
			pushDialog({
				title: "错误",
				content: (
					<DialogContent>
						<DialogErrorTemplate info={"获取远程版本失败"} error={e} />
					</DialogContent>
				),
			});
			return "获取失败";
		});
		setRemoteVersion(version);
		remoteVersionRef.current = version;
		setLoading(false);
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
		setLoading(true);
		try {
			pushWaitingDialog({
				title: "同步",
				content: (
					<DialogContent>
						<DialogBarProgressTemplate
							info={"正在同步"}
							event={"onDatabaseProgressUpdated"}
						/>
					</DialogContent>
				),
			});
			(await invoke("pushDatabase")).unwrap();
			(await invoke("pullDatabase")).unwrap();
			setLoading(false);
			closeWaitingDialog();
			pushDialog({
				title: "成功",
				content: (
					<DialogContent className={"min-w-64"}>
						<DialogContentText>同步成功</DialogContentText>
					</DialogContent>
				),
			});
			setTrack(
				(await invoke("getTrack")).unwrap_or_else((e) => {
					pushDialog({
						title: "错误",
						content: (
							<DialogContent>
								<DialogErrorTemplate info={"获取修改记录失败"} error={e} />
							</DialogContent>
						),
					});
					return [];
				}),
			);
			invoke("getDatabaseVersion").then((v) => {
				setLocalVersion(v.unwrap());
				localVersionRef.current = v.unwrap();
			});
		} catch (e) {
			setLoading(false);
			closeWaitingDialog();
			pushDialog({
				title: "错误",
				content: (
					<DialogContent>
						<DialogErrorTemplate info={"同步失败"} error={e} />
					</DialogContent>
				),
			});
		}
	};
	useEffect(() => {
		const init = () => {
			setTrack(null);
			invoke("getTrack").then((data) =>
				setTrack(
					data.unwrap_or_else((e) => {
						pushDialog({
							title: "错误",
							content: (
								<DialogContent className={"min-w-64"}>
									<DialogErrorTemplate info={"获取修改记录失败"} error={e} />
								</DialogContent>
							),
						});
						return [];
					}),
				),
			);
			getRemoteVersion();
			invoke("getDatabaseVersion").then((v) => {
				setLocalVersion(v.unwrap());
				localVersionRef.current = v.unwrap();
			});
		};
		usePageStore.subscribe((state) => {
			if (Pages[state.now].id !== "push") return;
			init();
		});
		init();
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
						loading={loading}
						disabled={loading}
					>
						重新获取远程版本
					</Button>
					<Button onClick={() => doSync()} disabled={loading}>
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
		</div>
	);
}
