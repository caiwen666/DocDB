import { ButtonBase, Checkbox, Chip } from "@mui/material";
import React from "react";
import classNames from "classnames";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { Document, DocumentInfo } from "../../shared/types/document";

export default function DocumentItem({
																			 onSelect,
																			 selected,
																			 ref,
																			 variant = 0,
																			 className = "",
																			 info,
																			 onDoubleClick,
																		 }: {
	variant?: 0 | 1; //0:可勾选 1:文件展示
	onSelect?: () => void;
	selected?: boolean;
	ref?: (e: HTMLDivElement) => void;
	className?: string;
	info: DocumentInfo;
	onDoubleClick?: () => void;
}) {
	let yearFormat = "未知年份";
	if (info.date) {
		yearFormat = info.date.year.toString();
		if (info.date.yearType === 0) yearFormat += "年";
		else yearFormat += "级";
	}
	return (
		<div
			className={classNames(
				"mt-2 rounded overflow-hidden select-none no-drag transition",
				{
					"bg-primary bg-opacity-20 hover:bg-opacity-30":
						variant === 0 && selected,
					"bg-white hover:bg-gray-100": variant === 0 && !selected,
				},
				className,
			)}
			ref={(el) => {
				if (ref === undefined) return;
				ref(el);
			}}
		>
			<ButtonBase
				className={"p-1 block cursor-default"}
				component={"div"}
				onClick={onSelect}
				disableRipple={variant !== 0}
				onDoubleClick={onDoubleClick}
			>
				<div className={"flex items-center"}>
					{variant === 0 && <Checkbox size={"small"} checked={selected} />}
					{variant === 1 && <AttachFileIcon />}
					<div className={"ml-1"}>
						<div className={"text-sm"}>{`${yearFormat} / ${info.name}`}</div>
						<div className={"text-xs"}>
							{info.type === 0 ? "期末" : info.type === 1 ? "期中" : "其他"}{" "}
							<span
								className={classNames({
									"text-error": !info.answer,
									"text-success": info.answer,
								})}
							>
								{info.answer ? "有答案" : "仅试卷"}
							</span>
							{info.identifier.length != 0 && " " + info.identifier}
						</div>
					</div>
				</div>
				<div className={"flex flex-wrap mt-0.5"}>
					{info.filter.map((tag) => (
						<Chip
							key={tag}
							label={tag}
							size={"small"}
							color={"primary"}
							variant={"outlined"}
							className={"m-0.5"}
						/>
					))}
					{info.tags.map((tag) => (
						<Chip
							key={tag}
							label={tag}
							size={"small"}
							color={"success"}
							variant={"outlined"}
							className={"m-0.5"}
						/>
					))}
				</div>
			</ButtonBase>
		</div>
	);
}
