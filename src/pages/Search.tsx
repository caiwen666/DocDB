import {
	Checkbox,
	Chip,
	CircularProgress,
	Divider,
	FormControlLabel,
	IconButton,
	Stack,
	TextField,
} from "@mui/material";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ItemList from "../components/ItemList";
import {
	ChangeEvent,
	MouseEventHandler,
	useEffect,
	useRef,
	useState,
} from "react";
import { getPageContainer } from "../utils";
import PlagiarismOutlinedIcon from "@mui/icons-material/PlagiarismOutlined";
import _ from "lodash";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Document } from "../types/document";

export default function Search() {
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
	const [time, setTime] = useState(0);
	const [data, setData] = useState<Document[]>([]);
	const allDataRef = useRef<Document[]>([]);
	const [allTag, setAllTag] = useState<string[]>([]);
	const allTagRef = useRef<string[]>([]);
	const [tag, setTag] = useState<string[]>([]);
	const tagRef = useRef<string[]>([]);
	const filterData = (calcTime = true) => {
		const startTime = new Date().getTime();
		const result = allDataRef.current.filter((item) => {
			if (!typeRef.current.includes(item.info.type)) return false;
			if (
				_.intersection(tagRef.current, item.info.filter).length ===
				item.info.filter.length
			)
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
		setAllTag([]);
		_.debounce(async () => {
			if (keywordRef.current.length !== 0) {
				const startTime = new Date().getTime();
				const result = await window.api.searchDocument(keywordRef.current);
				// 准备标签
				const filterTags: string[] = [];
				for (const doc of result) {
					for (const item of doc.info.filter) {
						if (!filterTags.includes(item)) {
							filterTags.push(item);
						}
					}
				}
				// 如果不刷新的话，保持之前的选择状态
				if (!refresh) {
					const chosenTags: string[] = [];
					filterTags.forEach((tag) => {
						// 现在没有，原来有，直接抛弃
						if (!allTagRef.current.includes(tag)) chosenTags.push(tag); //原来没有，现在有，选上
						if (tagRef.current.includes(tag)) chosenTags.push(tag); //现在和原来都有，原来选了就选
					});
					setTag(chosenTags);
					tagRef.current = chosenTags;
				} else {
					setTag(filterTags);
					tagRef.current = filterTags;
				}
				setAllTag(filterTags);
				allTagRef.current = filterTags;
				// 准备数据
				allDataRef.current = result;
				// 初筛
				filterData(false);
				// 计算耗时
				const endTime = new Date().getTime();
				setTime(endTime - startTime);
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
						{allTag.length !== 0 && (
							<>
								<Divider className={"mt-1"} />
								<div className={"flex flex-wrap m-1 z-50"}>
									{allTag.map((item) => (
										<Chip
											key={item}
											label={item}
											color={tag.includes(item) ? "primary" : "default"}
											variant="outlined"
											size={"small"}
											className={"m-1"}
											onClick={() => {
												if (tagRef.current.includes(item)) {
													tagRef.current = tagRef.current.filter(
														(tag) => tag !== item,
													);
												} else {
													tagRef.current.push(item);
												}
												setTag([...tagRef.current]);
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
