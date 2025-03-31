import React, { useEffect, useState } from "react";
import AltRouteOutlinedIcon from "@mui/icons-material/AltRouteOutlined";
import {
	Button, DialogContent,
} from "@mui/material";
import { Pages, usePageStore } from "../stores/page";
import { invoke } from "../api";
import { useDatabaseStore } from "../stores/database";
import { useDialogStore } from "../stores/dialog";
import DialogErrorTemplate from "../components/dialog/DialogErrorTemplate";
import DialogBarProgressTemplate from "../components/dialog/DialogBarProgressTemplate";

export default function Setting() {
	const databaseStore = useDatabaseStore();
	const pushDialog = useDialogStore((state) => state.push);
	const pushWaitingDialog = useDialogStore((state) => state.pushWaitingDialog);
	const closeWaitingDialog = useDialogStore((state) => state.closeWaitingDialog);
	const [loadingTarget, setLoadingTarget] = useState("");
	const checkUpdate = async () => {
		setLoadingTarget("version");
		const res = await invoke("checkDatabaseLatest");
		if(!res.isOk()){
			pushDialog({
				title: "错误",
				content: <DialogContent><DialogErrorTemplate info={"检查版本失败"} error={res.getError()}/></DialogContent>
			})
		}
		setLoadingTarget("");
	}
	const pullDatabase = async () => {
		pushWaitingDialog({
			title: "更新中",
			content: <DialogContent><DialogBarProgressTemplate info={"正在更新数据库"} event={"onPullProgressUpdated"}/></DialogContent>,
		});
		const res = await invoke("pullDatabase");
		closeWaitingDialog();
		if(!res.isOk()){
			pushDialog({
				title: "错误",
				content: <DialogContent><DialogErrorTemplate info={"更新数据库失败"} error={res.getError()}/></DialogContent>
			})
		}else{
			pushDialog({
				title: "成功",
				content: <DialogContent>更新数据库成功</DialogContent>
			});
			await invoke("checkDatabaseLatest");
		}
	}
	useEffect(() => {
		usePageStore.subscribe((state) => {
			if (Pages[state.now].id !== "setting") return;
			invoke("checkDatabaseLatest");
		});
		invoke("checkDatabaseLatest");
	}, []);
	return (
		<div>
			<div className={"rounded p-2 bg-white flex items-center"}>
				<AltRouteOutlinedIcon className={"text-primary"} fontSize={"large"} />
				<div className={"ml-2"}>
					<div className={"text-sm"}>版本管理</div>
					{databaseStore.latest === databaseStore.now ? (
						<div className={"text-xs text-title"}>已为最新版本</div>
					):(<div className={"text-xs text-title"}>本地版本落后远程版本{databaseStore.latest - databaseStore.now}个操作</div>)}
				</div>
				<div className={"ml-auto"}>
					<Button disabled={loadingTarget === "version"} loading={loadingTarget === "version"} onClick={checkUpdate}>
						检查版本
					</Button>
					<Button onClick={pullDatabase}>
						更新
					</Button>
				</div>
			</div>
		</div>
	);
}
