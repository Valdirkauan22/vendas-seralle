import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface SyncProfileData {
  syncCode: string;
  profileId: string;
  nome: string;
  updatedAt: string;
}

interface SyncDiaData {
  syncCode: string;
  profileId: string;
  data: string;
  itensJson: string;
  margem: string;
  updatedAt: string;
}

interface SyncConfigData {
  syncCode: string;
  profileId: string;
  mesId: string;
  configJson: string;
  updatedAt: string;
}

// File-backed persistent storage store fallback
const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "sync-store.json");

const memoryStore = {
  profiles: new Map<string, SyncProfileData>(), // key: `${syncCode}:${profileId}`
  dias: new Map<string, SyncDiaData>(), // key: `${syncCode}:${profileId}:${data}`
  configs: new Map<string, SyncConfigData>(), // key: `${syncCode}:${profileId}:${mesId}`
};

function loadStoreFromDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.profiles) {
        for (const [k, v] of Object.entries(parsed.profiles)) {
          memoryStore.profiles.set(k, v as SyncProfileData);
        }
      }
      if (parsed.dias) {
        for (const [k, v] of Object.entries(parsed.dias)) {
          memoryStore.dias.set(k, v as SyncDiaData);
        }
      }
      if (parsed.configs) {
        for (const [k, v] of Object.entries(parsed.configs)) {
          memoryStore.configs.set(k, v as SyncConfigData);
        }
      }
      console.log(`[Storage] Carregados ${memoryStore.profiles.size} perfis, ${memoryStore.dias.size} dias e ${memoryStore.configs.size} configs do disco.`);
    }
  } catch (e) {
    console.warn("[Storage] Erro ao carregar store do disco:", e);
  }
}

function saveStoreToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = {
      profiles: Object.fromEntries(memoryStore.profiles.entries()),
      dias: Object.fromEntries(memoryStore.dias.entries()),
      configs: Object.fromEntries(memoryStore.configs.entries()),
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("[Storage] Erro ao salvar store no disco:", e);
  }
}

loadStoreFromDisk();

function isValidSyncCode(code: string): boolean {
  return /^[A-Z0-9]{4,16}$/.test(code);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global CORS & Cross-Origin headers to allow PWABuilder/Bubblewrap image fetchers
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  });

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  // Static serving for public assets with CORS
  const publicDir = path.join(process.cwd(), "public");
  app.use(
    express.static(publicDir, {
      setHeaders: (res, filePath) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        if (filePath.endsWith("sw.js")) {
          res.setHeader("Service-Worker-Allowed", "/");
          res.setHeader("Content-Type", "application/javascript");
        }
      },
    })
  );

  // Explicit endpoints for PWA critical assets
  app.get("/manifest.json", (_req, res) => {
    res.setHeader("Content-Type", "application/manifest+json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.sendFile(path.join(publicDir, "manifest.json"));
  });

  app.get("/sw.js", (_req, res) => {
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.sendFile(path.join(publicDir, "sw.js"));
  });

  app.get("/icon-512.png", (_req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    const filePath = fs.existsSync(path.join(publicDir, "icon-512.png"))
      ? path.join(publicDir, "icon-512.png")
      : path.join(process.cwd(), "dist", "icon-512.png");
    res.sendFile(filePath);
  });

  app.get("/icon-maskable-512.png", (_req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    const filePath = fs.existsSync(path.join(publicDir, "icon-maskable-512.png"))
      ? path.join(publicDir, "icon-maskable-512.png")
      : path.join(process.cwd(), "dist", "icon-maskable-512.png");
    res.sendFile(filePath);
  });

  app.get("/icon-192.png", (_req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    const filePath = fs.existsSync(path.join(publicDir, "icon-192.png"))
      ? path.join(publicDir, "icon-192.png")
      : path.join(process.cwd(), "dist", "icon-192.png");
    res.sendFile(filePath);
  });

  app.get("/screenshot-mobile.png", (_req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    const filePath = fs.existsSync(path.join(publicDir, "screenshot-mobile.png"))
      ? path.join(publicDir, "screenshot-mobile.png")
      : path.join(process.cwd(), "dist", "screenshot-mobile.png");
    res.sendFile(filePath);
  });

  app.get("/screenshot-desktop.png", (_req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    const filePath = fs.existsSync(path.join(publicDir, "screenshot-desktop.png"))
      ? path.join(publicDir, "screenshot-desktop.png")
      : path.join(process.cwd(), "dist", "screenshot-desktop.png");
    res.sendFile(filePath);
  });

  app.get("/seralle-logo.svg", (_req, res) => {
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    const filePath = fs.existsSync(path.join(publicDir, "seralle-logo.svg"))
      ? path.join(publicDir, "seralle-logo.svg")
      : path.join(process.cwd(), "dist", "seralle-logo.svg");
    res.sendFile(filePath);
  });

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Pull all data for a sync code
  app.get("/api/sync/:syncCode", async (req, res) => {
    const syncCode = (req.params.syncCode || "").trim().toUpperCase();
    if (!isValidSyncCode(syncCode)) {
      res.status(400).json({ error: "Código de sincronização inválido" });
      return;
    }

    try {
      const profiles: SyncProfileData[] = [];
      const dias: SyncDiaData[] = [];
      const configs: SyncConfigData[] = [];

      for (const p of memoryStore.profiles.values()) {
        if (p.syncCode === syncCode) profiles.push(p);
      }
      for (const d of memoryStore.dias.values()) {
        if (d.syncCode === syncCode) dias.push(d);
      }
      for (const c of memoryStore.configs.values()) {
        if (c.syncCode === syncCode) configs.push(c);
      }

      res.json({ profiles, dias, configs });
    } catch (err) {
      console.error("[Sync GET Error]", err);
      res.status(500).json({ error: "Erro ao buscar dados do servidor" });
    }
  });

  // Push all data for a sync code
  app.post("/api/sync/:syncCode", async (req, res) => {
    const syncCode = (req.params.syncCode || "").trim().toUpperCase();
    if (!isValidSyncCode(syncCode)) {
      res.status(400).json({ error: "Código de sincronização inválido" });
      return;
    }

    const { profiles, dias, configs } = req.body as {
      profiles?: Array<{ profileId: string; nome: string }>;
      dias?: Array<{ profileId: string; data: string; itensJson: string; margem: string }>;
      configs?: Array<{ profileId: string; mesId: string; configJson: string }>;
    };

    if (!Array.isArray(profiles) || !Array.isArray(dias) || !Array.isArray(configs)) {
      res.status(400).json({ error: "Formato inválido: profiles, dias e configs devem ser arrays" });
      return;
    }

    try {
      const now = new Date().toISOString();

      // Upsert profiles
      for (const p of profiles) {
        if (p?.profileId && p?.nome) {
          const key = `${syncCode}:${p.profileId}`;
          memoryStore.profiles.set(key, {
            syncCode,
            profileId: p.profileId,
            nome: p.nome,
            updatedAt: now,
          });
        }
      }

      // Upsert dias
      for (const d of dias) {
        if (d?.profileId && d?.data) {
          const key = `${syncCode}:${d.profileId}:${d.data}`;
          memoryStore.dias.set(key, {
            syncCode,
            profileId: d.profileId,
            data: d.data,
            itensJson: typeof d.itensJson === "string" ? d.itensJson : JSON.stringify(d.itensJson || []),
            margem: String(d.margem ?? "0"),
            updatedAt: now,
          });
        }
      }

      // Upsert configs
      for (const c of configs) {
        if (c?.profileId && c?.mesId) {
          const key = `${syncCode}:${c.profileId}:${c.mesId}`;
          memoryStore.configs.set(key, {
            syncCode,
            profileId: c.profileId,
            mesId: c.mesId,
            configJson: typeof c.configJson === "string" ? c.configJson : JSON.stringify(c.configJson || {}),
            updatedAt: now,
          });
        }
      }

      // Persist updates to disk so they survive server restarts and redeploys
      saveStoreToDisk();

      res.json({ ok: true, syncedAt: now });
    } catch (err) {
      console.error("[Sync POST Error]", err);
      res.status(500).json({ error: "Erro ao salvar dados no servidor" });
    }
  });

  // Vite Middleware in Dev / Static Serving in Prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
