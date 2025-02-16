import { ButtonBase } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { animated, useSpring } from "@react-spring/web";
import React from "react";
import classNames from "classnames";

export default function sideMenuItem({
	active,
	title,
	onClick,
	Icon,
}: {
	active: boolean;
	title: string;
	onClick: () => void;
	Icon: React.ElementType;
}) {
	const barStyles = useSpring({
		width: "100%",
		height: active ? "30px" : "0px",
		backgroundColor: "rgb(25,118,210)",
		config: {
			duration: 100,
		},
	});
	return (
		<div
			className={classNames(
				"w-48 hover:bg-gray-200 transition cursor-pointer h-10",
				{
					"bg-gray-300": active,
				},
			)}
			onClick={onClick}
		>
			<ButtonBase className={"w-full flex h-full"} component={"div"}>
				<div className={"h-10 w-10 flex"}>
					<Icon
						fontSize={"small"}
						className={"text-primary self-center mx-auto"}
					/>
				</div>
				<div className={"self-center text-sm flex-1"}>{title}</div>
			</ButtonBase>

			<div
				className={"z-20 -mt-10 h-10 flex items-center flex-shrink-0"}
				style={{ width: "2px" }}
			>
				<animated.div style={{ ...barStyles }}></animated.div>
			</div>
		</div>
	);
}
