export type WindowChangeCallback = (isMaximized: boolean) => void;
export type DatabaseStatusChangeCallback = (
	status: "pending" | "ready",
	version?: string,
) => void;
export type DatabaseProgressCallback = (v1: number, v2?: number) => void;
