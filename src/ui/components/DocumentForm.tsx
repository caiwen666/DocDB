import { DocumentInfo } from "../../shared/types/document";
import { useEffect, useRef, useState } from "react";
import Grid from "@mui/material/Grid2";
import {
	Button,
	Checkbox,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	FormControlLabel,
	InputLabel,
	MenuItem,
	Radio,
	RadioGroup,
	Select,
	TextField,
} from "@mui/material";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";

export default function DocumentForm({
	form,
	onChange,
	onValid,
	className = "",
}: {
	form: DocumentInfo;
	onChange: (form: DocumentInfo) => void;
	onValid: (v: boolean) => void;
	className?: string;
}) {
	interface Tag {
		name: string;
		filter: boolean;
	}

	if (form.date === undefined) form.date = { year: -1, yearType: 0 };
	const initTags: Tag[] = [];
	for (const tag of form.filter) {
		initTags.push({ name: tag, filter: true });
	}
	for (const tag of form.tags) {
		initTags.push({ name: tag, filter: false });
	}
	//main form
	const formRef = useRef(form);
	const [name, setName] = useState(form.name);
	const [tags, setTags] = useState<Tag[]>(initTags);
	const [type, setType] = useState(form.type);
	const [yearType, setYearType] = useState(form.date.yearType);
	const [year, setYear] = useState(
		form.date.year == -1 ? "" : form.date.year.toString(),
	);
	const [identifier, setIdentifier] = useState(form.identifier);
	const [answer, setAnswer] = useState(form.answer);
	//add tag form
	const [addTagDialog, setAddTagDialog] = useState(false);
	const [tagType, setTagType] = useState(0);
	const tagTypeRef = useRef(0);
	const [tagName, setTagName] = useState("");
	const [tagRepeated, setTagRepeated] = useState(false);
	const tagNameRef = useRef("");
	const handleAddTag = () => {
		if (tagNameRef.current.length === 0) return;
		if (tags.find((tag) => tag.name === tagNameRef.current)) {
			setTagRepeated(true);
			return;
		}
		setTags([
			...tags,
			{ name: tagNameRef.current, filter: tagTypeRef.current === 0 },
		]);
		if (tagTypeRef.current === 0) {
			formRef.current.filter.push(tagNameRef.current);
		} else {
			formRef.current.tags.push(tagNameRef.current);
		}
		setAddTagDialog(false);
		onChange(formRef.current);
	};
	const handleDeleteTag = (tag: Tag) => {
		setTags(tags.filter((t) => t.name !== tag.name));
		if (tag.filter) {
			formRef.current.filter = formRef.current.filter.filter(
				(f) => f !== tag.name,
			);
		} else {
			formRef.current.tags = formRef.current.tags.filter((t) => t !== tag.name);
		}
		onChange(formRef.current);
	};
	//validate
	const [yearError, setYearError] = useState(false);
	const [nameError, setNameError] = useState(false);
	useEffect(() => {
		//validate year
		let yearOk = true;
		let yearNum;
		if (year.length === 0) {
			yearNum = -1;
		} else {
			yearNum = Number(year);
			if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
				yearOk = false;
			}
		}
		//validate name
		let nameOk = true;
		if (name.length === 0) {
			nameOk = false;
		}

		setNameError(!nameOk);
		setYearError(!yearOk);
		if (nameOk) formRef.current.name = name;
		if (yearOk) formRef.current.date.year = yearNum;
		onValid(nameOk && yearOk);
		if (nameOk && yearOk) onChange(formRef.current);
	}, [name, year]);
	useEffect(() => {
		formRef.current.type = type;
		formRef.current.date.yearType = yearType;
		formRef.current.identifier = identifier;
		formRef.current.answer = answer;
		onChange(formRef.current);
	}, [type, yearType, identifier, answer]);
	return (
		<div className={className}>
			<Grid container spacing={1}>
				<Grid size={9}>
					<TextField
						label="课程名称"
						error={nameError}
						variant="filled"
						size={"small"}
						value={name}
						onChange={(e) => {
							setName(e.target.value);
						}}
						helperText={
							nameError
								? "课程名称不能为空。"
								: "填正式全称，以卷头为准。不包含课程类型，如A1。"
						}
						fullWidth
					/>
				</Grid>
				<Grid size={3}>
					<FormControl variant="filled" fullWidth size={"small"}>
						<InputLabel>试卷类型</InputLabel>
						<Select
							value={type}
							onChange={(e) => {
								setType(e.target.value as 0 | 1 | 2);
							}}
						>
							<MenuItem value={0}>期末</MenuItem>
							<MenuItem value={1}>期中</MenuItem>
							<MenuItem value={2}>其他</MenuItem>
						</Select>
					</FormControl>
				</Grid>
				<Grid size={6}>
					<TextField
						label="课程代码"
						variant="filled"
						size={"small"}
						helperText={"没有就不填。"}
						fullWidth
						value={identifier}
						onChange={(e) => setIdentifier(e.target.value)}
					/>
				</Grid>
				<Grid size={4}>
					<TextField
						error={yearError}
						label="年份"
						variant="filled"
						size={"small"}
						helperText={yearError ? "年份格式错误。" : "四位数，未知就不填。"}
						fullWidth
						value={year}
						onChange={(e) => setYear(e.target.value)}
					/>
				</Grid>
				<Grid size={2}>
					<FormControl variant="filled" fullWidth size={"small"}>
						<InputLabel>年份类型</InputLabel>
						<Select
							disabled={yearError || year === null || year === ""}
							value={yearType}
							onChange={(e) => {
								setYearType(e.target.value as 0 | 1);
							}}
						>
							<MenuItem value={0}>年</MenuItem>
							<MenuItem value={1}>级</MenuItem>
						</Select>
					</FormControl>
				</Grid>
				<Grid size={12}>
					<div className={"flex items-center"}>
						<FormControlLabel
							className={"ml-0"}
							control={
								<Checkbox
									defaultChecked
									size={"small"}
									checked={answer}
									onChange={(e) => setAnswer(e.target.checked)}
								/>
							}
							label={<div className={"text-sm"}>包含答案</div>}
						/>
						<Button
							className={"ml-auto"}
							startIcon={<AddOutlinedIcon />}
							onClick={() => {
								setTagName("");
								tagNameRef.current = "";
								setAddTagDialog(true);
							}}
						>
							添加标签
						</Button>
					</div>
				</Grid>
			</Grid>
			<div className={"flex flex-wrap"}>
				{tags.map((tag) => (
					<Chip
						key={tag.name}
						color={tag.filter === false ? "success" : "primary"}
						variant={"outlined"}
						label={tag.name}
						className={"m-1"}
						size={"small"}
						onDelete={() => {
							handleDeleteTag(tag);
						}}
					/>
				))}
			</div>
			<Dialog open={addTagDialog} onClose={() => setAddTagDialog(false)}>
				<DialogTitle>添加标签</DialogTitle>
				<DialogContent className={"py-0"}>
					<TextField
						error={tagName.length === 0 || tagRepeated}
						helperText={
							tagName.length === 0
								? "标签名称不能为空"
								: tagRepeated
									? "标签已经存在"
									: ""
						}
						className={"mt-2 block"}
						label={"标签名称"}
						autoFocus
						variant={"outlined"}
						value={tagName}
						onChange={(e) => {
							tagNameRef.current = e.target.value;
							setTagName(e.target.value);
							setTagRepeated(false);
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleAddTag();
								e.preventDefault();
							}
						}}
					></TextField>
					<FormControl className={"mt-1"}>
						<RadioGroup row>
							<FormControlLabel
								onClick={() => {
									setTagType(0);
									tagTypeRef.current = 0;
								}}
								value={0}
								control={<Radio checked={tagType == 0} />}
								label="筛选标签"
							/>
							<FormControlLabel
								onClick={() => {
									setTagType(1);
									tagTypeRef.current = 1;
								}}
								value={1}
								control={<Radio checked={tagType == 1} />}
								label="标志标签"
							/>
						</RadioGroup>
					</FormControl>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setAddTagDialog(false)}>取消</Button>
					<Button onClick={handleAddTag}>添加</Button>
				</DialogActions>
			</Dialog>
		</div>
	);
}
