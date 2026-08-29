import express from "express";
import cors from "cors";
import path from "path";
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

// In-memory persistent storage store fallback
const memoryStore = {
  profiles: new Map<string, SyncProfileData>(), // key: `${syncCode}:${profileId}`
  dias: new Map<string, SyncDiaData>(), // key: `${syncCode}:${profileId}:${data}`
  configs: new Map<string, SyncConfigData>(), // key: `${syncCode}:${profileId}:${mesId}`
};

function isValidSyncCode(code: string): boolean {
  return /^[A-Z0-9]{4,16}$/.test(code);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

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
