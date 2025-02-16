import {
	Button,
	ButtonBase,
	Checkbox,
	Chip,
	Collapse,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Divider,
	FormControl,
	FormControlLabel,
	FormHelperText,
	FormLabel,
	Input,
	InputLabel,
	MenuItem,
	Radio,
	RadioGroup,
	Select,
	TextField,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { ChangeEventHandler, useEffect, useRef, useState } from "react";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ExpandLessOutlinedIcon from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import { DocumentInfo } from "../types/document";
import DocumentForm from "./DocumentForm";

export default function FileItem({
	form,
	onChange,
	onValid,
	onDelete,
	file,
}: {
	form: DocumentInfo;
	onChange: (form: DocumentInfo) => void;
	onValid: (v: boolean) => void;
	onDelete: () => void;
	file: string;
}) {
	//the panel
	const [isExpanded, setIsExpanded] = useState(true);
	const [deleteDialog, setDeleteDialog] = useState(false);
	return (
		<Collapse
			in={isExpanded}
			collapsedSize={32}
			className={"w-full bg-white rounded overflow-hidden mt-2 select-none"}
		>
			<div className={"flex"}>
				<ButtonBase
					component={"div"}
					className={"h-8 flex items-center justify-start px-1 flex-1 min-w-0"}
					onClick={() => {
						setIsExpanded(!isExpanded);
					}}
				>
					<AttachFileOutlinedIcon fontSize={"small"} />
					<div className={"text-sm pl-1 flex-1 overflow-hidden"}>
						<div className={"truncate"}>{file}</div>
					</div>
					{isExpanded ? (
						<ExpandLessOutlinedIcon fontSize={"small"} className={"ml-auto"} />
					) : (
						<ExpandMoreOutlinedIcon fontSize={"small"} className={"ml-auto"} />
					)}
				</ButtonBase>
				<ButtonBase className={"w-8 h-8"} onClick={() => setDeleteDialog(true)}>
					<DeleteOutlineOutlinedIcon fontSize={"small"} />
				</ButtonBase>
			</div>
			<Divider />
			<DocumentForm
				form={form}
				onChange={onChange}
				onValid={onValid}
				className={"p-2"}
			/>
			<Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
				<DialogTitle>删除试卷</DialogTitle>
				<DialogContent>
					<DialogContentText>确定要删除这份试卷吗？</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteDialog(false)}>取消</Button>
					<Button
						onClick={() => {
							onDelete();
							setDeleteDialog(false);
						}}
					>
						删除
					</Button>
				</DialogActions>
			</Dialog>
		</Collapse>
	);
}
