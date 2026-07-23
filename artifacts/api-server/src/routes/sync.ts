import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, syncProfilesTable, syncDiasTable, syncConfigsTable } from "@workspace/db";

const router = Router();

// Validates sync code format: 4-16 uppercase alphanumeric characters
function isValidSyncCode(code: string): boolean {
  return /^[A-Z0-9]{4,16}$/.test(code);
}

// Validates that a value is a safe, non-empty string within a max length
function isSafeString(val: unknown, maxLen: number): val is string {
  return typeof val === "string" && val.length > 0 && val.length <= maxLen;
}

// Validates that a string is parseable JSON
function isValidJson(val: string): boolean {
  try { JSON.parse(val); return true; } catch { return false; }
}

// GET /api/sync/:syncCode — pull all data for a sync code
router.get("/sync/:syncCode", async (req, res) => {
  const { syncCode } = req.params;
  if (!isValidSyncCode(syncCode)) {
    res.status(400).json({ error: "Código de sincronização inválido" });
    return;
  }

  try {
    const [profiles, dias, configs] = await Promise.all([
      db.select().from(syncProfilesTable).where(eq(syncProfilesTable.syncCode, syncCode)),
      db.select().from(syncDiasTable).where(eq(syncDiasTable.syncCode, syncCode)),
      db.select().from(syncConfigsTable).where(eq(syncConfigsTable.syncCode, syncCode)),
    ]);

    res.json({ profiles, dias, configs });
  } catch (err) {
    req.log.error(err, "sync pull error");
    res.status(500).json({ error: "Erro ao buscar dados" });
  }
});

// POST /api/sync/:syncCode — push all data for a sync code
router.post("/sync/:syncCode", async (req, res) => {
  const { syncCode } = req.params;
  if (!isValidSyncCode(syncCode)) {
    res.status(400).json({ error: "Código de sincronização inválido" });
    return;
  }

  const { profiles, dias, configs } = req.body as {
    profiles: unknown;
    dias: unknown;
    configs: unknown;
  };

  // Validate top-level arrays
  if (!Array.isArray(profiles) || !Array.isArray(dias) || !Array.isArray(configs)) {
    res.status(400).json({ error: "Formato inválido: profiles, dias e configs devem ser arrays" });
    return;
  }

  // Prevent excessively large payloads
  if (profiles.length > 100) {
    res.status(400).json({ error: "Muitos perfis (máximo 100)" });
    return;
  }
  if (dias.length > 50000) {
    res.status(400).json({ error: "Muitos registros de dias (máximo 50.000)" });
    return;
  }
  if (configs.length > 5000) {
    res.status(400).json({ error: "Muitos registros de configuração (máximo 5.000)" });
    return;
  }

  // Validate profiles
  for (const p of profiles) {
    if (
      typeof p !== "object" || p === null ||
      !isSafeString((p as Record<string, unknown>).profileId, 100) ||
      !isSafeString((p as Record<string, unknown>).nome, 200)
    ) {
      res.status(400).json({ error: "Dados de perfil inválidos" });
      return;
    }
  }

  // Validate dias
  for (const d of dias) {
    if (
      typeof d !== "object" || d === null ||
      !isSafeString((d as Record<string, unknown>).profileId, 100) ||
      !isSafeString((d as Record<string, unknown>).data, 20) ||
      !isSafeString((d as Record<string, unknown>).itensJson, 200_000) ||
      !isSafeString((d as Record<string, unknown>).margem, 30)
    ) {
      res.status(400).json({ error: "Dados de dia inválidos" });
      return;
    }
    if (!isValidJson((d as Record<string, unknown>).itensJson as string)) {
      res.status(400).json({ error: "itensJson inválido" });
      return;
    }
  }

  // Validate configs
  for (const c of configs) {
    if (
      typeof c !== "object" || c === null ||
      !isSafeString((c as Record<string, unknown>).profileId, 100) ||
      !isSafeString((c as Record<string, unknown>).mesId, 20) ||
      !isSafeString((c as Record<string, unknown>).configJson, 20_000)
    ) {
      res.status(400).json({ error: "Dados de configuração inválidos" });
      return;
    }
    if (!isValidJson((c as Record<string, unknown>).configJson as string)) {
      res.status(400).json({ error: "configJson inválido" });
      return;
    }
  }

  const validProfiles = profiles as Array<{ profileId: string; nome: string }>;
  const validDias = dias as Array<{ profileId: string; data: string; itensJson: string; margem: string }>;
  const validConfigs = configs as Array<{ profileId: string; mesId: string; configJson: string }>;

  try {
    // Upsert profiles
    if (validProfiles.length > 0) {
      await db
        .insert(syncProfilesTable)
        .values(validProfiles.map((p) => ({ syncCode, profileId: p.profileId, nome: p.nome })))
        .onConflictDoUpdate({
          target: [syncProfilesTable.syncCode, syncProfilesTable.profileId],
          set: { nome: syncProfilesTable.nome, updatedAt: new Date() },
        });
    }

    // Upsert dias
    if (validDias.length > 0) {
      await db
        .insert(syncDiasTable)
        .values(validDias.map((d) => ({
          syncCode,
          profileId: d.profileId,
          data: d.data,
          itensJson: d.itensJson,
          margem: d.margem,
        })))
        .onConflictDoUpdate({
          target: [syncDiasTable.syncCode, syncDiasTable.profileId, syncDiasTable.data],
          set: { itensJson: syncDiasTable.itensJson, margem: syncDiasTable.margem, updatedAt: new Date() },
        });
    }

    // Upsert configs
    if (validConfigs.length > 0) {
      await db
        .insert(syncConfigsTable)
        .values(validConfigs.map((c) => ({
          syncCode,
          profileId: c.profileId,
          mesId: c.mesId,
          configJson: c.configJson,
        })))
        .onConflictDoUpdate({
          target: [syncConfigsTable.syncCode, syncConfigsTable.profileId, syncConfigsTable.mesId],
          set: { configJson: syncConfigsTable.configJson, updatedAt: new Date() },
        });
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "sync push error");
    res.status(500).json({ error: "Erro ao salvar dados" });
  }
});

export default router;
