import {
	Button,
	ButtonBase,
	CircularProgress,
	Collapse,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Divider,
} from "@mui/material";
import {
	Document,
	DocumentFromFile,
	DocumentInfo,
} from "../../shared/types/document";
import { useEffect, useRef, useState } from "react";
import FileOpenOutlinedIcon from "@mui/icons-material/FileOpenOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import {
	clone,
	formatDocumentInfo,
	formatToString,
	parseName,
} from "../../shared/utils";
import classNames from "classnames";
import DocumentItem from "../components/DocumentItem";
import { invoke } from "../api";
import { useDialogStore } from "../stores/dialog";
import DialogErrorTemplate from "../components/dialog/DialogErrorTemplate";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import ExpandLessOutlinedIcon from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DocumentForm from "../components/DocumentForm";
import { useDatabaseStore } from "../stores/database";
import DialogBarProgressTemplate from "../components/dialog/DialogBarProgressTemplate";
import DialogProgressTemplate from "../components/dialog/DialogCircleProgressTemplate";

const FileItem = ({
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
}) => {
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
};

export default function Add() {
	const pushDialog = useDialogStore((state) => state.push);
	const [loading, setLoading] = useState(false);
	const selfRef = useRef<HTMLDivElement>(null);
	const [documents, setDocuments] = useState<DocumentFromFile[]>([]);
	const documentsRef = useRef<DocumentFromFile[]>([]);
	// 推送文件时的进度条
	const [showDialog, setShowDialog] = useState(false);
	const [totalProgress, setTotalProgress] = useState(0);
	const [currentProgress, setCurrentProgress] = useState(0);
	// 用于判断表单是否通过了验证，key为表单对应文件的md5
	const isValidRef = useRef<{ [key: string]: boolean }>({});
	const addDocument = async (files: File[]) => {
		setLoading(true);
		let docArray: DocumentFromFile[] = [...documentsRef.current];
		// 把所有的错误信息汇总起来，最后统一展示
		const errorLogs: { name: string; error: string }[] = [];
		for (const file of files) {
			// 渲染进程中无法直接获取到文件的绝对路径，需要通过preload获取
			try {
				const path = window.api.getFilePath(file);
				const result = (await invoke("getFileDetail", path)).unwrap();
				// 判断重复
				// 从数据库中检索
				const repeatFromDatabase = (
					await invoke("getDocumentByMD5", result.md5)
				).unwrap();
				if (repeatFromDatabase) {
					throw (
						"文件重复，数据库中已存在文件：\n" +
						`[${repeatFromDatabase.id}]${formatDocumentInfo(repeatFromDatabase.info)}`
					);
				}
				// 从先前添加的文件中检索
				const repeatFromList = docArray.find((item) => item.md5 === result.md5);
				if (repeatFromList) {
					throw "文件重复，先前存在的文件：\n" + repeatFromList.file;
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
			} catch (e) {
				errorLogs.push({ name: file.name, error: formatToString(e) });
			}
		}
		setLoading(false);
		if (errorLogs.length !== 0) {
			pushDialog({
				title: "添加文件时错误",
				content: (
					<DialogContent>
						{errorLogs.map((item, index) => (
							<div key={item.name}>
								<div
									className={classNames("font-bold", { "mt-2": index != 0 })}
								>
									{item.name}
								</div>
								<div className={"whitespace-pre-wrap"}>{item.error}</div>
							</div>
						))}
					</DialogContent>
				),
			});
		}
		setDocuments(docArray);
		documentsRef.current = docArray;
	};
	const handleDrop = (e: DragEvent) => {
		e.preventDefault();
		const items = e.dataTransfer.items;
		if (!items) return;
		const databaseStore = useDatabaseStore.getState();
		if (databaseStore.latest !== databaseStore.now) {
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
		// 这里需要克隆一下，防止表单组件莫名其妙刷新，使得我们的对象发生修改，nodejs的引用传递真的很恶心
		const list = clone(documentsRef.current);
		for (const item of list) {
			if (!isValidRef.current[item.md5]) {
				remainDocuments.push(item);
				continue;
			}
			// 探测是否可能重复
			const searchList = (
				await invoke("searchDocument", item.info.name)
			).unwrap_or([]);
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
				const op = await new Promise((resolve) => {
					pushDialog({
						title: "可能的重复",
						content: (
							<DialogContent>
								<DialogContentText>
									如下的试卷可能已经存在于数据库中，是否继续添加？
								</DialogContentText>
								<div className={"mt-2"}>
									要添加的试卷：
									<span className={"font-bold"}>{item.file}</span>
								</div>
								<div className={"mt-2"}>已经存在的试卷：</div>
								<DocumentItem
									variant={1}
									className={"bg-card"}
									info={target.info}
								/>
							</DialogContent>
						),
						buttons: ["取消", "取消但保留", "继续"],
						callback: resolve,
					});
				});
				if (op === "取消") {
					continue;
				}
				if (op === "取消但保留") {
					remainDocuments.push(item);
					continue;
				}
			}
			if (item.info.date.year === -1) item.info.date = undefined;
			readyDocuments.push(item);
		}

		setShowDialog(true);
		setTotalProgress(readyDocuments.length);
		setCurrentProgress(0);
		let reject = false; // 后续的文件推送是否被取消
		for (const item of readyDocuments) {
			if (reject) {
				remainDocuments.push(item);
				continue;
			}
			const result = await invoke("addDocument", item);
			if (result.isOk()) {
				setCurrentProgress((v) => v + 1);
			} else {
				reject = true;
				setShowDialog(false);
				pushDialog({
					title: "错误",
					content: (
						<DialogContent>
							<DialogErrorTemplate
								info={"添加试卷失败"}
								error={result.getError()}
							/>
							<DocumentItem info={item.info} variant={1} />
						</DialogContent>
					),
				});
				remainDocuments.push(item);
			}
		}

		if (!reject) {
			pushDialog({
				title: "成功",
				content: (
					<DialogContent>
						<DialogContentText>
							已经把所有的试卷成功添加到数据库中。
						</DialogContentText>
					</DialogContent>
				),
			});
		}

		setDocuments(remainDocuments);
		documentsRef.current = remainDocuments;
		await invoke("updateDatabase");
		await invoke("saveDatabase");
		setShowDialog(false);
		setLoading(false);
	};
	return (
		<div className={"min-h-full"} ref={selfRef}>
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
					onChange={(form) => {
						documentsRef.current[index].info = form;
						setDocuments([...documentsRef.current]);
					}}
					key={doc.md5}
					onValid={(v) => {
						isValidRef.current[doc.md5] = v;
						//console.log(isValidRef.current);
					}}
					onDelete={() => {
						isValidRef.current[documentsRef.current[index].md5] = undefined;
						documentsRef.current.splice(index, 1);
						setDocuments([...documentsRef.current]);
					}}
				/>
			))}
			<Dialog open={showDialog}>
				<DialogTitle>添加试卷</DialogTitle>
				<DialogContent>
					<DialogProgressTemplate
						variant={"bar"}
						info={"正在推送文件到服务器..."}
						ok={currentProgress}
						total={totalProgress}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}
