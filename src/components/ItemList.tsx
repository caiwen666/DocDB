import classNames from "classnames";
import DocumentItem from "./DocumentItem";
import { MouseEventHandler, useEffect, useRef, useState } from "react";
import { Document, SelectedDocument } from "../types/document";
import { useSelectedStore } from "../config/select";
import { calcMoney, formatToString, invoke } from "../utils";
import { useDialogStore } from "../utils/dialog";
import DocumentForm from "./DocumentForm";
import { ExportedCallback } from "../api/config";
import { subscribe, unsubscribe } from "../config/callback";
import { DialogContent, DialogContentText } from "@mui/material";
import ProgressTemplate from "./ProgressTemplate";
import FetchBackDialog from "./FetchBackDialog";

export default function ItemList({
	className,
	hasSelection,
	selectionL,
	selectionR,
	list,
	onRefresh,
}: {
	className: string;
	hasSelection: boolean;
	selectionL: number;
	selectionR: number;
	list: Document[];
	onRefresh: () => void;
}) {
	const pushDialog = useDialogStore((state) => state.push);
	const pushWaitingDialog = useDialogStore((state) => state.pushWaitingDialog);
	const closeWaitingDialog = useDialogStore(
		(state) => state.closeWaitingDialog,
	);
	const selectedStore = useSelectedStore();
	const selfRef = useRef<HTMLDivElement>(null);
	const itemRefs = useRef<HTMLDivElement[]>([]);
	const toggleItem = (index: number) => {
		const id = list[index].id;
		const state = useSelectedStore.getState();
		if (state.selectedID.includes(id)) {
			selectedStore.remove(id);
		} else {
			selectedStore.add(list[index]);
		}
	};
	const open = async (target: string | number) => {
		const promise =
			typeof target === "number"
				? invoke("openDocument", target)
				: invoke("openFile", target);
		promise.then((res) =>
			res.unwrap_or_else((e) => {
				pushDialog({
					title: "错误",
					content: (
						<DialogContent>
							<DialogContentText>打开文件失败</DialogContentText>
							<div className={"whitespace-break-spaces mt-2"}>
								{formatToString(e)}
							</div>
						</DialogContent>
					),
				});
			}),
		);
	};
	const handleMenuCallback: ExportedCallback["onMenuCallback"] = (
		target,
		operation,
	) => {
		//console.log("onMenuCallback", target, operation);
		const handle = async () => {
			if (operation === "编辑") {
				let form = target[0].info;
				let isValidate = false;
				const op = await new Promise((resolve) => {
					const callback = (btn: string) => {
						if (btn === "确定") {
							if (isValidate) {
								resolve("确定");
							} else {
								return false;
							}
						} else {
							resolve("取消");
						}
					};
					pushDialog({
						title: "编辑试卷信息",
						content: (
							<DialogContent>
								<DocumentForm
									form={form}
									onChange={(v) => (form = v)}
									onValid={(v) => (isValidate = v)}
								/>
							</DialogContent>
						),
						buttons: ["取消", "确定"],
						callback,
					});
				});
				if (op === "确定") {
					await window.api.updateDocument(target[0].id, form);
					onRefresh();
				}
			}
			if (operation === "删除") {
				const op = await new Promise((resolve) => {
					pushDialog({
						title: "删除试卷",
						content: (
							<DialogContent>
								<DialogContentText>
									确定要删除这
									<span className={"font-bold"}>{target.length}</span>
									份试卷吗？该操作不可逆。
								</DialogContentText>
							</DialogContent>
						),
						buttons: ["取消", "确定"],
						callback: resolve,
					});
				});
				if (op === "确定") {
					pushWaitingDialog({
						title: "删除中",
						content: (
							<DialogContent>
								<ProgressTemplate info={"正在删除试卷..."} />
							</DialogContent>
						),
					});
					for (const item of target) {
						await window.api.deleteDocument(item.id);
					}
					onRefresh();
					closeWaitingDialog();
				}
			}
			if (operation === "简单取回") {
				const selected = target.map((item): SelectedDocument => {
					return { color: false, double: true, count: 1, document: item };
				});
				const op = await new Promise((resolve) => {
					pushDialog({
						title: "简单取回",
						content: (
							<DialogContent>
								<DialogContentText>
									将以黑白双面，每个一份，A4的规格取回文件，共计：
								</DialogContentText>
								<div className={"text-primary mt-1"}>
									<span className={"font-bold text-3xl"}>
										{calcMoney(selected)}
									</span>
									<span className={"ml-1"}>元</span>
								</div>
							</DialogContent>
						),
						buttons: ["取消", "继续"],
						callback: resolve,
					});
				});
				if (op === "继续") {
					pushWaitingDialog({
						title: "简单取回",
						content: <FetchBackDialog />,
					});
					const result = await invoke("fetchBack", selected);
					closeWaitingDialog();
					if (result.isOk()) {
						const callback = (btn: string) => {
							if (btn === "重新打开文件") {
								open(result.unwrap());
								return false;
							}
						};
						pushDialog({
							title: "成功",
							content: (
								<DialogContent>
									<DialogContentText>
										取回成功，请使用黑白打印机，选用A4纸张，双面打印。
									</DialogContentText>
								</DialogContent>
							),
							buttons: ["重新打开文件", "完成"],
							callback,
						});
						open(result.unwrap());
					} else {
						pushDialog({
							title: "错误",
							content: (
								<DialogContent>
									<DialogContentText>取回失败</DialogContentText>
									<div className={"whitespace-break-spaces mt-2"}>
										{formatToString(result.getError())}
									</div>
								</DialogContent>
							),
						});
					}
				}
			}
		};
		handle();
	};
	useEffect(() => {
		const container = selfRef.current.closest(".selection-container");
		const onKeyDown = (e: KeyboardEvent) => {
			// 判断是否来自与右侧的区域
			const target = (e.target as HTMLElement).closest(".side-area");
			if (target) return;
			if (e.ctrlKey && e.key === "a") {
				e.preventDefault();
				const state = useSelectedStore.getState();
				// 判断是否全选
				let selectedCount = 0;
				for (const item of list) {
					if (state.selectedID.includes(item.id)) {
						selectedCount++;
					}
				}
				if (selectedCount === list.length) {
					// 全选了就全都不选
					list.forEach((item) => selectedStore.remove(item.id));
				} else {
					// 把没选上的选上
					list.forEach((item) => {
						if (!state.selectedID.includes(item.id)) {
							selectedStore.add(item);
						}
					});
				}
			}
		};
		container.addEventListener("keydown", onKeyDown);
		const f = subscribe("onMenuCallback", handleMenuCallback);
		return () => {
			container.removeEventListener("keydown", onKeyDown);
			unsubscribe("onMenuCallback", f);
		};
	}, []);
	useEffect(() => {
		if (selfRef.current && hasSelection) {
			const state = useSelectedStore.getState();
			// 先全都不选
			list.forEach((item) => {
				if (state.selectedID.includes(item.id)) {
					selectedStore.remove(item.id);
				}
			});
			const container = selfRef.current.closest(".selection-container");
			const rect = container.getBoundingClientRect();
			for (let i = 0; i < itemRefs.current.length; i++) {
				if (itemRefs.current[i]) {
					const itemRect = itemRefs.current[i].getBoundingClientRect();
					const offsetTop = itemRect.top - rect.top;
					const offsetBottom = itemRect.bottom - rect.top;
					const offsetMiddle = (offsetTop + offsetBottom) / 2;
					if (offsetMiddle > selectionL && offsetMiddle < selectionR) {
						// 把选中的加入
						selectedStore.add(list[i]);
					}
				}
			}
		}
	}, [selectionL, selectionR]);
	const handleContextMenu: MouseEventHandler = (event) => {
		event.preventDefault();
		const target: Document[] = [];
		// 获取当前搜索结果中选中的
		const state = useSelectedStore.getState();
		for (const item of list) {
			if (state.selectedID.includes(item.id)) {
				target.push(item);
			}
		}
		invoke("popMenu", target, true);
	};
	return (
		<div
			className={classNames(className, "relative")}
			ref={selfRef}
			onContextMenu={handleContextMenu}
		>
			{list.map((item, index) => {
				return (
					<DocumentItem
						info={item.info}
						onSelect={() => {
							toggleItem(index);
						}}
						key={item.id}
						selected={selectedStore.selectedID.includes(item.id)}
						ref={(el) => {
							itemRefs.current[index] = el;
						}}
						onDoubleClick={() => open(item.id)}
					/>
				);
			})}
		</div>
	);
}
