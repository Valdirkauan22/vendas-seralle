"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_firestore = require("firebase-admin/firestore");
var adminApp = (0, import_app.getApps)().length ? (0, import_app.getApps)()[0] : (0, import_app.initializeApp)({
  projectId: process.env.FIREBASE_PROJECT_ID || "serale-vendas"
});
var adminAuth = (0, import_auth.getAuth)(adminApp);
var adminDb = (0, import_firestore.getFirestore)(adminApp);
var FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "serale-vendas";
var FIRESTORE_DB_ID = process.env.FIRESTORE_DB_ID || "(default)";
var FIRESTORE_DOC_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents`;
var memoryStore = {
  profiles: /* @__PURE__ */ new Map(),
  // key: `${syncCode}:${profileId}`
  dias: /* @__PURE__ */ new Map(),
  // key: `${syncCode}:${profileId}:${data}`
  configs: /* @__PURE__ */ new Map(),
  // key: `${syncCode}:${profileId}:${mesId}`
  owners: /* @__PURE__ */ new Map()
  // key: syncCode, value: ownerUid
};
function isValidSyncCode(code) {
  return /^[A-Z0-9]{4,16}$/.test(code);
}
var ipRequests = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipRequests.entries()) {
    if (now > entry.resetAt) {
      ipRequests.delete(ip);
    }
  }
}, 60 * 1e3).unref();
function apiRateLimiter(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "client";
  const now = Date.now();
  const windowMs = 60 * 1e3;
  const maxRequests = 120;
  const current = ipRequests.get(ip);
  if (!current || now > current.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + windowMs });
    return next();
  }
  current.count++;
  if (current.count > maxRequests) {
    return res.status(429).json({ error: "Limite de requisi\xE7\xF5es excedido. Aguarde 1 minuto." });
  }
  next();
}
async function loadFirestoreSyncDoc(syncCode, token) {
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
        updatedAt: data?.updatedAt || ""
      };
    }
  } catch {
  }
  try {
    const url = `${FIRESTORE_DOC_URL}/sync_store/${syncCode}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
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
    let parsedPayload = {};
    if (fields.payloadJson?.stringValue) {
      try {
        parsedPayload = JSON.parse(fields.payloadJson.stringValue);
      } catch {
      }
    }
    return {
      syncCode,
      ownerUid,
      profiles: parsedPayload.profiles || [],
      dias: parsedPayload.dias || [],
      configs: parsedPayload.configs || [],
      updatedAt
    };
  } catch (err) {
    console.warn("[Firestore REST Load Warning]", err);
    return null;
  }
}
async function saveFirestoreSyncDoc(syncCode, docData, token) {
  let adminSaved = false;
  try {
    await adminDb.collection("sync_store").doc(syncCode).set(
      {
        syncCode,
        ownerUid: docData.ownerUid,
        profiles: docData.profiles,
        dias: docData.dias,
        configs: docData.configs,
        updatedAt: docData.updatedAt
      },
      { merge: true }
    );
    adminSaved = true;
  } catch {
  }
  if (adminSaved) return;
  const url = `${FIRESTORE_DOC_URL}/sync_store/${syncCode}`;
  const body = {
    fields: {
      syncCode: { stringValue: syncCode },
      ownerUid: { stringValue: docData.ownerUid },
      payloadJson: {
        stringValue: JSON.stringify({
          profiles: docData.profiles,
          dias: docData.dias,
          configs: docData.configs
        })
      },
      updatedAt: { stringValue: docData.updatedAt }
    }
  };
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha na persist\xEAncia oficial do Firestore (${response.status}): ${errorText}`);
  }
}
async function authenticateRequest(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Acesso n\xE3o autorizado. \xC9 obrigat\xF3rio fornecer um token Firebase v\xE1lido no formato 'Authorization: Bearer <token>'."
    });
  }
  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: "Token de autentica\xE7\xE3o ausente." });
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    const isManager = decoded.role === "gerente" || Boolean(decoded.admin) || decoded.email === "kauanrochaoliveira@gmail.com";
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: isManager ? "gerente" : "vendedora",
      isManager,
      token,
      isFirebaseUser: true
    };
    return next();
  } catch (err) {
    console.warn("[Auth] Falha na verifica\xE7\xE3o de token:", err.message);
    return res.status(401).json({
      error: "Token de autentica\xE7\xE3o inv\xE1lido ou expirado.",
      details: err.message
    });
  }
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  });
  app.use((0, import_cors.default)());
  app.options("*", (0, import_cors.default)());
  app.use(import_express.default.json({ limit: "10mb" }));
  const publicDir = import_path.default.join(process.cwd(), "public");
  app.use(
    import_express.default.static(publicDir, {
      setHeaders: (res, filePath) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        if (filePath.endsWith("sw.js")) {
          res.setHeader("Service-Worker-Allowed", "/");
          res.setHeader("Content-Type", "application/javascript");
        }
      }
    })
  );
  app.get("/manifest.json", (_req, res) => {
    res.setHeader("Content-Type", "application/manifest+json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.sendFile(import_path.default.join(publicDir, "manifest.json"));
  });
  app.get("/sw.js", (_req, res) => {
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.sendFile(import_path.default.join(publicDir, "sw.js"));
  });
  app.get("/icon-512.png", (_req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    const filePath = import_fs.default.existsSync(import_path.default.join(publicDir, "icon-512.png")) ? import_path.default.join(publicDir, "icon-512.png") : import_path.default.join(process.cwd(), "dist", "icon-512.png");
    res.sendFile(filePath);
  });
  app.get("/icon-maskable-512.png", (_req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    const filePath = import_fs.default.existsSync(import_path.default.join(publicDir, "icon-maskable-512.png")) ? import_path.default.join(publicDir, "icon-maskable-512.png") : import_path.default.join(process.cwd(), "dist", "icon-maskable-512.png");
    res.sendFile(filePath);
  });
  app.get("/icon-192.png", (_req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    const filePath = import_fs.default.existsSync(import_path.default.join(publicDir, "icon-192.png")) ? import_path.default.join(publicDir, "icon-192.png") : import_path.default.join(process.cwd(), "dist", "icon-192.png");
    res.sendFile(filePath);
  });
  app.get("/screenshot-mobile.png", (_req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    const filePath = import_fs.default.existsSync(import_path.default.join(publicDir, "screenshot-mobile.png")) ? import_path.default.join(publicDir, "screenshot-mobile.png") : import_path.default.join(process.cwd(), "dist", "screenshot-mobile.png");
    res.sendFile(filePath);
  });
  app.get("/screenshot-desktop.png", (_req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    const filePath = import_fs.default.existsSync(import_path.default.join(publicDir, "screenshot-desktop.png")) ? import_path.default.join(publicDir, "screenshot-desktop.png") : import_path.default.join(process.cwd(), "dist", "screenshot-desktop.png");
    res.sendFile(filePath);
  });
  app.get("/seralle-logo.svg", (_req, res) => {
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    const filePath = import_fs.default.existsSync(import_path.default.join(publicDir, "seralle-logo.svg")) ? import_path.default.join(publicDir, "seralle-logo.svg") : import_path.default.join(process.cwd(), "dist", "seralle-logo.svg");
    res.sendFile(filePath);
  });
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/api/transcribe-voice", apiRateLimiter, async (req, res) => {
    try {
      const { audioBase64, mimeType, textInput } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Chave GEMINI_API_KEY n\xE3o configurada no servidor." });
      }
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const promptInstructions = `Voc\xEA \xE9 um assistente de vendas da loja de sapatos Serall\xEA Cal\xE7ados.
Sua tarefa \xE9 analisar o \xE1udio ou texto falado pela vendedora e extrair os dados da venda.
Voc\xEA DEVE responder ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "valor": number (valor monet\xE1rio em reais, ex: 199.90 ou 250.00. Se n\xE3o informado ou zero, coloque 0),
  "pares": number (n\xFAmero de pares de cal\xE7ados vendidos, n\xFAmero inteiro >= 1. Padr\xE3o 1),
  "agregados": number (quantidade de itens agregados como meias, sprays, palmilhas, cintos, limpador. Padr\xE3o 0),
  "categoria": "Feminino" | "Masculino" | "Infantil" | "Esportivo" | "Conforto" | "Acess\xF3rios",
  "descricao": string (descri\xE7\xE3o curta e leg\xEDvel da venda, ex: "T\xEAnis Feminino + 1 Par de Meias"),
  "transcricao": string (o texto exato que a vendedora falou)
}
Instru\xE7\xF5es para categoria:
- Feminino: rasteira, sand\xE1lia, salto, scarpin, bota feminina, sapatilha, vizzano, moleca, dakota, via marte, beira rio.
- Masculino: sapat\xEAnis, sapato social, bota masculina, ferracini, democrata, pegada.
- Esportivo: t\xEAnis de corrida, academia, caminhada, olympikus, nike, mizuno, fila, asics.
- Infantil: infantil, molekinha, molekinho, klin, bibi, kids, beb\xEA.
- Conforto: usaflex, modare, ortop\xE9dico, campesi, piccadilly.
- Acess\xF3rios: meias, palmilhas, sprays, bolsas, cintos, carteiras.
Responda APENAS o JSON puro sem formata\xE7\xE3o markdown envolvente.`;
      let contents;
      if (audioBase64) {
        contents = [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || "audio/webm",
                  data: audioBase64
                }
              },
              {
                text: `${promptInstructions}

Analise o \xE1udio enviado.`
              }
            ]
          }
        ];
      } else if (textInput) {
        contents = [
          {
            role: "user",
            parts: [
              {
                text: `${promptInstructions}

Texto recebido:
"${textInput}"`
              }
            ]
          }
        ];
      } else {
        return res.status(400).json({ error: "Par\xE2metro 'audioBase64' ou 'textInput' \xE9 obrigat\xF3rio." });
      }
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config: {
          responseMimeType: "application/json"
        }
      });
      const responseText = response.text || "{}";
      const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedData = JSON.parse(cleanJson);
      res.json(parsedData);
    } catch (err) {
      console.error("Erro no processamento de voz com Gemini:", err);
      res.status(500).json({ error: "Erro ao processar \xE1udio: " + (err.message || String(err)) });
    }
  });
  app.post("/api/admin/set-role", apiRateLimiter, async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Requer autentica\xE7\xE3o com token Firebase." });
    }
    try {
      const token = authHeader.split("Bearer ")[1];
      const caller = await adminAuth.verifyIdToken(token, true);
      const isSuperAdmin = caller.email === "kauanrochaoliveira@gmail.com" || caller.role === "gerente";
      if (!isSuperAdmin) {
        return res.status(403).json({ error: "Acesso negado. Apenas gerentes ou o administrador podem atribuir permiss\xF5es." });
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
        return res.status(400).json({ error: "targetUid ou targetEmail \xE9 obrigat\xF3rio." });
      }
      await adminAuth.setCustomUserClaims(uid, { role, admin: role === "gerente" });
      res.json({
        success: true,
        message: `Papel '${role}' atribu\xEDdo com sucesso ao usu\xE1rio ${uid}.`
      });
    } catch (err) {
      res.status(500).json({ error: err.message || "Erro ao configurar papel de usu\xE1rio." });
    }
  });
  app.get("/api/sync/:syncCode", apiRateLimiter, authenticateRequest, async (req, res) => {
    const syncCode = (req.params.syncCode || "").trim().toUpperCase();
    if (!isValidSyncCode(syncCode)) {
      res.status(400).json({ error: "C\xF3digo de sincroniza\xE7\xE3o inv\xE1lido" });
      return;
    }
    const caller = req.user;
    try {
      const firestoreDoc = await loadFirestoreSyncDoc(syncCode, caller.token);
      const existingOwnerUid = firestoreDoc?.ownerUid || memoryStore.owners.get(syncCode);
      if (existingOwnerUid) {
        const isOwner = existingOwnerUid === caller.uid;
        const isManager = caller.isManager;
        if (!isOwner && !isManager) {
          return res.status(403).json({
            error: "Acesso negado. Este c\xF3digo de sincroniza\xE7\xE3o pertence a outro usu\xE1rio."
          });
        }
      }
      let profiles = firestoreDoc?.profiles || [];
      let dias = firestoreDoc?.dias || [];
      let configs = firestoreDoc?.configs || [];
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
        profiles.forEach((p) => memoryStore.profiles.set(`${syncCode}:${p.profileId}`, p));
        dias.forEach((d) => memoryStore.dias.set(`${syncCode}:${d.profileId}:${d.data}`, d));
        configs.forEach((c) => memoryStore.configs.set(`${syncCode}:${c.profileId}:${c.mesId}`, c));
        if (existingOwnerUid) memoryStore.owners.set(syncCode, existingOwnerUid);
      }
      res.json({ profiles, dias, configs, ownerUid: existingOwnerUid || caller.uid });
    } catch (err) {
      console.error("[Sync GET Error]", err);
      res.status(500).json({ error: "Erro ao buscar dados de sincroniza\xE7\xE3o", details: err.message });
    }
  });
  app.post("/api/sync/:syncCode", apiRateLimiter, authenticateRequest, async (req, res) => {
    const syncCode = (req.params.syncCode || "").trim().toUpperCase();
    if (!isValidSyncCode(syncCode)) {
      res.status(400).json({ error: "C\xF3digo de sincroniza\xE7\xE3o inv\xE1lido" });
      return;
    }
    const caller = req.user;
    const { profiles, dias, configs } = req.body;
    if (!Array.isArray(profiles) || !Array.isArray(dias) || !Array.isArray(configs)) {
      res.status(400).json({ error: "Formato inv\xE1lido: profiles, dias e configs devem ser arrays" });
      return;
    }
    if (profiles.length > 20 || dias.length > 1e3 || configs.length > 100) {
      res.status(413).json({ error: "Volume de dados excede o limite permitido por requisi\xE7\xE3o." });
      return;
    }
    try {
      const existingDoc = await loadFirestoreSyncDoc(syncCode, caller.token);
      const existingOwnerUid = existingDoc?.ownerUid || memoryStore.owners.get(syncCode);
      if (existingOwnerUid) {
        const isOwner = existingOwnerUid === caller.uid;
        const isManager = caller.isManager;
        if (!isOwner && !isManager) {
          return res.status(403).json({
            error: "Acesso negado. Este c\xF3digo de sincroniza\xE7\xE3o j\xE1 est\xE1 vinculado a outra vendedora e n\xE3o pode ser sobrescrito."
          });
        }
      }
      const targetOwnerUid = existingOwnerUid || caller.uid;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const savedProfiles = [];
      const savedDias = [];
      const savedConfigs = [];
      for (const p of profiles) {
        if (p?.profileId && p?.nome) {
          savedProfiles.push({
            syncCode,
            profileId: p.profileId,
            nome: String(p.nome).slice(0, 100),
            updatedAt: now
          });
        }
      }
      for (const d of dias) {
        if (d?.profileId && d?.data) {
          savedDias.push({
            syncCode,
            profileId: d.profileId,
            data: d.data,
            itensJson: typeof d.itensJson === "string" ? d.itensJson : JSON.stringify(d.itensJson || []),
            margem: String(d.margem ?? "0"),
            updatedAt: now
          });
        }
      }
      for (const c of configs) {
        if (c?.profileId && c?.mesId) {
          savedConfigs.push({
            syncCode,
            profileId: c.profileId,
            mesId: c.mesId,
            configJson: typeof c.configJson === "string" ? c.configJson : JSON.stringify(c.configJson || {}),
            updatedAt: now
          });
        }
      }
      try {
        await saveFirestoreSyncDoc(
          syncCode,
          {
            syncCode,
            ownerUid: targetOwnerUid,
            profiles: savedProfiles,
            dias: savedDias,
            configs: savedConfigs,
            updatedAt: now
          },
          caller.token
        );
      } catch (fsErr) {
        console.error("[Firestore Sync Persistence Failed]", fsErr);
        return res.status(500).json({
          error: "Falha na grava\xE7\xE3o oficial no Firestore. Os dados n\xE3o puderam ser persistidos com seguran\xE7a.",
          details: fsErr.message
        });
      }
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
    } catch (err) {
      console.error("[Sync POST Error]", err);
      res.status(500).json({ error: "Erro ao salvar dados de sincroniza\xE7\xE3o", details: err.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
