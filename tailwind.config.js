export default {
	important: true,
	content: ["./src/**/*.{html,js,ts,tsx,jsx}"],
	theme: {
		extend: {
			colors: {
				white0: "rgb(253,253,253)",
				white1: "rgb(251,251,251)",
				background: "rgb(234,234,234)",
				primary: "rgb(25,118,210)",
				card: "rgb(237,237,237)",
				title: "rgb(71,71,71)",
				foreground: "var(--foreground)",
				footer: "rgb(240,240,240)",
				head: "rgb(120,120,120)",
				error: "rgb(244,67,54)",
				success: "rgb(76,175,80)",
			},
			keyframes: {
				fadeIn: {
					"0%": { opacity: "0" },
					"100%": { opacity: "1" },
				},
			},
			animation: {
				fadeIn: "fadeIn 0.5s ease",
			},
			fontSize: {
				low: "14px",
			},
		},
	},
	plugins: [],
};
