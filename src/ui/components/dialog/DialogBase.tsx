import { useDialogStore } from "../../stores/dialog";
import { Button, Dialog, DialogActions, DialogTitle } from "@mui/material";

export default function DialogBase() {
	const dialogStore = useDialogStore();
	return (
		<>
			{dialogStore.queue.map((dialog, index) => {
				const handleClick = (button: string) => {
					if (dialog.callback) {
						const res = dialog.callback(button);
						if (res === false) return;
					}
					dialogStore.close(index);
				};
				return (
					<Dialog open={true} key={index}>
						<DialogTitle>{dialog.title}</DialogTitle>
						{dialog.content}
						<DialogActions>
							{dialog.buttons &&
								dialog.buttons.map((button) => {
									return (
										<Button key={button} onClick={() => handleClick(button)}>
											{button}
										</Button>
									);
								})}
							{!dialog.buttons && (
								<Button onClick={() => handleClick("确定")}>确定</Button>
							)}
						</DialogActions>
					</Dialog>
				);
			})}
			{dialogStore.waitingDialog && (
				<Dialog open={true} fullWidth>
					<DialogTitle>{dialogStore.waitingDialog.title}</DialogTitle>
					{dialogStore.waitingDialog.content}
				</Dialog>
			)}
		</>
	);
}
