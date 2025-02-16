import DocumentItem from "../components/DocumentItem";
import {
	Button,
	Checkbox,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Divider,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	TextField,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import DoneAllOutlinedIcon from "@mui/icons-material/DoneAllOutlined";
import RemoveDoneOutlinedIcon from "@mui/icons-material/RemoveDoneOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { usePageStore } from "../config/PageManager";
import { DocumentInfo, SelectedDocument } from "../types/document";
import { useSelectedStore } from "../config/select";
import classNames from "classnames";
import { calcMoney, formatToString, invoke } from "../utils";
import { useDialogStore } from "../utils/dialog";
import Grid from "@mui/material/Grid2";
import FetchBackDialog from "../components/FetchBackDialog";

const Item = ({
	selected,
	onSelect,
	onChange,
	formColor,
	formDouble,
	formCount,
	info,
}: {
	selected: boolean;
	onSelect?: () => void;
	onChange: (color: boolean, double: boolean, count: number) => void;
	formColor: boolean;
	formDouble: boolean;
	formCount: number;
	info: DocumentInfo;
}) => {
	let yearFormat = "未知年份";
	if (info.date) {
		yearFormat = info.date.year.toString();
		if (info.date.yearType === 0) yearFormat += "年";
		else yearFormat += "级";
	}
	const [color, setColor] = useState(formColor ? 1 : 0);
	const [double, setDouble] = useState(formDouble ? 1 : 0);
	const [count, setCount] = useState(formCount.toString());
	const [countValid, setCountValid] = useState(true);
	useEffect(() => {
		let validate = true;
		const num = Number(count);
		if (isNaN(num) || num < 1) {
			validate = false;
		}
		setCountValid(validate);
		if (onChange) onChange(color === 1, double === 1, validate ? num : -1);
	}, [color, double, count]);
	useEffect(() => {
		setColor(formColor ? 1 : 0);
		setDouble(formDouble ? 1 : 0);
		setCount(formCount.toString());
	}, [formColor, formDouble, formCount]);
	return (
		<div
			className={classNames("mt-2 rounded select-none p-1 flex", {
				"bg-primary bg-opacity-20": selected,
				"bg-white": !selected,
			})}
		>
			<div className={"flex-1"}>
				<div className={"flex items-center"}>
					<Checkbox size={"small"} onClick={onSelect} checked={selected} />
					<div className={"ml-1"}>
						<div className={"text-sm"}>{`${yearFormat} / ${info.name}`}</div>
						<div className={"text-xs"}>
							{info.type === 0 ? "期末" : info.type === 1 ? "期中" : "其他"}{" "}
							<span
								className={classNames({
									"text-error": !info.answer,
									"text-success": info.answer,
								})}
							>
								{info.answer ? "有答案" : "仅试卷"}
							</span>
							{info.identifier.length != 0 && " " + info.identifier}
						</div>
					</div>
				</div>
				<div className={"flex flex-wrap mt-0.5"}>
					{info.filter.map((tag) => (
						<Chip
							key={tag}
							label={tag}
							size={"small"}
							color={"primary"}
							variant={"outlined"}
							className={"m-0.5"}
						/>
					))}
					{info.tags.map((tag) => (
						<Chip
							key={tag}
							label={tag}
							size={"small"}
							color={"success"}
							variant={"outlined"}
							className={"m-0.5"}
						/>
					))}
				</div>
			</div>
			<div className={"flex items-center p-1"}>
				<FormControl variant="standard">
					<InputLabel>单双面</InputLabel>
					<Select
						value={double ? 1 : 0}
						onChange={() => setDouble((v) => 1 - v)}
						size={"small"}
					>
						<MenuItem value={1}>双面</MenuItem>
						<MenuItem value={0}>单面</MenuItem>
					</Select>
				</FormControl>
				<FormControl variant="standard" className={"ml-2"}>
					<InputLabel>颜色</InputLabel>
					<Select
						value={color ? 1 : 0}
						onChange={() => setColor((v) => 1 - v)}
						size={"small"}
					>
						<MenuItem value={1}>彩印</MenuItem>
						<MenuItem value={0}>黑白</MenuItem>
					</Select>
				</FormControl>
				<TextField
					label="份数"
					variant="standard"
					size={"small"}
					className={"w-20 ml-2"}
					value={count}
					error={!countValid}
					onChange={(e) => setCount(e.target.value)}
				/>
			</div>
		</div>
	);
};

export default function Checked() {
	// dialog
	const pushDialog = useDialogStore((state) => state.push);
	const pushWaitingDialog = useDialogStore((state) => state.pushWaitingDialog);
	const closeWaitingDialog = useDialogStore(
		(state) => state.closeWaitingDialog,
	);
	// data
	const [selected, setSelected] = useState<number[]>([]);
	const [allSelected, setAllSelected] = useState<SelectedDocument[]>([]);
	const selectedRef = useRef(selected);
	const allSelectedRef = useRef(allSelected);
	const validateMap = useRef<{ [id: number]: boolean }>({});
	const selectedIndex = useRef<{ [id: number]: number }>({});
	const [money, setMoney] = useState("0.00");
	// 批量编辑
	const [showEditDialog, setShowEditDialog] = useState(false);
	const [applyColor, setApplyColor] = useState(-1);
	const applyColorRef = useRef(applyColor);
	const [applyDouble, setApplyDouble] = useState(-1);
	const applyDoubleRef = useRef(applyDouble);
	const [applyCount, setApplyCount] = useState("1");
	const applyCountRef = useRef(applyCount);
	const [applyCountValid, setApplyCountValid] = useState(true);
	const applyCountValidRef = useRef(applyCountValid);
	// 取回
	const handleFetchBack = async () => {
		const target = [];
		const colorTarget = [];
		for (const id of selected) {
			const item = allSelectedRef.current[selectedIndex.current[id]];
			if (item.color) colorTarget.push(item);
			else target.push(item);
		}
		pushWaitingDialog({ title: "取回", content: <FetchBackDialog /> });
		const result = await invoke("fetchBack", target);
		closeWaitingDialog();
		try {
			await invoke("openFile", result.unwrap());
			await new Promise((resolve) => {
				const callback = (btn: string) => {
					if (btn === "重新打开文件") {
						open(result.unwrap());
						return false;
					}
					resolve("ok");
				};
				pushDialog({
					title: "成功",
					content: (
						<DialogContent>
							<DialogContentText>
								取回成功，请使用<span className={"font-bold"}>黑白</span>
								打印机，选用A4纸张，<span className={"font-bold"}>双面</span>
								打印。
							</DialogContentText>
							{colorTarget.length !== 0 && (
								<DialogContentText>
									注意，取回操作尚未全部完成，点击“下一步”继续取回彩印文件。
								</DialogContentText>
							)}
						</DialogContent>
					),
					buttons: [
						"重新打开文件",
						colorTarget.length === 0 ? "完成" : "下一步",
					],
					callback,
				});
			});
			if (colorTarget.length !== 0) {
				pushWaitingDialog({ title: "取回", content: <FetchBackDialog /> });
				const result = await invoke("fetchBack", colorTarget);
				closeWaitingDialog();
				await invoke("openFile", result.unwrap());
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
								取回成功，请使用<span className={"font-bold"}>彩色</span>
								打印机，选用A4纸张，<span className={"font-bold"}>双面</span>
								打印。
							</DialogContentText>
						</DialogContent>
					),
					buttons: ["重新打开文件", "完成"],
					callback,
				});
			}
		} catch (e) {
			pushDialog({
				title: "错误",
				content: (
					<DialogContent>
						<DialogContentText>取回失败</DialogContentText>
						<div className={"whitespace-break-spaces mt-2"}>
							{formatToString(e)}
						</div>
					</DialogContent>
				),
			});
		}
	};
	useEffect(() => {
		usePageStore.subscribe((state) => {
			if (state.now === 2) {
				validateMap.current = {};
				selectedIndex.current = {};
				const selectedStoreState = useSelectedStore.getState();
				setAllSelected(selectedStoreState.selected);
				setSelected(selectedStoreState.selectedID);
				selectedRef.current = selectedStoreState.selectedID;
				allSelectedRef.current = selectedStoreState.selected;
				for (let i = 0; i < selectedStoreState.selected.length; i++) {
					selectedIndex.current[selectedStoreState.selected[i].document.id] = i;
				}
			} else {
				const newSelected = [];
				for (const item of allSelectedRef.current) {
					if (selectedRef.current.includes(item.document.id)) {
						newSelected.push(item);
					}
				}
				useSelectedStore.setState({
					selected: newSelected,
					selectedID: selectedRef.current,
				});
			}
		});
	}, []);
	useEffect(() => {
		const target = [];
		for (const id of selected) {
			target.push(allSelectedRef.current[selectedIndex.current[id]]);
		}
		setMoney(calcMoney(target));
	}, [selected, allSelected]);
	return (
		<div>
			<div>
				<div className={"flex"}>
					<div>
						<div className={"text-title text-xs"}>当前价格</div>
						<div className={"text-primary mt-1"}>
							<span className={"font-bold text-2xl"}>{money}</span>
							<span className={"ml-1"}>元</span>
						</div>
					</div>
					<Button
						className={"ml-auto self-center"}
						startIcon={<FileDownloadOutlinedIcon />}
						disabled={selected.length === 0}
						onClick={handleFetchBack}
					>
						取回
					</Button>
				</div>
				<div className={"mt-2 flex"}>
					<Button
						startIcon={<DoneAllOutlinedIcon className={"text-xs"} />}
						className={"text-xs"}
						disabled={allSelected.length === 0}
						onClick={() => {
							if (selected.length === allSelected.length) {
								selectedRef.current = [];
							} else {
								const newSelected = [];
								for (const item of allSelected) {
									newSelected.push(item.document.id);
								}
								selectedRef.current = newSelected;
							}
							setSelected(selectedRef.current);
						}}
					>
						全选
					</Button>
					<Button
						size={"small"}
						startIcon={<RemoveDoneOutlinedIcon className={"text-xs"} />}
						className={"mx-2 text-xs"}
						disabled={allSelected.length === 0}
						onClick={() => {
							const newSelected = [];
							for (const item of allSelected) {
								if (selected.includes(item.document.id)) {
									continue;
								}
								newSelected.push(item.document.id);
							}
							selectedRef.current = newSelected;
							setSelected(newSelected);
						}}
					>
						反选
					</Button>
					<Button
						size={"small"}
						startIcon={<EditOutlinedIcon className={"text-xs"} />}
						className={"text-xs"}
						disabled={selected.length === 0}
						onClick={() => {
							setApplyCount("");
							setApplyDouble(-1);
							setApplyColor(-1);
							setApplyCountValid(true);
							applyCountValidRef.current = true;
							applyCountRef.current = "";
							applyColorRef.current = -1;
							applyDoubleRef.current = -1;
							setShowEditDialog(true);
						}}
					>
						批量编辑
					</Button>
				</div>
				{allSelected.map((item) => {
					const id = item.document.id;
					console.log("render", id);
					return (
						<Item
							key={id}
							selected={selected.includes(id)}
							info={item.document.info}
							formColor={item.color}
							formDouble={item.double}
							formCount={item.count}
							onChange={(color, double, count) => {
								validateMap.current[id] = count !== -1;
								allSelectedRef.current[selectedIndex.current[id]].color = color;
								allSelectedRef.current[selectedIndex.current[id]].double =
									double;
								allSelectedRef.current[selectedIndex.current[id]].count =
									count === -1 ? 1 : count;
								setAllSelected([...allSelectedRef.current]);
							}}
							onSelect={() => {
								const index = selectedRef.current.indexOf(id);
								if (index === -1) {
									selectedRef.current.push(id);
								} else {
									selectedRef.current.splice(index, 1);
								}
								setSelected([...selectedRef.current]);
							}}
						/>
					);
				})}
			</div>
			<Dialog open={showEditDialog} fullWidth>
				<DialogTitle>批量编辑</DialogTitle>
				<DialogContent>
					<Grid container spacing={1}>
						<Grid size={4}>
							<FormControl variant="standard" fullWidth>
								<InputLabel>单双面</InputLabel>
								<Select
									value={applyDouble}
									onChange={(e) => {
										applyDoubleRef.current = e.target.value as number;
										setApplyDouble(applyDoubleRef.current);
									}}
									size={"small"}
								>
									<MenuItem value={-1}>不更改</MenuItem>
									<MenuItem value={1}>双面</MenuItem>
									<MenuItem value={0}>单面</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid size={4}>
							<FormControl variant="standard" fullWidth>
								<InputLabel>颜色</InputLabel>
								<Select
									value={applyColor}
									onChange={(e) => {
										applyColorRef.current = e.target.value as number;
										setApplyColor(applyColorRef.current);
									}}
									size={"small"}
								>
									<MenuItem value={-1}>不更改</MenuItem>
									<MenuItem value={1}>彩印</MenuItem>
									<MenuItem value={0}>黑白</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid size={4}>
							<TextField
								fullWidth
								label="份数"
								variant="standard"
								size={"small"}
								value={applyCount}
								error={!applyCountValid}
								onChange={(e) => {
									const str = e.target.value;
									applyCountRef.current = str;
									setApplyCount(str);
									if (str.length === 0) {
										applyCountValidRef.current = true;
									} else {
										const num = Number(e.target.value);
										if (isNaN(num) || num < 1) {
											applyCountValidRef.current = false;
										} else {
											applyCountValidRef.current = true;
										}
									}
									setApplyCountValid(applyCountValidRef.current);
								}}
							/>
						</Grid>
					</Grid>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShowEditDialog(false)}>取消</Button>
					<Button
						onClick={() => {
							if (!applyCountValidRef.current) return;
							for (const id of selectedRef.current) {
								const index = selectedIndex.current[id];
								if (applyDoubleRef.current !== -1) {
									allSelectedRef.current[index].double =
										applyDoubleRef.current === 1;
								}
								if (applyColorRef.current !== -1) {
									allSelectedRef.current[index].color =
										applyColorRef.current === 1;
								}
								if (applyCountRef.current.length !== 0) {
									allSelectedRef.current[index].count = Number(
										applyCountRef.current,
									);
								}
							}
							setAllSelected([...allSelectedRef.current]);
							setShowEditDialog(false);
						}}
					>
						应用
					</Button>
				</DialogActions>
			</Dialog>
		</div>
	);
}
