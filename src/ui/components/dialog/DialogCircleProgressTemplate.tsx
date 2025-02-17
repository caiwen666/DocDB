import classNames from "classnames";
import {
	CircularProgress,
	DialogContentText,
	LinearProgress,
} from "@mui/material";

export default function DialogProgressTemplate({
	className = "",
	info,
	variant = "circle",
	total,
	ok,
}: {
	className?: string;
	info: string;
	variant?: "circle" | "bar";
	total?: number;
	ok?: number;
}) {
	return (
		<div
			className={classNames(className, {
				"flex items-center": variant === "circle",
			})}
		>
			{variant === "circle" && (
				<>
					<CircularProgress />
					<DialogContentText className={"ml-4"}>{info}</DialogContentText>
				</>
			)}
			{variant === "bar" && (
				<>
					<DialogContentText>{info}</DialogContentText>
					<LinearProgress
						className={"mt-2"}
						variant={ok === -1 ? "indeterminate" : "determinate"}
						value={ok === -1 ? undefined : (ok / total) * 100}
					/>
					{ok !== -1 && (
						<DialogContentText className={"text-right mt-1"}>
							{ok}/{total}
						</DialogContentText>
					)}
				</>
			)}
		</div>
	);
}
