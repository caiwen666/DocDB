declare global {
	interface Window {
		api: {
			subscribe: any;
			invoke: any;
			getFilePath: (file: File) => string;
		};
	}
}
export {};
