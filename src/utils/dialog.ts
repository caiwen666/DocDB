import React from "react";
import { create } from "zustand";

export interface Dialog {
	title: string;
	content: React.ReactNode;
	callback?: (v: string) => void | boolean;
	buttons?: string[];
}

export type WaitingDialog = Omit<Dialog, "callback" | "buttons">;

export interface DialogStore {
	queue: Dialog[];
	push: (dialog: Dialog) => void;
	close: (index: number) => void;
	waitingDialog: WaitingDialog | null;
	pushWaitingDialog: (dialog: WaitingDialog) => void;
	closeWaitingDialog: () => void;
}

export const useDialogStore = create<DialogStore>((set) => ({
	queue: [],
	waitingDialog: null,
	push: (dialog: Dialog) => {
		set((state) => ({ queue: [...state.queue, dialog] }));
	},
	close: (index: number) => {
		set((state) => ({ queue: state.queue.filter((_, i) => i !== index) }));
	},
	pushWaitingDialog: (dialog: WaitingDialog) => {
		set(() => ({ waitingDialog: dialog }));
	},
	closeWaitingDialog: () => {
		set(() => ({ waitingDialog: null }));
	},
}));
