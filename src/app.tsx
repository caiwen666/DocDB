import { createRoot } from "react-dom/client";
import DataSaverOffOutlinedIcon from "@mui/icons-material/DataSaverOffOutlined";
import Window from "./window";
import { Pages, usePageStore } from "./config/PageManager";
import classNames from "classnames";
import { InitCallback } from "./config/callback";

const root = createRoot(document.body);
root.render(<App />);

function App() {
	const pageStore = usePageStore();
	return (
		<Window
			title={"DocDB"}
			icon={
				<DataSaverOffOutlinedIcon
					fontSize={"inherit"}
					className={"self-baseline"}
				/>
			}
		>
			{Pages.map((page, index) => {
				return (
					<div
						key={index}
						className={classNames(
							{ hidden: pageStore.now != index },
							"min-h-full",
						)}
					>
						<page.content />
					</div>
				);
			})}
		</Window>
	);
}

InitCallback();
