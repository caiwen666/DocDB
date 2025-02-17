import classNames from "classnames";
import { DialogContentText } from "@mui/material";
import { formatToString } from "../../../shared/utils";

export default function DialogErrorTemplate({
	className = "",
	info,
	error,
}: {
	className?: string;
	info: string;
	error: unknown;
}) {
	return (
		<div className={classNames(className, "min-w-64")}>
			<DialogContentText>{info}</DialogContentText>
			<div className={"whitespace-break-spaces mt-2"}>
				{formatToString(error)}
			</div>
		</div>
	);
}
