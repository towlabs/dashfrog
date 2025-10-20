import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./"),
		},
		dedupe: ["react", "react-dom"],
	},
	optimizeDeps: {
		include: ["react", "react-dom", "react/jsx-runtime"],
	},
	server: {
		port: 5173,
	},
});
