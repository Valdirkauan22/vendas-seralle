import React, { useState, useEffect } from "react";
import {
  Bell,
  Clock,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  Send,
  X,
  Flame,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { LembretesConfig } from "@/types";
import {
  getLembretesConfig,
  saveLembretesConfig,
  getNotificationPermission,
  requestNotificationPermission,
  sendNativeNotification,
  playChimeNotification,
} from "@/utils/notifications";

interface LembretesModalProps {
  onClose: () => void;
  onOpenLancarVenda?: () => void;
}

const HORARIOS_FECHAMENTO_RAPIDOS = ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"];
const HORARIOS_RITMO_RAPIDOS = ["13:30", "14:00", "14:30", "15:00", "16:00"];

export function LembretesModal({ onClose, onOpenLancarVenda }: LembretesModalProps) {
  const [config, setConfig] = useState<LembretesConfig>(getLembretesConfig());
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    getNotificationPermission()
  );
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermission());
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  const handleRequestPermission = async () => {
    setTestStatus("Solicitando permissão...");
    try {
      const result = await requestNotificationPermission();
      setPermission(result);

      if (result === "granted") {
        const updated = { ...config, notificacaoNavegador: true };
        setConfig(updated);
        saveLembretesConfig(updated);
        setTestStatus("Permissão concedida com sucesso! Enviando notificação de teste...");
        await sendNativeNotification("🔔 Diário Serallê: Notificações Ativadas!", {
          body: "Perfeito! Você receberá os lembretes de fechamento de turno e ritmo no seu aparelho.",
        });
      } else if (result === "denied") {
        setTestStatus(
          "As notificações estão bloqueadas no sistema/navegador. Nas 'Configurações do Celular' > 'Aplicativos' > 'Diário Serallê' > 'Notificações', ative a chave de notificações."
        );
      } else {
        // Quando o sistema do Android não mostra prompt dinâmico ou permanece em 'default'
        setTestStatus(
          "Caso o aviso não apareça na tela, confirme se as notificações do app estão permitidas nas configurações do celular."
        );
      }
    } catch (err) {
      console.warn("Erro ao solicitar:", err);
      setTestStatus("Não foi possível solicitar automaticamente. Verifique as configurações de notificações do aplicativo no celular.");
    }
  };

  const handleSalvar = () => {
    saveLembretesConfig(config);
    onClose();
  };

  const handleTestarAlerta = async () => {
    setTestStatus("Disparando alerta de teste...");
    const sent = await sendNativeNotification("⏰ Diário Serallê · Fim de Expediente", {
      body: "Hora de fechar o turno! Não esqueça de lançar os atendimentos e vendas de hoje para garantir seu ranking e comissão.",
      sound: true,
      type: "fechamento",
    });

    if (sent) {
      setTestStatus("Notificação enviada com sucesso para a barra de status do aparelho!");
    } else {
      setTestStatus("Alerta sonoro e banner na tela disparados com sucesso!");
    }

    setTimeout(() => {
      setTestStatus(null);
    }, 4500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-amber-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Lembretes & Alertas Inteligentes
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Notificações de fechamento de turno e ritmo diário
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-700 text-sm">
          {/* Status da Permissão de Notificações do Aparelho */}
          <div className="p-3.5 sm:p-4 rounded-2xl border transition-all bg-slate-50 border-slate-200">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-[#0082D7] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Notificações no Celular / Navegador
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {permission === "granted"
                      ? "Autorizado: você receberá os avisos na barra de notificações."
                      : permission === "denied"
                      ? "Bloqueado nas configurações do navegador/celular."
                      : "Receba alertas mesmo com o app em segundo plano."}
                  </p>
                </div>
              </div>

              {permission === "granted" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Ativo
                </span>
              ) : permission === "denied" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Bloqueado
                </span>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleRequestPermission}
                    className="px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-bold shadow-xs cursor-pointer transition-all shrink-0"
                  >
                    Permitir Agora
                  </button>
                </div>
              )}
            </div>

            {permission !== "granted" && (
              <div className="mt-3 pt-2.5 border-t border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2 bg-blue-50/70 p-2.5 rounded-xl">
                <Sparkles className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-900">
                    Sons e alertas em tela continuam funcionando 100%!
                  </p>
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    <b>No celular Android (Xiaomi/MIUI):</b> Se o botão nas configurações do Android estiver cinza/bloqueado com a mensagem <i>"Este app não recebeu nenhuma notificação ainda"</i>, isso ocorre porque o instalador APK antigo não possui o canal de notificações registrado no sistema.
                  </p>
                  <p className="text-[10px] text-blue-900 font-medium leading-relaxed bg-white/70 p-1.5 rounded-lg border border-blue-200/60">
                    💡 <b>Como ativar notificações na barra do Android:</b> Abra o link no <b>Google Chrome</b> do celular, toque nos <b>3 pontinhos (⋮)</b> e selecione <b>"Instalar aplicativo"</b>. O Chrome libera automaticamente o canal de notificações do sistema!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Seção 1: Fechamento do Turno */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-700" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  1. Alerta de Fechamento do Turno
                </h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.fechamentoTurnoAtivo}
                  onChange={(e) =>
                    setConfig({ ...config, fechamentoTurnoAtivo: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-700" />
              </label>
            </div>

            <p className="text-xs text-slate-500">
              Avisa no fim do seu expediente para registrar os atendimentos e vendas do dia antes de ir embora.
            </p>

            {config.fechamentoTurnoAtivo && (
              <div className="pt-2 border-t border-slate-100 space-y-2.5 animate-in fade-in duration-150">
                <label className="text-xs font-bold text-slate-700 block">
                  Horário do Fim de Expediente:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {HORARIOS_FECHAMENTO_RAPIDOS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setConfig({ ...config, horarioFechamento: h })}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        config.horarioFechamento === h
                          ? "bg-blue-700 text-white border-blue-700 shadow-2xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                  <input
                    type="time"
                    value={config.horarioFechamento}
                    onChange={(e) =>
                      setConfig({ ...config, horarioFechamento: e.target.value })
                    }
                    className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-800 w-24"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Seção 2: Aviso de Ritmo de Vendas (Pacing) */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  2. Aviso de Ritmo de Vendas (Pacing)
                </h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.avisoRitmoAtivo}
                  onChange={(e) =>
                    setConfig({ ...config, avisoRitmoAtivo: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
              </label>
            </div>

            <p className="text-xs text-slate-500">
              Faz o cálculo dinâmico a meio do turno informando quantos pares ou vendas faltam para bater o ritmo diário da cota.
            </p>

            {config.avisoRitmoAtivo && (
              <div className="pt-2 border-t border-slate-100 space-y-2.5 animate-in fade-in duration-150">
                <label className="text-xs font-bold text-slate-700 block">
                  Horário do Cheque Intermediário:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {HORARIOS_RITMO_RAPIDOS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setConfig({ ...config, horarioAvisoRitmo: h })}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        config.horarioAvisoRitmo === h
                          ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                  <input
                    type="time"
                    value={config.horarioAvisoRitmo}
                    onChange={(e) =>
                      setConfig({ ...config, horarioAvisoRitmo: e.target.value })
                    }
                    className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-800 w-24"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Seção 3: Som do Sinal */}
          <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {config.somHabilitado ? (
                <Volume2 className="w-5 h-5 text-blue-700 shrink-0" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-400 shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold text-slate-900">Sinal Sonoro Discreto</p>
                <p className="text-[11px] text-slate-500">
                  Toca o chime suave Serallê ao disparar alertas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={playChimeNotification}
                className="px-2.5 py-1 text-[11px] font-bold text-blue-800 bg-blue-100/70 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
              >
                Ouvir Som
              </button>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.somHabilitado}
                  onChange={(e) =>
                    setConfig({ ...config, somHabilitado: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-700" />
              </label>
            </div>
          </div>

          {/* Mensagem de status de teste */}
          {testStatus && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <Sparkles className="w-4 h-4 text-[#0082D7] shrink-0" />
              <span>{testStatus}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleTestarAlerta}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-blue-700" />
            <span>Testar Alerta Agora</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-black shadow-md shadow-blue-700/20 transition-all cursor-pointer"
            >
              Salvar Preferências
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
