import { subscribe, unsubscribe } from "../config/callback";
import { DialogContent } from "@mui/material";
import ProgressTemplate from "./ProgressTemplate";
import { useEffect, useState } from "react";

export default function FetchBackDialog() {
	const [ok, setOk] = useState(-1);
	const [total, setTotal] = useState(-1);
	useEffect(() => {
		const handle = subscribe("onFetchBackProgressUpdated", (v1, v2) => {
			setOk(v1);
			if (v2) setTotal(v2);
		});
		return () => {
			unsubscribe("onFetchBackProgressUpdated", handle);
		};
	}, []);
	return (
		<DialogContent>
			<ProgressTemplate
				info={"正在取回文件"}
				variant={"bar"}
				ok={ok}
				total={total}
			/>
		</DialogContent>
	);
}
