import DataSaverOffOutlinedIcon from "@mui/icons-material/DataSaverOffOutlined";
import { useEffect, useState } from "react";
import { DatabaseSummary } from "../../shared/types/database";
import { invoke } from "../api";
import { Pages, usePageStore } from "../stores/page";

export default function Home() {
	const [dataSummary, setDataSummary] = useState<DatabaseSummary>(null);
	useEffect(() => {
		const init = async () => {
			const summary = await invoke("getDatabaseSummary");
			if (summary.isOk()) {
				setDataSummary(summary.unwrap());
			}
		};
		usePageStore.subscribe((state) => {
			if (Pages[state.now].id === "home") {
				init();
			}
		});
		init();
	}, []);
	return (
		<div className={"pt-12"}>
			<div className={"text-title text-center"}>
				<DataSaverOffOutlinedIcon fontSize={"inherit"} className={"text-8xl"} />
				<div className={"text-4xl font-bold mt-3"}>DocDB</div>
				{dataSummary && (
					<div className={"text-sm mt-1"}>
						共
						<span className={"text-primary mx-1 font-bold"}>
							{dataSummary.courseCount}
						</span>
						门课程，
						<span className={"text-primary mx-1 font-bold"}>
							{dataSummary.documentCount}
						</span>
						份试卷
					</div>
				)}
			</div>
		</div>
	);
}
