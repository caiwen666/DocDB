import {
	Button,
	ButtonBase,
	Checkbox,
	Chip,
	CircularProgress,
	DialogContent,
	DialogContentText,
	Divider,
	FormControlLabel,
	IconButton,
	Stack,
	TextField,
} from "@mui/material";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import {
	ChangeEvent,
	MouseEventHandler,
	useEffect,
	useRef,
	useState,
} from "react";
import PlagiarismOutlinedIcon from "@mui/icons-material/PlagiarismOutlined";
import _ from "lodash";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Document, SelectedDocument } from "../../shared/types/document";
import { getPageContainer } from "../utils";
import { invoke, subscribe, unsubscribe } from "../api";
import { useDialogStore } from "../stores/dialog";
import DialogErrorTemplate from "../components/dialog/DialogErrorTemplate";
import { useSelectedStore } from "../stores/select";
import { calcMoney, clone, formatToString } from "../../shared/utils";
import DocumentForm from "../components/DocumentForm";
import DialogProgressTemplate from "../components/dialog/DialogCircleProgressTemplate";
import DialogBarProgressTemplate from "../components/dialog/DialogBarProgressTemplate";
import classNames from "classnames";
import DocumentItem from "../components/DocumentItem";
import { ExportedCallback } from "../../shared/api";
import { useDatabaseStore } from "../stores/database";

const ItemList = ({
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
}) => {
	const pushDialog = useDialogStore((state) => state.push);
	const pushWaitingDialog = useDialogStore((state) => state.pushWaitingDialog);
	const closeWaitingDialog = useDialogStore(
		(state) => state.closeWaitingDialog,
	);
	const selectedStore = useSelectedStore();
	const selfRef = useRef<HTMLDivElement>(null);
	const itemRefs = useRef<HTMLDivElement[]>([]);
	// 闭包中可能无法获得prompt的最新状态，这里要搞一下
	const listRef = useRef<Document[]>([]);
	useEffect(() => {
		listRef.current = list;
	}, [list]);
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
			if (operation === "编辑" || operation === "删除") {
				const databaseStore = useDatabaseStore.getState();
				if (databaseStore.now !== databaseStore.latest) {
					pushDialog({
						title: "错误",
						content: (
							<DialogContent>
								<DialogContentText>
									本地数据库不是最新版本，请先同步数据库。
								</DialogContentText>
							</DialogContent>
						),
					});
					return;
				}
			}
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
					// 最好先克隆一下防止更新
					const formClone = clone(form);
					if (formClone.date && formClone.date.year === -1)
						formClone.date = undefined;
					(
						await invoke("updateDocument", target[0].id, formClone)
					).unwrap_or_else((e) => {
						pushDialog({
							title: "错误",
							content: (
								<DialogContent>
									<DialogErrorTemplate
										info={"更新试卷信息时发生错误"}
										error={e}
									/>
								</DialogContent>
							),
						});
					});
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
								<DialogProgressTemplate info={"正在删除试卷..."} />
							</DialogContent>
						),
					});
					for (const item of target) {
						const result = await invoke("deleteDocument", item.id);
						if (!result.isOk()) {
							await new Promise((resolve) => {
								pushDialog({
									title: "错误",
									content: (
										<DialogContent>
											<DialogErrorTemplate
												info={"删除试卷时发生错误"}
												error={result.getError()}
											/>
										</DialogContent>
									),
									buttons: ["确定"],
									callback: resolve,
								});
							});
						}
						// 既然文件已经被删完了，那么我们就取消勾选
						selectedStore.remove(item.id);
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
						content: (
							<DialogContent>
								<DialogBarProgressTemplate
									event={"onFetchBackProgressUpdated"}
									info={"正在取回"}
								/>
							</DialogContent>
						),
					});
					const result = await invoke("fetchBack", selected);
					closeWaitingDialog();
					if (result.isOk()) {
						const callback = (btn: string) => {
							if (btn === "重新打开文件") {
								open(result.unwrap());
								return false;
							}
							if (btn === "打开文件夹") {
								invoke("openTempDir");
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
							buttons: ["打开文件夹", "重新打开文件", "完成"],
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
				for (const item of listRef.current) {
					if (state.selectedID.includes(item.id)) {
						selectedCount++;
					}
				}
				console.log(listRef.current);
				if (selectedCount === listRef.current.length) {
					// 全选了就全都不选
					listRef.current.forEach((item) => selectedStore.remove(item.id));
				} else {
					// 把没选上的选上
					listRef.current.forEach((item) => {
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
		for (const item of listRef.current) {
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
						id={item.id}
					/>
				);
			})}
		</div>
	);
};

export default function Search() {
	// dialog
	const pushDialog = useDialogStore((state) => state.push);
	// selection
	const containerRef = useRef<HTMLDivElement>(null);
	const [showSelection, setShowSelection] = useState(false);
	const showSelectionRef = useRef(false);
	const selectionRef = useRef<HTMLDivElement>(null);
	const isClickRef = useRef(false);
	const startX = useRef(0);
	const startY = useRef(0);
	const mouseClientX = useRef(0);
	const mouseClientY = useRef(0);
	const [selectionL, setSelectionL] = useState(0);
	const [selectionR, setSelectionR] = useState(0);
	const onMouseDown: MouseEventHandler<HTMLDivElement> = (e) => {
		if (e.buttons !== 1) return;
		isClickRef.current = true;
	};
	const updateSelection = () => {
		const selection = selectionRef.current;
		const rect = containerRef.current.getBoundingClientRect();
		if (selection) {
			let nowX: number, nowY: number;
			if (mouseClientX.current < rect.left) nowX = rect.left;
			else if (mouseClientX.current > rect.right) nowX = rect.right;
			else nowX = mouseClientX.current;
			if (mouseClientY.current < rect.top) nowY = rect.top;
			else if (mouseClientY.current > rect.bottom) nowY = rect.bottom;
			else nowY = mouseClientY.current;
			nowX -= rect.left;
			nowY -= rect.top;
			selection.style.left = Math.min(startX.current, nowX) + "px";
			selection.style.top = Math.min(startY.current, nowY) + "px";
			selection.style.width = Math.abs(nowX - startX.current) + "px";
			selection.style.height = Math.abs(nowY - startY.current) + "px";
			_.throttle(() => {
				const l = Math.min(startY.current, nowY);
				const r = l + Math.abs(nowY - startY.current);
				setSelectionL(l);
				setSelectionR(r);
			}, 100)();
		}
	};
	useEffect(() => {
		const onMouseMove = (e: MouseEvent) => {
			if (isClickRef.current) {
				setShowSelection(true);
				showSelectionRef.current = true;
				const rect = containerRef.current.getBoundingClientRect();
				startX.current = e.clientX - rect.left;
				startY.current = e.clientY - rect.top;
				isClickRef.current = false;
			}
			if (showSelectionRef.current) {
				if (e.buttons === 0) {
					setShowSelection(false);
					showSelectionRef.current = false;
					return;
				}
				mouseClientX.current = e.clientX;
				mouseClientY.current = e.clientY;
				updateSelection();
			}
		};
		const onMouseUp = (e: MouseEvent) => {
			if (showSelectionRef.current) {
				setShowSelection(false);
				showSelectionRef.current = false;
			}
		};
		const onScroll = () => {
			if (showSelectionRef.current) {
				updateSelection();
			}
		};
		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
		const parent = getPageContainer(containerRef.current);
		if (parent) parent.addEventListener("scroll", onScroll);
		return () => {
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
			if (parent) parent.removeEventListener("scroll", onScroll);
		};
	}, []);
	// ui
	// loading
	const [loading, setLoading] = useState(false);
	const loadingRef = useRef(false);
	// type
	const [type, setType] = useState<number[]>([0, 1, 2]);
	const typeRef = useRef<number[]>([0, 1, 2]);
	// keyword
	const [keyword, setKeyword] = useState("");
	const keywordRef = useRef("");
	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		keywordRef.current = value;
		setKeyword(value);
		handleSearch();
	};
	// search data
	const [time, setTime] = useState(0); // 搜索耗时
	const [data, setData] = useState<Document[]>([]); // 显示的数据
	const allDataRef = useRef<Document[]>([]); // 实际上所有关键词命中的数据
	interface Tag {
		tag: string;
		show: boolean; // 是否显示，选中试卷类型和试卷名称之后部分标签可能会被隐藏
		chosen: boolean; // 是否被选中
	}
	const [tagList, setTagList] = useState<Tag[]>([]);
	const tagListRef = useRef<Tag[]>([]);
	interface Name {
		// 课程名称
		name: string;
		show: boolean;
		chosen: boolean; // 是否被选中
	}
	const [nameList, setNameList] = useState<Name[]>([]);
	const nameListRef = useRef<Name[]>([]);
	// nameList, tag, keyword 相当于一组搜索状态
	const filterData = (calcTime = true) => {
		const startTime = new Date().getTime();
		// 当前选中的名称。选中不一定显示
		const chosenNames = nameListRef.current
			.filter((item) => item.chosen)
			.map((item) => item.name);
		// 设置显示状态
		const showNames: string[] = [];
		const showTags: string[] = [];
		for (const doc of allDataRef.current) {
			if (!typeRef.current.includes(doc.info.type)) continue; // 类型不匹配，名称和标签都不显示
			if (!showNames.includes(doc.info.name)) showNames.push(doc.info.name);
			if (!chosenNames.includes(doc.info.name)) continue; // 没选上名称，标签不显示
			for (const tag of doc.info.filter) {
				if (!showTags.includes(tag)) showTags.push(tag);
			}
		}
		nameListRef.current.forEach((item) => {
			item.show = showNames.includes(item.name);
		});
		tagListRef.current.forEach((item) => {
			item.show = showTags.includes(item.tag);
		});
		setNameList(nameListRef.current);
		setTagList(tagListRef.current);
		// 筛出当前已经选中的tag
		const chosenTags = tagListRef.current
			.filter((item) => item.show && item.chosen)
			.map((item) => item.tag);
		const result = allDataRef.current.filter((item) => {
			if (!typeRef.current.includes(item.info.type)) return false; // 类型不匹配
			if (!chosenNames.includes(item.info.name)) return false; // 课程名称未选中
			if (
				_.intersection(chosenTags, item.info.filter).length ===
				item.info.filter.length
			)
				// 需要所有标签都被选中
				return true;
			return false;
		});
		setData(result);
		if (calcTime) {
			const endTime = new Date().getTime();
			setTime(endTime - startTime);
		}
	};
	const handleSearch = (refresh = true) => {
		setLoading(true);
		loadingRef.current = true;
		_.debounce(async () => {
			if (keywordRef.current.length !== 0) {
				const startTime = new Date().getTime();
				const result = (
					await invoke("searchDocument", keywordRef.current)
				).unwrap_or_else((e) => {
					pushDialog({
						title: "错误",
						content: (
							<DialogContent>
								<DialogErrorTemplate info={"搜索时发生错误"} error={e} />
							</DialogContent>
						),
					});
					return [];
				});
				// 准备名称列表
				const allNames: string[] = [];
				for (const doc of result) {
					if (!allNames.includes(doc.info.name)) {
						allNames.push(doc.info.name);
					}
				}
				const remainNames: Name[] = allNames.map((name) => {
					// 刷新的话都不选中
					if (refresh) return { name, show: false, chosen: false };
					// 如果之前选中了，就保持选中
					const before = nameListRef.current.find((i) => i.name === name);
					if (before) return { name, show: false, chosen: before.chosen };
					// 如果之前没有，就是新的，不选中
					return { name, show: false, chosen: false };
				});
				// 准备标签，名称列表交给 filterData 处理
				const allTags: string[] = [];
				for (const doc of result) {
					for (const item of doc.info.filter) {
						if (!allTags.includes(item)) {
							allTags.push(item);
						}
					}
				}
				const remainTags: Tag[] = allTags.map((tag) => {
					// 刷新的话都不选中
					if (refresh) return { tag, show: false, chosen: false };
					// 如果之前选中了，就保持选中
					const before = tagListRef.current.find((i) => i.tag === tag);
					if (before) return { tag, show: false, chosen: before.chosen };
					// 如果之前没有，就是新的，不选中
					return { tag, show: false, chosen: false };
				});
				// 准备数据
				allDataRef.current = result;
				// taglist和namelist 先不提交，由 filterData 来设置是否显示
				tagListRef.current = remainTags;
				nameListRef.current = remainNames;
				// 基于搜索状态过滤数据
				filterData(false);
				// 计算耗时
				const endTime = new Date().getTime();
				setTime(endTime - startTime);
			} else {
				setData([]);
				setNameList([]);
				setTagList([]);
			}
			setLoading(false);
			loadingRef.current = false;
		}, 500)();
	};
	return (
		<div
			className={"relative selection-container outline-none cursor-default"}
			style={{ minHeight: "calc(100vh - 90px)" }}
			ref={containerRef}
			onMouseDown={onMouseDown}
			contentEditable={true}
		>
			<div className={"min-h-full"} contentEditable={false}>
				{showSelection && (
					<div
						ref={selectionRef}
						className={"absolute border-primary bg-primary bg-opacity-30 z-40"}
					></div>
				)}
				<div className={"min-h-full"}>
					<div className={"min-h-full mr-64"}>
						{loading && (
							<div className={"text-8xl text-title py-16 text-center"}>
								<CircularProgress size={"32px"}></CircularProgress>
							</div>
						)}
						{!loading && keyword.length === 0 && (
							<div className={"text-8xl text-title py-16 text-center"}>
								<PlagiarismOutlinedIcon
									fontSize={"inherit"}
								></PlagiarismOutlinedIcon>
								<div className={"text-sm text-center mt-2 select-none"}>
									输入关键字以搜索
								</div>
							</div>
						)}
						{!loading && keyword.length > 0 && data.length === 0 && (
							<div className={"text-8xl text-title py-16 text-center"}>
								<InfoOutlinedIcon fontSize={"inherit"}></InfoOutlinedIcon>
								<div className={"text-sm text-center mt-2 select-none"}>
									没有找到相关试卷
								</div>
							</div>
						)}
						{!loading && keyword.length > 0 && data.length !== 0 && (
							<>
								<div className={"text-title text-xs pt-1 select-none"}>
									命中 {data.length} 条，耗时 {time} ms
								</div>
								<ItemList
									list={data}
									className={"pr-2 pb-3"}
									hasSelection={showSelection}
									selectionL={selectionL}
									selectionR={selectionR}
									onRefresh={() => handleSearch(false)}
								></ItemList>
							</>
						)}
					</div>
					<div
						className={
							"bg-white fixed w-64 rounded right-3 top-12 overflow-y-auto py-2 select-none side-area"
						}
						style={{ maxHeight: "calc(100% - 90px)" }}
						onMouseDown={(e) => e.stopPropagation()}
					>
						<div className={"flex items-center ml-2 mr-1"}>
							<TextField
								className={"flex-1"}
								label="搜索"
								size="small"
								variant="standard"
								value={keyword}
								onChange={handleChange}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleSearch();
									}
								}}
							/>
							<IconButton onClick={() => handleSearch()}>
								<SearchOutlinedIcon />
							</IconButton>
						</div>
						<Stack spacing={1} direction={"row"} className={"ml-1 mt-1"}>
							{["期末", "期中", "其他"].map((item, index) => (
								<FormControlLabel
									key={item}
									control={
										<Checkbox checked={type.includes(index)} size={"small"} />
									}
									label={<div className={"text-sm"}>{item}</div>}
									onClick={(e) => {
										e.preventDefault();
										if (type.includes(index)) {
											typeRef.current = type.filter((item) => item !== index);
										} else {
											typeRef.current.push(index);
										}
										setType([...typeRef.current]);
										if (!loadingRef.current) filterData();
									}}
								/>
							))}
						</Stack>
						{nameList.filter((name) => name.show).length !== 0 && (
							<>
								<Divider className={"mt-1"} />
								{nameList.map((item, index) => (
									<ButtonBase
										component={"div"}
										className={classNames(
											"block px-3 py-1.5 text-sm transition-all text-title",
											{
												"bg-black bg-opacity-0 hover:bg-opacity-20":
													!item.chosen,
												"bg-primary bg-opacity-20 hover:bg-opacity-40":
													item.chosen,
												hidden: !item.show,
											},
										)}
										key={item.name}
										onClick={() => {
											nameListRef.current[index].chosen = !item.chosen;
											setNameList([...nameListRef.current]);
											filterData();
										}}
									>
										{item.name}
									</ButtonBase>
								))}
							</>
						)}
						{tagList.filter((tag) => tag.show).length !== 0 && (
							<>
								<Divider className={"mt-1"} />
								<div className={"flex flex-wrap m-1 z-50"}>
									{tagList.map((item, index) => (
										<Chip
											key={item.tag}
											label={item.tag}
											color={item.chosen ? "primary" : "default"}
											variant="outlined"
											size={"small"}
											className={classNames("m-1", {
												hidden: !item.show,
											})}
											onClick={() => {
												tagListRef.current[index].chosen = !item.chosen;
												setTagList([...tagListRef.current]);
												filterData();
											}}
										/>
									))}
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
