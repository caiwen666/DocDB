import { SelectedDocument, Document } from "../../shared/types/document";
import { create } from "zustand";

export interface SelectedStore {
	selected: SelectedDocument[];
	selectedID: number[];
	add: (target: Document) => void;
	remove: (target: number) => void;
}

export const useSelectedStore = create<SelectedStore>((set) => ({
	selected: [],
	selectedID: [],
	add: (target) =>
		set((state) => ({
			selected: [
				...state.selected,
				{
					document: target,
					color: false,
					count: 1,
					double: true,
				},
			],
			selectedID: [...state.selectedID, target.id],
		})),
	remove: (target) =>
		set((state) => ({
			selected: state.selected.filter((v) => v.document.id !== target),
			selectedID: state.selectedID.filter((v) => v !== target),
		})),
}));
