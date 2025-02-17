import DialogProgressTemplate from "./DialogCircleProgressTemplate";
import { useEffect, useState } from "react";
import { subscribe, unsubscribe } from "../../api";
import { ExportedCallback } from "../../../shared/api";

export default function DialogBarProgressTemplate({
	info,
	event,
}: {
	info: string;
	event: keyof ExportedCallback;
}) {
	const [ok, setOk] = useState(-1);
	const [total, setTotal] = useState(-1);
	useEffect(() => {
		const handle = subscribe(event, (v1, v2) => {
			setOk(v1);
			if (v2) setTotal(v2);
		});
		return () => {
			unsubscribe(event, handle);
		};
	}, []);
	return (
		<DialogProgressTemplate info={info} variant={"bar"} ok={ok} total={total} />
	);
}
