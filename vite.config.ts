/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const openrouterApiKey = env.OPENROUTER_API_KEY;
  const openrouterSiteUrl = env.OPENROUTER_SITE_URL ?? "";
  const openrouterTitle = env.OPENROUTER_TITLE ?? "";
  const openrouterModel = env.OPENROUTER_MODEL ?? env.OPENROUTRER_MODEL ?? "";

  const whisperTarget = env.VITE_WHISPER_TARGET ?? "http://139.99.125.212:2047";
  const piperTarget = env.VITE_PIPER_TARGET ?? "http://139.99.125.212:2048";

  const openrouterProxy = {
    target: "https://openrouter.ai",
    changeOrigin: true,
    secure: true,
    rewrite: (path: string) => path.replace(/^\/openrouter/, ""),
    configure: (proxy: any) => {
      proxy.on("proxyReq", (proxyReq: any) => {
        if (openrouterApiKey) {
          proxyReq.setHeader("Authorization", `Bearer ${openrouterApiKey}`);
        }
        if (openrouterSiteUrl) {
          proxyReq.setHeader("HTTP-Referer", openrouterSiteUrl);
        }
        if (openrouterTitle) {
          proxyReq.setHeader("X-Title", openrouterTitle);
        }
      });
    },
  };

  const whisperProxy = {
    target: whisperTarget,
    changeOrigin: true,
    secure: false,
    rewrite: (path: string) => path.replace(/^\/whisper/, ""),
  };

  const piperProxy = {
    target: piperTarget,
    changeOrigin: true,
    secure: false,
    rewrite: (path: string) => path.replace(/^\/piper/, ""),
  };

  return {
    plugins: [react()],
    define: {
      "import.meta.env.OPENROUTER_SITE_URL": JSON.stringify(openrouterSiteUrl),
      "import.meta.env.OPENROUTER_TITLE": JSON.stringify(openrouterTitle),
      "import.meta.env.OPENROUTER_MODEL": JSON.stringify(openrouterModel),
      // Backwards-compat for the typo in .env
      "import.meta.env.OPENROUTRER_MODEL": JSON.stringify(openrouterModel),
    },
    server: {
      proxy: {
        "/openrouter": openrouterProxy,
        "/whisper": whisperProxy,
        "/piper": piperProxy,
      },
    },
    preview: {
      host: "0.0.0.0",
      port: 2053,
      allowedHosts: ["ai-test.gurubot.io"],
      proxy: {
        "/openrouter": openrouterProxy,
        "/whisper": whisperProxy,
        "/piper": piperProxy,
      },
    },
  };
});
