import React, { useState } from "react";
import {
  X,
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Check,
  Cloud,
  Copy,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useProfile } from "@/context/ProfileContext";
import { useVendas } from "@/context/VendasContext";
import { getAvatarColor, getIniciais } from "@/utils/formatters";

interface PerfisModalProps {
  onClose: () => void;
}

export function PerfisModal({ onClose }: PerfisModalProps) {
  const {
    perfis,
    perfilAtivo,
    criarPerfil,
    selecionarPerfil,
    renomearPerfil,
    excluirPerfil,
    syncCode,
    setSyncCode,
    gerarNovoSyncCode,
    isSyncing,
    lastSync,
  } = useProfile();

  const { sincronizarAgora } = useVendas();

  const [novoNome, setNovoNome] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState("");

  const [inputSyncCode, setInputSyncCode] = useState("");
  const [copiedSync, setCopiedSync] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const handleCriarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    await criarPerfil(novoNome);
    setNovoNome("");
  };

  const handleStartEdit = (id: string, nomeAtual: string) => {
    setEditingId(id);
    setEditingNome(nomeAtual);
  };

  const handleSaveEdit = async (id: string) => {
    if (editingNome.trim()) {
      await renomearPerfil(id, editingNome);
    }
    setEditingId(null);
  };

  const handleCopySyncCode = () => {
    if (!syncCode) return;
    navigator.clipboard.writeText(syncCode);
    setCopiedSync(true);
    setTimeout(() => setCopiedSync(false), 2000);
  };

  const handleConectarSyncCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = inputSyncCode.trim().toUpperCase();
    if (code.length < 4) return;

    await setSyncCode(code);
    setInputSyncCode("");
    setSyncStatusMsg("Conectando e sincronizando dados da nuvem...");
    const ok = await sincronizarAgora();
    if (ok) {
      setSyncStatusMsg("Dados sincronizados com sucesso!");
    } else {
      setSyncStatusMsg("Código vinculado. Novos dados serão sincronizados.");
    }
    setTimeout(() => setSyncStatusMsg(null), 4000);
  };

  const handleManualSync = async () => {
    setSyncStatusMsg("Sincronizando...");
    const ok = await sincronizarAgora();
    setSyncStatusMsg(ok ? "Sincronização concluída!" : "Erro ao sincronizar com o servidor.");
    setTimeout(() => setSyncStatusMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Vendedoras & Sincronização
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Alterne perfis de atendimento e sincronize dados entre dispositivos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* ─── Profile Management ────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Perfis de Vendedoras ({perfis.length})
              </h4>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {perfis.map((p) => {
                const ativo = p.id === perfilAtivo?.id;
                const isEditing = editingId === p.id;
                const cor = getAvatarColor(p.id);

                return (
                  <div
                    key={p.id}
                    className={`p-3 sm:p-4 flex items-center justify-between transition-colors ${
                      ativo ? "bg-blue-50/40" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        style={{ backgroundColor: cor }}
                        className="w-10 h-10 rounded-xl text-white font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0"
                      >
                        {getIniciais(p.nome)}
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1 max-w-sm">
                          <input
                            type="text"
                            value={editingNome}
                            onChange={(e) => setEditingNome(e.target.value)}
                            autoFocus
                            className="px-3 py-1.5 text-xs font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-full"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(p.id)}
                            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-slate-900">
                              {p.nome}
                            </span>
                            {ativo && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">
                                Ativa
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            Vendedora Serallê
                          </p>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-2">
                        {!ativo && (
                          <button
                            type="button"
                            onClick={() => selecionarPerfil(p.id)}
                            className="px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100/70 bg-blue-50 rounded-lg transition-colors"
                          >
                            Selecionar
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStartEdit(p.id, p.nome)}
                          title="Renomear vendedora"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {perfis.length > 1 && (
                          <button
                            type="button"
                            onClick={() => excluirPerfil(p.id)}
                            title="Excluir perfil"
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Profile Form */}
            <form onSubmit={handleCriarPerfil} className="flex gap-2">
              <input
                type="text"
                placeholder="Nome da nova vendedora (ex: Camila Silva)..."
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="flex-1 px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!novoNome.trim()}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </form>
          </div>

          {/* ─── Cloud Sync Section ────────────────────────────────────────── */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Sincronização em Nuvem
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Mantenha seus dados salvos e acessíveis em qualquer aparelho
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Sincronizando..." : "Sincronizar Agora"}</span>
              </button>
            </div>

            {/* Sync Code Box */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Código de Sincronização Atual
                </span>
                <p className="text-xl font-black text-blue-900 font-mono tracking-widest mt-0.5">
                  {syncCode || "—"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySyncCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 transition-colors"
                >
                  {copiedSync ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSync ? "Copiado!" : "Copiar Código"}</span>
                </button>

                <button
                  type="button"
                  onClick={gerarNovoSyncCode}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors"
                >
                  Gerar Novo
                </button>
              </div>
            </div>

            {/* Connect to Existing Sync Code Form */}
            <form onSubmit={handleConectarSyncCode} className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Conectar com Código de Outro Aparelho:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Insira o código de 8 dígitos (ex: K7P9X2M4)..."
                  value={inputSyncCode}
                  onChange={(e) => setInputSyncCode(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-xl uppercase tracking-widest focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={inputSyncCode.trim().length < 4}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <span>Conectar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {syncStatusMsg && (
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{syncStatusMsg}</span>
              </div>
            )}

            {lastSync && (
              <p className="text-[11px] text-slate-400 font-medium">
                Última sincronização com sucesso em: {lastSync.toLocaleTimeString("pt-BR")}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
