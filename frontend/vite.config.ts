import path from "node:path";
import react from "@vitejs/plugin-react";
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
	build: {
		outDir: "../dashfrog/src/dashfrog/api/static",
	},
	server: {
		port: 5173,
		proxy: {
			"/api": {
				target: "http://localhost:8000",
				changeOrigin: true,
			},
		},
	},
});
