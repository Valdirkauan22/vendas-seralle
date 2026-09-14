import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
const adminApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "esoteric-effort-znm9t",
    });

const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(
  adminApp,
  "ai-studio-vendasseralle-723e987b-29a0-4f4b-b5de-55f4874fda6f"
);

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

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "esoteric-effort-znm9t";
const FIRESTORE_DB_ID = "ai-studio-vendasseralle-723e987b-29a0-4f4b-b5de-55f4874fda6f";
const FIRESTORE_DOC_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents`;

interface SyncStoreDoc {
  syncCode: string;
  ownerUid: string;
  profiles: SyncProfileData[];
  dias: SyncDiaData[];
  configs: SyncConfigData[];
  updatedAt: string;
}

// In-memory cache for ultra-fast sync responses and ownership mapping
const memoryStore = {
  profiles: new Map<string, SyncProfileData>(), // key: `${syncCode}:${profileId}`
  dias: new Map<string, SyncDiaData>(), // key: `${syncCode}:${profileId}:${data}`
  configs: new Map<string, SyncConfigData>(), // key: `${syncCode}:${profileId}:${mesId}`
  owners: new Map<string, string>(), // key: syncCode, value: ownerUid
};

function isValidSyncCode(code: string): boolean {
  return /^[A-Z0-9]{4,16}$/.test(code);
}

// In-memory sliding-window rate limiter with periodic cleanup
const ipRequests = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipRequests.entries()) {
    if (now > entry.resetAt) {
      ipRequests.delete(ip);
    }
  }
}, 60 * 1000).unref();

function apiRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || (req.headers["x-forwarded-for"] as string) || "client";
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 120; // Amplo para evitar bloqueios espúrios em sincronizações legítimas

  const current = ipRequests.get(ip);
  if (!current || now > current.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + windowMs });
    return next();
  }

  current.count++;
  if (current.count > maxRequests) {
    return res.status(429).json({ error: "Limite de requisições excedido. Aguarde 1 minuto." });
  }

  next();
}

/**
 * Funções de Persistência Oficial no Firestore
 */
async function loadFirestoreSyncDoc(syncCode: string, token: string): Promise<SyncStoreDoc | null> {
  // 1. Tenta usar adminDb se disponível com credenciais
  try {
    const docSnap = await adminDb.collection("sync_store").doc(syncCode).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      return {
        syncCode,
        ownerUid: data?.ownerUid || "",
        profiles: data?.profiles || [],
        dias: data?.dias || [],
        configs: data?.configs || [],
        updatedAt: data?.updatedAt || "",
      };
    }
  } catch {
    // Continua para o Firestore REST API com o token Bearer do usuário autenticado
  }

  // 2. Consulta oficial via Firestore REST API autenticada com o token do usuário
  try {
    const url = `${FIRESTORE_DOC_URL}/sync_store/${syncCode}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro Firestore REST (${response.status}): ${errorText}`);
    }

    const rawDoc = await response.json();
    const fields = rawDoc.fields || {};
    const ownerUid = fields.ownerUid?.stringValue || "";
    const updatedAt = fields.updatedAt?.stringValue || "";
    let parsedPayload: any = {};
    if (fields.payloadJson?.stringValue) {
      try {
        parsedPayload = JSON.parse(fields.payloadJson.stringValue);
      } catch {}
    }

    return {
      syncCode,
      ownerUid,
      profiles: parsedPayload.profiles || [],
      dias: parsedPayload.dias || [],
      configs: parsedPayload.configs || [],
      updatedAt,
    };
  } catch (err) {
    console.warn("[Firestore REST Load Warning]", err);
    return null;
  }
}

async function saveFirestoreSyncDoc(syncCode: string, docData: SyncStoreDoc, token: string): Promise<void> {
  let adminSaved = false;

  // 1. Tenta salvar via adminDb
  try {
    await adminDb.collection("sync_store").doc(syncCode).set(
      {
        syncCode,
        ownerUid: docData.ownerUid,
        profiles: docData.profiles,
        dias: docData.dias,
        configs: docData.configs,
        updatedAt: docData.updatedAt,
      },
      { merge: true }
    );
    adminSaved = true;
  } catch {
    // Admin IAM não configurado no container, utiliza persistência oficial via REST API do usuário
  }

  if (adminSaved) return;

  // 2. Persistência oficial no Firestore com as credenciais Bearer do usuário
  const url = `${FIRESTORE_DOC_URL}/sync_store/${syncCode}`;
  const body = {
    fields: {
      syncCode: { stringValue: syncCode },
      ownerUid: { stringValue: docData.ownerUid },
      payloadJson: {
        stringValue: JSON.stringify({
          profiles: docData.profiles,
          dias: docData.dias,
          configs: docData.configs,
        }),
      },
      updatedAt: { stringValue: docData.updatedAt },
    },
  };

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha na persistência oficial do Firestore (${response.status}): ${errorText}`);
  }
}

/**
 * Middleware de Autenticação Segura
 * Valida tokens Firebase via verificação criptográfica oficial com Firebase Admin SDK.
 * Sem exceções ou rotas de escape: exige Bearer token válido.
 */
async function authenticateRequest(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Acesso não autorizado. É obrigatório fornecer um token Firebase válido no formato 'Authorization: Bearer <token>'.",
    });
  }

  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: "Token de autenticação ausente." });
  }

  try {
    // Verificação criptográfica completa (assinatura, emissor, expiração, revogação)
    const decoded = await adminAuth.verifyIdToken(token, true);
    const isManager =
      decoded.role === "gerente" ||
      Boolean(decoded.admin) ||
      decoded.email === "kauanrochaoliveira@gmail.com";

    (req as any).user = {
      uid: decoded.uid,
      email: decoded.email,
      role: isManager ? "gerente" : "vendedora",
      isManager,
      token,
      isFirebaseUser: true,
    };
    return next();
  } catch (err: any) {
    console.warn("[Auth] Falha na verificação de token:", err.message);
    return res.status(401).json({
      error: "Token de autenticação inválido ou expirado.",
      details: err.message,
    });
  }
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
  app.use(express.json({ limit: "2mb" }));

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

  // Endpoint Administrativo para Gerenciamento de Cargos (Gerente / Vendedora)
  app.post("/api/admin/set-role", apiRateLimiter, async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Requer autenticação com token Firebase." });
    }

    try {
      const token = authHeader.split("Bearer ")[1];
      const caller = await adminAuth.verifyIdToken(token, true);
      const isSuperAdmin = caller.email === "kauanrochaoliveira@gmail.com" || caller.role === "gerente";

      if (!isSuperAdmin) {
        return res.status(403).json({ error: "Acesso negado. Apenas gerentes ou o administrador podem atribuir permissões." });
      }

      const { targetUid, targetEmail, role } = req.body;
      if (!["gerente", "vendedora"].includes(role)) {
        return res.status(400).json({ error: "O papel deve ser 'gerente' ou 'vendedora'." });
      }

      let uid = targetUid;
      if (!uid && targetEmail) {
        const targetUser = await adminAuth.getUserByEmail(targetEmail);
        uid = targetUser.uid;
      }

      if (!uid) {
        return res.status(400).json({ error: "targetUid ou targetEmail é obrigatório." });
      }

      await adminAuth.setCustomUserClaims(uid, { role, admin: role === "gerente" });
      res.json({
        success: true,
        message: `Papel '${role}' atribuído com sucesso ao usuário ${uid}.`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erro ao configurar papel de usuário." });
    }
  });

  // Pull all data for a sync code (Autenticado, com controle de proprietário e persistência oficial Firestore)
  app.get("/api/sync/:syncCode", apiRateLimiter, authenticateRequest, async (req, res) => {
    const syncCode = (req.params.syncCode || "").trim().toUpperCase();
    if (!isValidSyncCode(syncCode)) {
      res.status(400).json({ error: "Código de sincronização inválido" });
      return;
    }

    const caller = (req as any).user;

    try {
      // 1. Busca documento oficial no Firestore
      const firestoreDoc = await loadFirestoreSyncDoc(syncCode, caller.token);

      // 2. Validação rigorosa de proprietário (syncCode -> ownerUid)
      const existingOwnerUid = firestoreDoc?.ownerUid || memoryStore.owners.get(syncCode);
      if (existingOwnerUid) {
        const isOwner = existingOwnerUid === caller.uid;
        const isManager = caller.isManager;
        if (!isOwner && !isManager) {
          return res.status(403).json({
            error: "Acesso negado. Este código de sincronização pertence a outro usuário.",
          });
        }
      }

      let profiles: SyncProfileData[] = firestoreDoc?.profiles || [];
      let dias: SyncDiaData[] = firestoreDoc?.dias || [];
      let configs: SyncConfigData[] = firestoreDoc?.configs || [];

      // Se vazio no Firestore, tenta recuperar do cache de memória local
      if (profiles.length === 0 && dias.length === 0 && configs.length === 0) {
        for (const p of memoryStore.profiles.values()) {
          if (p.syncCode === syncCode) profiles.push(p);
        }
        for (const d of memoryStore.dias.values()) {
          if (d.syncCode === syncCode) dias.push(d);
        }
        for (const c of memoryStore.configs.values()) {
          if (c.syncCode === syncCode) configs.push(c);
        }
      } else {
        // Atualiza cache de memória com dados validados
        profiles.forEach((p) => memoryStore.profiles.set(`${syncCode}:${p.profileId}`, p));
        dias.forEach((d) => memoryStore.dias.set(`${syncCode}:${d.profileId}:${d.data}`, d));
        configs.forEach((c) => memoryStore.configs.set(`${syncCode}:${c.profileId}:${c.mesId}`, c));
        if (existingOwnerUid) memoryStore.owners.set(syncCode, existingOwnerUid);
      }

      res.json({ profiles, dias, configs, ownerUid: existingOwnerUid || caller.uid });
    } catch (err: any) {
      console.error("[Sync GET Error]", err);
      res.status(500).json({ error: "Erro ao buscar dados de sincronização", details: err.message });
    }
  });

  // Push all data for a sync code (Autenticado, com verificação de proprietário e persistência garantida no Firestore)
  app.post("/api/sync/:syncCode", apiRateLimiter, authenticateRequest, async (req, res) => {
    const syncCode = (req.params.syncCode || "").trim().toUpperCase();
    if (!isValidSyncCode(syncCode)) {
      res.status(400).json({ error: "Código de sincronização inválido" });
      return;
    }

    const caller = (req as any).user;

    const { profiles, dias, configs } = req.body as {
      profiles?: Array<{ profileId: string; nome: string }>;
      dias?: Array<{ profileId: string; data: string; itensJson: string; margem: string }>;
      configs?: Array<{ profileId: string; mesId: string; configJson: string }>;
    };

    if (!Array.isArray(profiles) || !Array.isArray(dias) || !Array.isArray(configs)) {
      res.status(400).json({ error: "Formato inválido: profiles, dias e configs devem ser arrays" });
      return;
    }

    // Validação de limites para proteção contra DoS e abuso de memória
    if (profiles.length > 20 || dias.length > 1000 || configs.length > 100) {
      res.status(413).json({ error: "Volume de dados excede o limite permitido por requisição." });
      return;
    }

    try {
      // 1. Verifica se o código já tem proprietário no Firestore ou cache
      const existingDoc = await loadFirestoreSyncDoc(syncCode, caller.token);
      const existingOwnerUid = existingDoc?.ownerUid || memoryStore.owners.get(syncCode);

      if (existingOwnerUid) {
        const isOwner = existingOwnerUid === caller.uid;
        const isManager = caller.isManager;
        if (!isOwner && !isManager) {
          return res.status(403).json({
            error: "Acesso negado. Este código de sincronização já está vinculado a outra vendedora e não pode ser sobrescrito.",
          });
        }
      }

      const targetOwnerUid = existingOwnerUid || caller.uid;
      const now = new Date().toISOString();
      const savedProfiles: SyncProfileData[] = [];
      const savedDias: SyncDiaData[] = [];
      const savedConfigs: SyncConfigData[] = [];

      // Upsert profiles
      for (const p of profiles) {
        if (p?.profileId && p?.nome) {
          savedProfiles.push({
            syncCode,
            profileId: p.profileId,
            nome: String(p.nome).slice(0, 100),
            updatedAt: now,
          });
        }
      }

      // Upsert dias
      for (const d of dias) {
        if (d?.profileId && d?.data) {
          savedDias.push({
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
          savedConfigs.push({
            syncCode,
            profileId: c.profileId,
            mesId: c.mesId,
            configJson: typeof c.configJson === "string" ? c.configJson : JSON.stringify(c.configJson || {}),
            updatedAt: now,
          });
        }
      }

      // 2. Persistência primária e obrigatória no Firestore oficial
      // Se falhar, RETORNA ERRO HTTP 500 (NUNCA finge sucesso se não salvou)
      try {
        await saveFirestoreSyncDoc(
          syncCode,
          {
            syncCode,
            ownerUid: targetOwnerUid,
            profiles: savedProfiles,
            dias: savedDias,
            configs: savedConfigs,
            updatedAt: now,
          },
          caller.token
        );
      } catch (fsErr: any) {
        console.error("[Firestore Sync Persistence Failed]", fsErr);
        return res.status(500).json({
          error: "Falha na gravação oficial no Firestore. Os dados não puderam ser persistidos com segurança.",
          details: fsErr.message,
        });
      }

      // 3. Atualiza cache de memória somente após confirmação de gravação no Firestore
      memoryStore.owners.set(syncCode, targetOwnerUid);
      for (const p of savedProfiles) {
        memoryStore.profiles.set(`${syncCode}:${p.profileId}`, p);
      }
      for (const d of savedDias) {
        memoryStore.dias.set(`${syncCode}:${d.profileId}:${d.data}`, d);
      }
      for (const c of savedConfigs) {
        memoryStore.configs.set(`${syncCode}:${c.profileId}:${c.mesId}`, c);
      }

      res.json({ ok: true, syncedAt: now, ownerUid: targetOwnerUid });
    } catch (err: any) {
      console.error("[Sync POST Error]", err);
      res.status(500).json({ error: "Erro ao salvar dados de sincronização", details: err.message });
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
