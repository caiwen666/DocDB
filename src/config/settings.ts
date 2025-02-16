import { readFile } from "../utils/backend";
import path from "path";

export interface ISettings {
	database: {
		remote: string;
		token: string;
	};
}

export const Settings: ISettings = {
	database: {
		remote: "https://doc.caiwen.work/",
		token: "",
	},
};

export const loadConfig = async () => {
	const config = JSON.parse(
		await readFile(
			path.join(process.cwd(), "config.json"),
			JSON.stringify(Settings),
		),
	);
	Object.assign(Settings, config);
};
