import React, { useState, useRef } from "react";
import {
  X,
  ShieldCheck,
  Download,
  Upload,
  Cloud,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Info,
  HardDrive,
} from "lucide-react";
import { useVendas } from "@/context/VendasContext";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";

interface BackupModalProps {
  onClose: () => void;
}

export function BackupModal({ onClose }: BackupModalProps) {
  const { exportarBackup, importarBackup, restaurarPorCodigo, dias, configs, sincronizarAgora } = useVendas();
  const { user, userProfile, isModoOffline } = useAuth();
  const { syncCode, isSyncing, lastSync } = useProfile();

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSyncCode, setCopiedSyncCode] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [codigoRestaurarInput, setCodigoRestaurarInput] = useState("");
  const [restoringCodigo, setRestoringCodigo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const totalDiasGravados = Object.keys(dias).length;
  const totalMesesConfigurados = Object.keys(configs).length;

  // 1. Download do Arquivo JSON de Backup
  const handleBaixarBackup = () => {
    try {
      const jsonStr = exportarBackup();
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10);
      const fileName = `backup_seralle_vendas_${datePart}.json`;

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setFeedback({
        type: "success",
        text: `Arquivo "${fileName}" baixado com sucesso! Guarde-o em seus arquivos, Google Drive ou WhatsApp.`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: "Erro ao gerar arquivo de backup: " + (err.message || "Tente novamente."),
      });
    }
  };

  // 2. Copiar Texto do Backup para Área de Transferência
  const handleCopiarBackup = async () => {
    try {
      const jsonStr = exportarBackup();
      await navigator.clipboard.writeText(jsonStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      setFeedback({
        type: "success",
        text: "Código de backup copiado! Você pode colar nas suas anotações ou no WhatsApp.",
      });
    } catch {
      setFeedback({
        type: "error",
        text: "Não foi possível copiar automaticamente para a área de transferência.",
      });
    }
  };

  // 3. Importar / Restaurar Arquivo Selecionado
  const handleArquivoSelecionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const result = await importarBackup(content);
        if (result.success) {
          setFeedback({
            type: "success",
            text: result.message,
          });
        } else {
          setFeedback({
            type: "error",
            text: result.message,
          });
        }
      } catch (err: any) {
        setFeedback({
          type: "error",
          text: "Erro ao ler o arquivo de backup: " + err.message,
        });
      } finally {
        setRestoring(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      setRestoring(false);
      setFeedback({
        type: "error",
        text: "Falha ao abrir o arquivo selecionado.",
      });
    };

    reader.readAsText(file);
  };

  // 4. Sincronizar Nuvem
  const handleSincronizarNuvem = async () => {
    setCloudSyncing(true);
    setFeedback(null);
    try {
      const ok = await sincronizarAgora();
      if (ok) {
        setFeedback({
          type: "success",
          text: "Sincronização em nuvem concluída com sucesso!",
        });
      } else {
        setFeedback({
          type: "error",
          text: "Não foi possível sincronizar no momento. Verifique sua conexão.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: "Erro ao sincronizar: " + (err.message || "Tente novamente."),
      });
    } finally {
      setCloudSyncing(false);
    }
  };

  // 5. Copiar Código de Sincronização
  const handleCopiarSyncCode = async () => {
    if (!syncCode) return;
    try {
      await navigator.clipboard.writeText(syncCode);
      setCopiedSyncCode(true);
      setTimeout(() => setCopiedSyncCode(false), 2500);
      setFeedback({
        type: "success",
        text: `Código "${syncCode}" copiado! Guarde este código para restaurar suas vendas após desinstalar ou em outro aparelho.`,
      });
    } catch {
      setFeedback({
        type: "error",
        text: "Não foi possível copiar o código.",
      });
    }
  };

  // 6. Restaurar da Nuvem por Código de Sincronização
  const handleRestaurarPorCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = codigoRestaurarInput.trim().toUpperCase();
    if (!code) {
      setFeedback({
        type: "error",
        text: "Digite o código de sincronização para restaurar.",
      });
      return;
    }
    setRestoringCodigo(true);
    setFeedback(null);
    try {
      const res = await restaurarPorCodigo(code);
      if (res.success) {
        setFeedback({
          type: "success",
          text: res.message,
        });
        setCodigoRestaurarInput("");
      } else {
        setFeedback({
          type: "error",
          text: res.message,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: "Erro ao consultar a nuvem: " + (err.message || "Tente novamente."),
      });
    } finally {
      setRestoringCodigo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0082D7] text-white flex items-center justify-center shadow-md shadow-[#0082D7]/20 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                Proteção & Backup dos Dados
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Garanta que suas vendas e metas nunca sejam perdidas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 text-sm">
          {/* Status Alert / Feedback */}
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 animate-in fade-in ${
                feedback.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border border-rose-200 text-rose-900"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{feedback.text}</div>
            </div>
          )}

          {/* Card Resumo do Armazenamento */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                <HardDrive className="w-5 h-5 text-[#0082D7]" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900">
                  Dados Gravados Neste Aparelho
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {totalDiasGravados} dias com lançamentos · {totalMesesConfigurados} meses de metas
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Seguro
              </span>
            </div>
          </div>

          {/* ─── OPÇÃO 1: EXPORTAR BACKUP EM ARQUIVO (A mais segura) ─── */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-[#0082D7] flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  1. Salvar Backup no Celular ou Drive
                </h4>
                <p className="text-[11px] text-slate-500">
                  Baixe um arquivo seguro com todos os seus lançamentos e metas.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Se você for desinstalar o app ou trocar de celular, baixe este arquivo. Ao reinstalar o aplicativo, basta carregá-lo para ter tudo de volta!
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleBaixarBackup}
                className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-[#0082D7] hover:bg-[#0072C6] active:scale-[0.99] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileJson className="w-4 h-4" />
                <span>Baixar Arquivo (.json)</span>
              </button>

              <button
                type="button"
                onClick={handleCopiarBackup}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copiado!" : "Copiar Texto"}</span>
              </button>
            </div>
          </div>

          {/* ─── OPÇÃO 2: RESTAURAR BACKUP DE ARQUIVO ─── */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  2. Restaurar de um Backup
                </h4>
                <p className="text-[11px] text-slate-500">
                  Reinstalou o app ou trocou de celular? Recupere tudo aqui.
                </p>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleArquivoSelecionado}
              accept=".json,application/json"
              className="hidden"
              id="backup-file-input"
            />

            <button
              type="button"
              disabled={restoring}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-2xs"
            >
              {restoring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#0082D7]" />
                  <span>Restaurando dados...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>Selecionar Arquivo de Backup (.json)</span>
                </>
              )}
            </button>
          </div>

          {/* ─── OPÇÃO 3: NUVEM & CONTA ─── */}
          <div className="p-4 sm:p-5 rounded-2xl border border-blue-100 bg-blue-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    3. Nuvem & Conta Google
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {user ? (
                      <span className="text-emerald-700 font-bold">
                        Conectado: {user.email || userProfile?.displayName}
                      </span>
                    ) : (
                      "Modo Local / Offline"
                    )}
                  </p>
                </div>
              </div>

              {syncCode && (
                <button
                  type="button"
                  onClick={handleSincronizarNuvem}
                  disabled={cloudSyncing || isSyncing}
                  className="py-1.5 px-2.5 rounded-lg bg-white border border-blue-200 text-[#0082D7] text-xs font-bold hover:bg-blue-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cloudSyncing || isSyncing ? "animate-spin" : ""}`} />
                  <span>Sincronizar</span>
                </button>
              )}
            </div>

            {/* Sync Code Box */}
            {syncCode && (
              <div className="p-3 bg-white rounded-xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Seu Código de Sincronização
                  </span>
                  <span className="text-base font-mono font-black text-[#0082D7] tracking-wider">
                    {syncCode}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopiarSyncCode}
                    className="flex-1 sm:flex-none py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 active:scale-95 text-[#0082D7] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedSyncCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSyncCode ? "Copiado!" : "Copiar Código"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSincronizarNuvem}
                    disabled={cloudSyncing || isSyncing}
                    className="flex-1 sm:flex-none py-1.5 px-3 rounded-lg bg-[#0082D7] hover:bg-[#0072C6] active:scale-95 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${cloudSyncing || isSyncing ? "animate-spin" : ""}`} />
                    <span>Sincronizar Agora</span>
                  </button>
                </div>
              </div>
            )}

            {/* Formulário para Restaurar por Código */}
            <form onSubmit={handleRestaurarPorCodigo} className="pt-2 border-t border-blue-100 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Digitar outro código para restaurar..."
                value={codigoRestaurarInput}
                onChange={(e) => setCodigoRestaurarInput(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-[#0082D7]"
              />
              <button
                type="submit"
                disabled={restoringCodigo}
                className="py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
              >
                {restoringCodigo ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Restaurar por Código</span>
              </button>
            </form>

            <p className="text-xs text-slate-600 leading-relaxed">
              {user ? (
                <>
                  Sua conta está conectada à nuvem da Serallê. Seus lançamentos são salvos automaticamente. Mesmo desinstalando, basta fazer login com a mesma <strong>Conta Google</strong> ou e-mail para restaurar.
                </>
              ) : (
                <>
                  Você está usando o app no modo offline. Recomendamos baixar o <strong>Arquivo de Backup</strong> antes de desinstalar, ou conectar uma <strong>Conta Google</strong> na tela de login para ter salvamento perpétuo na nuvem.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            Diário Serallê · Proteção de Dados
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
