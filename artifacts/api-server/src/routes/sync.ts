import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, syncProfilesTable, syncDiasTable, syncConfigsTable } from "@workspace/db";

const router = Router();

// GET /api/sync/:syncCode — pull all data for a sync code
router.get("/sync/:syncCode", async (req, res) => {
  const { syncCode } = req.params;
  if (!syncCode || syncCode.length < 4) {
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
  if (!syncCode || syncCode.length < 4) {
    res.status(400).json({ error: "Código de sincronização inválido" });
    return;
  }

  const { profiles, dias, configs } = req.body as {
    profiles: Array<{ profileId: string; nome: string }>;
    dias: Array<{ profileId: string; data: string; itensJson: string; margem: string }>;
    configs: Array<{ profileId: string; mesId: string; configJson: string }>;
  };

  try {
    // Upsert profiles
    if (profiles?.length) {
      await db
        .insert(syncProfilesTable)
        .values(profiles.map((p) => ({ syncCode, profileId: p.profileId, nome: p.nome })))
        .onConflictDoUpdate({
          target: [syncProfilesTable.syncCode, syncProfilesTable.profileId],
          set: { nome: syncProfilesTable.nome, updatedAt: new Date() },
        });
    }

    // Upsert dias
    if (dias?.length) {
      await db
        .insert(syncDiasTable)
        .values(dias.map((d) => ({
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
    if (configs?.length) {
      await db
        .insert(syncConfigsTable)
        .values(configs.map((c) => ({
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
