import express from "express";
import { IConfig, Record, SignRecord } from "./type";
import * as fs from "node:fs";
import path from "node:path";
import { merge } from "./database";
import fileUpload from "express-fileupload";
import { degrees, PDFDocument } from "pdf-lib";
import fontkit from "fontkit";
import { Fontkit } from "pdf-lib/es/types/fontkit";

const Config: IConfig = JSON.parse(
	fs.readFileSync(path.join(process.cwd(), "config.json"), "utf-8"),
);

const app = express();

app.use((req, res, next) => {
	const token = req.headers["Authorization"] || req.headers["authorization"];
	//console.log(token, Config.token);
	//console.log(req.headers);
	if (token === Config.token) {
		next();
	} else {
		res.status(401).send("Unauthorized");
	}
});

app.use(express.json());
app.use(fileUpload());

app.get("/data", (req, res) => {
	const obj = JSON.parse(
		fs.readFileSync(path.join(process.cwd(), "data", "data.json"), "utf-8"),
	);
	res.json(obj);
});

app.get("/track", (req, res) => {
	const obj = JSON.parse(
		fs.readFileSync(path.join(process.cwd(), "data", "track.json"), "utf-8"),
	);
	res.json(obj);
});

app.get("/version", (req, res) => {
	const obj: Record[] = JSON.parse(
		fs.readFileSync(path.join(process.cwd(), "data", "track.json"), "utf-8"),
	);
	const version = (obj[obj.length - 1] as SignRecord).version;
	res.send(version);
});

app.post("/push", (req, res) => {
	try {
		const data = req.body.data;
		const track = req.body.track;
		if (!data || !track) res.status(400).send("No data or track.");
		merge(track, data);
		res.send("ok");
	} catch (e) {
		res.status(400).send(e);
	}
});

app.post("/pushFile", (req, res) => {
	if (!req.files) {
		res.status(400).send("No files were uploaded.");
		return;
	}
	if (!req.files.file) {
		res.status(400).send("No file part.");
		return;
	}
	const file = req.files.file as fileUpload.UploadedFile;
	if (
		fs.existsSync(path.join(process.cwd(), "data", "file", file.md5 + ".pdf"))
	) {
		res.send("ok");
		return;
	}
	fs.writeFileSync(
		path.join(process.cwd(), "data", "file", file.md5 + ".pdf"),
		file.data,
	);
	console.log("File uploaded：" + file.md5);
	res.send("ok");
});

app.get("/getFile", (req, res) => {
	const target = req.query.target;
	if (!target) {
		res.status(400).send("No target specified.");
		return;
	}
	if (
		!fs.existsSync(path.join(process.cwd(), "data", "file", target + ".pdf"))
	) {
		res.status(404).send("File not found.");
		return;
	}
	res.sendFile(path.join(process.cwd(), "data", "file", target + ".pdf"));
});

app.listen(Config.port, () => {
	console.log(`Server is running on port ${Config.port}.`);
});
