import express from "express";
import {
	AddRecord,
	DeleteRecord,
	Document,
	DocumentInfo,
	IConfig,
	ModifyRecord,
	Record,
	Response,
} from "./type";
import * as fs from "node:fs";
import path from "node:path";
import fileUpload from "express-fileupload";
import { formatDocumentInfo } from "./utils";
import dayjs from "dayjs";
import _ from "lodash";

const Config: IConfig = JSON.parse(
	fs.readFileSync(path.join(process.cwd(), "config.json"), "utf-8"),
);

const app = express();

app.use((req, res, next) => {
	const token = req.headers["Authorization"] || req.headers["authorization"];
	if (token === Config.token) {
		next();
	} else {
		res.status(401).send("Unauthorized");
	}
});

app.use(express.json());
app.use(fileUpload());

const success = (data: unknown): Response => {
	return { status: "ok", data };
};

const failed = (msg: string): Response => {
	return { status: "failed", msg };
};

app.get("/latest", (req, res) => {
	res.json(success(Config.record.length - 1));
});

app.post("/update", (req, res) => {
	const operation = req.query.opt;
	if (!operation) {
		res.json(failed("No operation specified."));
		return;
	}
	const rid = parseInt(req.query.rid as string);
	if (isNaN(rid)) {
		res.json(failed("Invalid rid."));
		return;
	}
	if (Config.record.length - 1 !== rid) {
		res.json(failed("Need to update."));
		return;
	}
	const md5 = req.query.md5 as string;
	if (!md5) {
		res.json(failed("No md5 specified."));
		return;
	}
	if (!fs.existsSync(path.join(process.cwd(), "data", "file", md5 + ".pdf"))) {
		res.json(failed("File not found."));
		return;
	}
	if (operation === "create") {
		const info: DocumentInfo = req.body;
		if (!info) {
			res.json(failed("No info specified."));
			return;
		}
		Config.startID++;
		const document: Document = {
			id: Config.startID + 1,
			md5,
			info,
		};
		const rid = Config.record.length; // record 长度递增，这样分配没问题
		const record: AddRecord = {
			id: rid,
			time: dayjs().format("YYYY-MM-DD HH:mm:ss"),
			documentID: document.id,
			file: md5,
			operation: "create",
			info,
		};
		Config.record.push(record);
		Config.data[md5] = document;
		console.log(
			"添加试卷\n" +
				"试卷ID: " +
				document.id +
				"\n" +
				"MD5: " +
				md5 +
				"\n" +
				"+ " +
				formatDocumentInfo(info) +
				"\n" +
				"----------------------------------------\n",
		);
		res.json(success(record));
	}
	if (operation === "modify") {
		const info: DocumentInfo = req.body;
		if (!info) {
			res.json(failed("No info specified."));
			return;
		}
		const document = Config.data[md5];
		const rid = Config.record.length; // record 长度递增，这样分配没问题
		const record: ModifyRecord = {
			id: rid,
			time: dayjs().format("YYYY-MM-DD HH:mm:ss"),
			documentID: document.id,
			file: md5,
			operation: "modify",
			info,
		};
		console.log(
			"修改试卷\n" +
				"试卷ID: " +
				document.id +
				"\n" +
				"MD5: " +
				md5 +
				"\n" +
				"- " +
				formatDocumentInfo(document.info) +
				"\n" +
				"+ " +
				formatDocumentInfo(info) +
				"\n" +
				"----------------------------------------\n",
		);
		document.info = info;
		Config.record.push(record);
		Config.data[md5] = document;
		res.json(success(record));
	}
	if (operation === "delete") {
		const document = Config.data[md5];
		const rid = Config.record.length; // record 长度递增，这样分配没问题
		const record: DeleteRecord = {
			id: rid,
			time: dayjs().format("YYYY-MM-DD HH:mm:ss"),
			documentID: document.id,
			file: md5,
			operation: "delete",
		};
		console.log(
			"删除试卷\n" +
				"试卷ID: " +
				document.id +
				"\n" +
				"MD5: " +
				md5 +
				"\n" +
				"- " +
				formatDocumentInfo(document.info) +
				"\n" +
				"----------------------------------------\n",
		);
		delete Config.data[md5];
		Config.record.push(record);
		res.json(success(record));
	}
	// 保存数据
	// 考虑lodash防抖
	_.debounce(() => {
		fs.writeFileSync(
			path.join(process.cwd(), "data", "record.json"),
			JSON.stringify(Config.record),
		);
		fs.writeFileSync(
			path.join(process.cwd(), "data", "data.json"),
			JSON.stringify(Config.data),
		);
	}, 10 * 1000)();
});

app.get("/pull", (req, res) => {
	const target = parseInt(req.query.target as string);
	if (isNaN(target)) {
		res.json(failed("Invalid target."));
		return;
	}
	const list: Record[] = [];
	for (let i = Config.record.length - 1; i >= 0; i--) {
		const record = Config.record[i];
		if (record.id != target) list.push(record);
		else break;
	}
	res.json(success(_.reverse(list)));
});

app.post("/pushFile", (req, res) => {
	if (!req.files) {
		res.json(failed("No files were uploaded."));
		return;
	}
	if (!req.files.file) {
		res.json(failed("No file part."));
		return;
	}
	const file = req.files.file as fileUpload.UploadedFile;
	if (
		fs.existsSync(path.join(process.cwd(), "data", "file", file.md5 + ".pdf"))
	) {
		res.json(success("ok"));
		return;
	}
	fs.writeFileSync(
		path.join(process.cwd(), "data", "file", file.md5 + ".pdf"),
		file.data,
	);
	console.log("File uploaded：" + file.md5);
	res.json(success("ok"));
});

app.get("/getFile", (req, res) => {
	const target = req.query.md5;
	if (!target) {
		res.json(failed("No target specified."));
		return;
	}
	if (
		!fs.existsSync(path.join(process.cwd(), "data", "file", target + ".pdf"))
	) {
		res.json(failed("File not found."));
		return;
	}
	res.sendFile(path.join(process.cwd(), "data", "file", target + ".pdf"));
});

app.get("/hasFile", (req, res) => {
	const target = req.query.md5;
	if (!target) {
		res.json(failed("No target specified."));
		return;
	}
	if (Config.data[target as string] === undefined) {
		res.json(success(false));
	} else {
		res.json(success(true));
	}
});

// 载入数据
Config.record = JSON.parse(
	fs.readFileSync(path.join(process.cwd(), "data", "record.json"), "utf-8"),
);
Config.data = JSON.parse(
	fs.readFileSync(path.join(process.cwd(), "data", "data.json"), "utf-8"),
);
// 定位起始ID，以及自检
Config.startID = 0;
for (const md5 in Config.data) {
	Config.startID = Math.max(Config.startID, Config.data[md5].id);
	if (!fs.existsSync(path.join(process.cwd(), "data", "file", md5 + ".pdf"))) {
		console.error("File not found: " + md5);
		console.log(Config.data[md5]);
	}
}

app.listen(Config.port, () => {
	console.log(`Server is running on port ${Config.port}.`);
});

// 生成初始数据

// const data: Document[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "data_old.json"), "utf-8"));
// const newData: {[md5: string]: Document} = {};
// const record: Record[] = [];
// let startID = 0;
// for(const doc of data){
// 	if(newData[doc.md5] !== undefined) {
// 		console.log("Duplicate md5: " + doc.md5);
// 		console.log(newData[doc.md5]);
// 		console.log(doc);
// 	}else{
// 		startID ++;
// 		doc.id = startID;
// 		record.push({
// 			id: record.length,
// 			time: dayjs().format("YYYY-MM-DD HH:mm:ss"),
// 			documentID: doc.id,
// 			file: doc.md5,
// 			operation: "create",
// 			info: doc.info
// 		});
// 		newData[doc.md5] = doc;
// 	}
// }
// fs.writeFileSync(path.join(process.cwd(), "data", "record.json"), JSON.stringify(record));
// fs.writeFileSync(path.join(process.cwd(), "data", "_data.json"), JSON.stringify(newData));
