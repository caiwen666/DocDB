import {
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
} from "@mui/material";
import FileItem from "../components/FileItem";
import { DocumentInfo, Document, DocumentFromFile } from "../types/document";
import { useEffect, useRef, useState } from "react";
import FileOpenOutlinedIcon from "@mui/icons-material/FileOpenOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import { formatDocumentInfo, parseName } from "../utils";
import classNames from "classnames";
import DocumentItem from "../components/DocumentItem";

export default function Add() {
	type ValidMap = { [key: string]: boolean };

	interface ErrorLog {
		name: string;
		error: string;
	}

	// error dialog
	const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
	const [showErrorDialog, setShowErrorDialog] = useState(false);
	// ok dialog
	const [showOkDialog, setShowOkDialog] = useState(false);
	const [addedCount, setAddedCount] = useState(0);
	// question dialog
	const [showQuestionDialog, setShowQuestionDialog] = useState(false);
	const questionDialogCallback = useRef(null);
	const [targetFile, setTargetFile] = useState<string>(null);
	const [repeatedItem, setRepeatedItem] = useState<Document | null>(null);

	const [loading, setLoading] = useState(false);
	const selfRef = useRef<HTMLDivElement>(null);
	const [documents, setDocuments] = useState<DocumentFromFile[]>([]);
	const documentsRef = useRef<DocumentFromFile[]>([]);
	const isValidRef = useRef<ValidMap>({});
	const handleChange = (form: DocumentInfo, index: number) => {
		documentsRef.current[index].info = form;
		setDocuments([...documentsRef.current]);
	};
	const handleDelete = (index: number) => {
		isValidRef.current[documentsRef.current[index].md5] = undefined;
		documentsRef.current.splice(index, 1);
		setDocuments([...documentsRef.current]);
	};
	const addDocument = async (files: File[]) => {
		setLoading(true);
		const errorLogs: ErrorLog[] = [];
		let docArray: DocumentFromFile[] = [...documentsRef.current];
		for (const file of files) {
			const result = await window.api.getFileDetail(file);
			if (typeof result === "string") {
				errorLogs.push({ name: file.name, error: result });
			} else {
				// 判断重复
				let repeat: undefined | Document = undefined;
				const _id = await window.api.isFileExist(result.md5);
				if (_id !== undefined) {
					repeat = await window.api.getDocument(_id);
					errorLogs.push({
						name: file.name,
						error:
							"文件重复，数据库中已存在文件：\n" +
							`[${repeat.id}]${formatDocumentInfo(repeat.info)}`,
					});
					continue;
				}
				// 从已经添加的检索
				repeat = docArray.find((item) => item.md5 === result.md5);
				if (repeat) {
					errorLogs.push({
						name: file.name,
						error: "文件重复，先前存在的文件：\n" + file.name,
					});
					continue;
				}
				const doc: DocumentFromFile = {
					id: 0,
					info: {
						name: "",
						identifier: "",
						date: { year: -1, yearType: 0 },
						type: 0,
						answer: true,
						page: result.page,
						filter: [],
						tags: [],
					},
					md5: result.md5,
					file: result.name,
					path: result.path,
				};
				doc.info = parseName(result.name, doc.info);
				docArray = [doc, ...docArray];
			}
		}
		setLoading(false);
		if (errorLogs.length !== 0) {
			setErrorLogs(errorLogs);
			setShowErrorDialog(true);
		}
		setDocuments(docArray);
		documentsRef.current = docArray;
	};
	const handleDrop = (e: DragEvent) => {
		e.preventDefault();
		const items = e.dataTransfer.items;
		if (!items) return;
		const fileArray = [];
		for (const item of items) {
			if (item.kind !== "file") continue;
			const file = item.getAsFile();
			//console.log(webUtils.getPathForFile(file));
			if (file.type !== "application/pdf") continue;
			fileArray.push(file);
		}
		addDocument(fileArray);
	};
	useEffect(() => {
		const handleDragOver = (e: DragEvent) => {
			e.preventDefault();
		};
		if (selfRef.current) {
			const parent = selfRef.current.parentElement;
			if (parent) {
				parent.addEventListener("drop", handleDrop);
				parent.addEventListener("dragover", handleDragOver);
			}
		}
		return () => {
			if (selfRef.current) {
				const parent = selfRef.current.parentElement;
				if (parent) {
					parent.removeEventListener("drop", handleDrop);
					parent.removeEventListener("dragover", handleDragOver);
				}
			}
		};
	}, []);
	const pushDocument = async () => {
		setLoading(true);
		const readyDocuments: DocumentFromFile[] = [];
		const remainDocuments: DocumentFromFile[] = [];
		for (const item of documentsRef.current) {
			if (!isValidRef.current[item.md5]) {
				remainDocuments.push(item);
				continue;
			}
			// 探测是否可能重复
			const searchList = await window.api.searchDocument(item.info.name);
			let target: null | Document = null;
			for (const doc of searchList) {
				if (doc.info.date && doc.info.date.year !== item.info.date.year)
					continue;
				if (doc.info.type !== item.info.type) continue;
				if (doc.info.answer !== item.info.answer) continue;
				target = doc;
				break;
			}
			if (target) {
				const operation = await new Promise((resolve) => {
					setTargetFile(item.file);
					setRepeatedItem(target);
					questionDialogCallback.current = resolve;
					setShowQuestionDialog(true);
				});
				if (operation === "cancel") {
					continue;
				}
			}
			if (item.info.date.year === -1) item.info.date = undefined;
			readyDocuments.push(item);
		}
		setDocuments(remainDocuments);
		documentsRef.current = remainDocuments;
		await window.api.addDocument(readyDocuments);
		setAddedCount(readyDocuments.length);
		setLoading(false);
		setShowOkDialog(true);
	};
	return (
		<div className={"min-h-full"} ref={selfRef}>
			<Dialog open={showOkDialog}>
				<DialogTitle>提示</DialogTitle>
				<DialogContent>
					<DialogContentText>
						试卷添加完毕，成功添加了{addedCount}份试卷
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button autoFocus onClick={() => setShowOkDialog(false)}>
						确定
					</Button>
				</DialogActions>
			</Dialog>
			<Dialog open={showQuestionDialog}>
				<DialogTitle>可能的重复</DialogTitle>
				<DialogContent>
					<DialogContentText>
						如下的试卷可能已经存在于数据库中，是否继续添加？
					</DialogContentText>
					<div className={"mt-2"}>
						要添加的试卷：
						<span className={"font-bold"}>{targetFile}</span>
					</div>
					<div className={"mt-2"}>已经存在的试卷：</div>
					{repeatedItem && (
						<DocumentItem
							variant={1}
							className={"bg-card"}
							info={repeatedItem.info}
						/>
					)}
				</DialogContent>
				<DialogActions>
					<Button
						autoFocus
						onClick={() => {
							questionDialogCallback.current("cancel");
							setShowQuestionDialog(false);
						}}
					>
						取消
					</Button>
					<Button
						onClick={() => {
							questionDialogCallback.current("continue");
							setShowQuestionDialog(false);
						}}
						autoFocus
					>
						继续
					</Button>
				</DialogActions>
			</Dialog>
			<Dialog open={showErrorDialog}>
				<DialogTitle>添加文件时错误</DialogTitle>
				<DialogContent>
					{errorLogs.map((item, index) => (
						<div key={item.name}>
							<div className={classNames("font-bold", { "mt-2": index != 0 })}>
								{item.name}
							</div>
							<div className={"whitespace-pre-wrap"}>{item.error}</div>
						</div>
					))}
				</DialogContent>
				<DialogActions>
					<Button autoFocus onClick={() => setShowErrorDialog(false)}>
						确定
					</Button>
				</DialogActions>
			</Dialog>
			<div className={"flex items-center"}>
				<div className={"text-title text-lg select-none ml-2"}>添加试卷</div>
				{loading && <CircularProgress size="16px" className={"ml-2"} />}
				<Button
					className={"ml-auto mr-1"}
					startIcon={<FileUploadOutlinedIcon />}
					disabled={documents.length === 0 || loading}
					onClick={pushDocument}
				>
					添加
				</Button>
			</div>
			{documents.length === 0 && (
				<div className={"text-8xl text-title mt-16 text-center"}>
					<FileOpenOutlinedIcon fontSize={"inherit"} />
					<div className={"text-sm text-center mt-2 select-none"}>
						将文件拖入以添加
					</div>
				</div>
			)}
			{documents.map((doc, index) => (
				<FileItem
					file={doc.file}
					form={doc.info}
					onChange={(form) => handleChange(form, index)}
					key={doc.md5}
					onValid={(v) => {
						isValidRef.current[doc.md5] = v;
						//console.log(isValidRef.current);
					}}
					onDelete={() => {
						handleDelete(index);
					}}
				/>
			))}
		</div>
	);
}
