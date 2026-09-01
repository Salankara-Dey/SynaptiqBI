import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = process.env.VITE_BACKEND_URL || env.VITE_BACKEND_URL || "http://localhost:8000";

  return {
    plugins: [react()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
      host: true,
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
        },
      },
    },
  };
});

