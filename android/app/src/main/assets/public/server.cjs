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
var import_node_dns = __toESM(require("node:dns"), 1);
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_firestore = require("firebase-admin/firestore");
import_node_dns.default.setDefaultResultOrder("ipv4first");
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
      let { audioBase64, mimeType, textInput } = req.body;
      const extractSaleFromText = (text) => {
        let raw = (text || "").trim();
        raw = raw.replace(/\b([a-zA-ZÀ-ÿ0-9]+\s+[a-zA-ZÀ-ÿ0-9]+(?:\s+[a-zA-ZÀ-ÿ0-9]+){0,3})\s+\1\b/gi, "$1");
        raw = raw.replace(/\b([a-zA-ZÀ-ÿ0-9]+)(?:\s+\1\b)+/gi, "$1");
        raw = raw.replace(/\s{2,}/g, " ").trim();
        const lower = raw.toLowerCase();
        let pares = 1;
        const paresNumMatch = lower.match(/(\d+)\s*(par|pares)/i);
        if (paresNumMatch && paresNumMatch[1]) {
          pares = parseInt(paresNumMatch[1], 10) || 1;
        } else if (lower.includes("dois pares") || lower.includes("duas pares")) {
          pares = 2;
        } else if (lower.includes("tr\xEAs pares") || lower.includes("tres pares")) {
          pares = 3;
        } else if (lower.includes("quatro pares")) {
          pares = 4;
        } else if (lower.includes("cinco pares")) {
          pares = 5;
        }
        let agregados = 0;
        const agMatch = lower.match(/(\d+)\s*(meia|meias|spray|sprays|palmilha|palmilhas|cinto|cintos|carteira|carteiras|agregado|agregados|limpador)/i);
        if (agMatch && agMatch[1]) {
          agregados = parseInt(agMatch[1], 10) || 1;
        } else if (lower.includes("duas meias") || lower.includes("dois sprays") || lower.includes("duas palmilhas")) {
          agregados = 2;
        } else if (lower.includes("meia") || lower.includes("spray") || lower.includes("palmilha") || lower.includes("cinto") || lower.includes("carteira") || lower.includes("limpador")) {
          agregados = 1;
        }
        let categoria = "Feminino";
        if (lower.includes("masculin") || lower.includes("sapato social") || lower.includes("sapat\xEAnis") || lower.includes("bota masculina") || lower.includes("pegada") || lower.includes("ferracini") || lower.includes("democrata")) {
          categoria = "Masculino";
        } else if (lower.includes("infantil") || lower.includes("molekinh") || lower.includes("klin") || lower.includes("bibi") || lower.includes("kids") || lower.includes("beb\xEA")) {
          categoria = "Infantil";
        } else if (lower.includes("esport") || lower.includes("t\xEAnis") || lower.includes("corrida") || lower.includes("academia") || lower.includes("nike") || lower.includes("olympikus") || lower.includes("mizuno") || lower.includes("asics") || lower.includes("fila")) {
          categoria = "Esportivo";
        } else if (lower.includes("confort") || lower.includes("usaflex") || lower.includes("modare") || lower.includes("piccadilly") || lower.includes("campesi") || lower.includes("ortop\xE9dico")) {
          categoria = "Conforto";
        } else if (lower.includes("meia") || lower.includes("spray") || lower.includes("palmilha") || lower.includes("cinto") || lower.includes("bolsa") || lower.includes("carteira")) {
          categoria = "Acess\xF3rios";
        }
        let valor = 0;
        const moedaMatch = lower.match(/(?:r\$\s*)?(\d{1,4}(?:[.,]\d{2}))/i);
        const reaisCentMatch = lower.match(/(\d+)\s*(?:reais|real)?\s*(?:e\s*(\d{1,2})\s*(?:centavos)?)?/i);
        const reaisMatch = lower.match(/(\d+)\s*(?:reais|real)/i);
        const generalMatch = lower.match(/\d+([.,]\d+)?/);
        if (moedaMatch && moedaMatch[1]) {
          valor = parseFloat(moedaMatch[1].replace(",", "."));
        } else if (reaisMatch && reaisMatch[1]) {
          valor = parseFloat(reaisMatch[1]);
        } else if (reaisCentMatch && reaisCentMatch[1] && (lower.includes("real") || lower.includes("reais") || reaisCentMatch[2])) {
          const inteiros = parseFloat(reaisCentMatch[1]) || 0;
          const centavos = reaisCentMatch[2] ? parseInt(reaisCentMatch[2], 10) / (reaisCentMatch[2].length === 1 ? 10 : 100) : 0;
          valor = inteiros + centavos;
        } else if (generalMatch && generalMatch[0]) {
          valor = parseFloat(generalMatch[0].replace(",", "."));
        }
        return {
          valor: isNaN(valor) ? 0 : valor,
          pares: isNaN(pares) ? 1 : pares,
          agregados: isNaN(agregados) ? 0 : agregados,
          categoria,
          descricao: raw.slice(0, 60) || `${pares} par(es) ${categoria}`,
          transcricao: raw
        };
      };
      if (!audioBase64 && !textInput) {
        return res.status(400).json({ error: "Par\xE2metro 'audioBase64' ou 'textInput' \xE9 obrigat\xF3rio." });
      }
      const apiKey = process.env.GEMINI_API_KEY;
      let ai = null;
      if (apiKey) {
        try {
          const { GoogleGenAI } = await import("@google/genai");
          ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build"
              }
            }
          });
        } catch (e) {
          console.warn("N\xE3o foi poss\xEDvel carregar GoogleGenAI:", e);
        }
      }
      if (audioBase64 && !textInput && ai) {
        try {
          const transcribeRes = await Promise.race([
            ai.models.generateContent({
              model: "gemini-3.5-transcribe",
              contents: {
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType || "audio/webm",
                      data: audioBase64
                    }
                  },
                  { text: "Transcreva este \xE1udio em portugu\xEAs do Brasil com exatid\xE3o." }
                ]
              }
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout transcri\xE7\xE3o")), 8e3))
          ]);
          if (transcribeRes?.text) {
            textInput = transcribeRes.text.trim();
          }
        } catch (transcribeErr) {
          console.warn("[Voice] gemini-3.5-transcribe falhou, tentando modelo multimodal alternativo:", transcribeErr.message || transcribeErr);
        }
      }
      if (textInput && ai) {
        const promptInstructions = `Voc\xEA \xE9 um assistente da loja Serall\xEA Cal\xE7ados. Extraia a venda deste texto em JSON estrito:
{
  "valor": number (valor em reais ex: 199.90. Se n\xE3o informado, 0),
  "pares": number (>= 1, padr\xE3o 1),
  "agregados": number (meias, sprays, etc, padr\xE3o 0),
  "categoria": "Feminino" | "Masculino" | "Infantil" | "Esportivo" | "Conforto" | "Acess\xF3rios",
  "descricao": string,
  "transcricao": "${textInput.replace(/"/g, "'")}"
}
Texto: "${textInput}"`;
        const candidateModels = ["gemini-flash-latest", "gemini-3.8-flash"];
        for (const modelName of candidateModels) {
          try {
            const aiRes = await Promise.race([
              ai.models.generateContent({
                model: modelName,
                contents: [{ role: "user", parts: [{ text: promptInstructions }] }],
                config: { responseMimeType: "application/json" }
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 6e3))
            ]);
            const clean = (aiRes.text || "").replace(/```json/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(clean);
            if (parsed && (parsed.valor !== void 0 || parsed.categoria)) {
              return res.json({
                valor: Number(parsed.valor) || 0,
                pares: Number(parsed.pares) || 1,
                agregados: Number(parsed.agregados) || 0,
                categoria: parsed.categoria || "Feminino",
                descricao: parsed.descricao || textInput.slice(0, 60),
                transcricao: parsed.transcricao || textInput
              });
            }
          } catch (modelErr) {
            console.warn(`[Voice] Modelo ${modelName} falhou:`, modelErr.message || modelErr);
          }
        }
      }
      if (textInput) {
        const extracted = extractSaleFromText(textInput);
        return res.json(extracted);
      }
      return res.status(422).json({
        error: "N\xE3o foi poss\xEDvel transcrever o \xE1udio gravado. Fale um pouco mais alto ou digite a venda."
      });
    } catch (err) {
      console.error("Erro geral na rota /api/transcribe-voice:", err);
      res.status(500).json({ error: "Erro interno no processamento de voz: " + (err.message || String(err)) });
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
