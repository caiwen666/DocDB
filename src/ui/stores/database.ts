import { create } from "zustand";

export interface DatabaseStore {
	latest: number;
	now: number;
	status: "pending" | "ready";
	setStatus: (status: "pending" | "ready", latest: number, now: number) => void;
}

export const useDatabaseStore = create<DatabaseStore>((set) => ({
	latest: -1,
	now: -1,
	status: "pending",
	setStatus: (status, latest, now) => set({ status, now, latest }),
}));