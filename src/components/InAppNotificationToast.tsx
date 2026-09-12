import React, { useState, useEffect } from "react";
import { Bell, Clock, Flame, X, ArrowRight, Volume2 } from "lucide-react";

export interface SeralleAlertDetail {
  id?: string;
  title: string;
  body: string;
  type?: "fechamento" | "ritmo" | "geral";
}

interface InAppNotificationToastProps {
  onOpenLancarVenda: () => void;
}

export function InAppNotificationToast({ onOpenLancarVenda }: InAppNotificationToastProps) {
  const [currentAlert, setCurrentAlert] = useState<SeralleAlertDetail | null>(null);

  useEffect(() => {
    const handleNotification = (e: Event) => {
      const customEvent = e as CustomEvent<SeralleAlertDetail>;
      if (customEvent.detail) {
        setCurrentAlert({
          id: String(Date.now()),
          ...customEvent.detail,
        });
      }
    };

    window.addEventListener("seralle-notification", handleNotification);
    return () => {
      window.removeEventListener("seralle-notification", handleNotification);
    };
  }, []);

  if (!currentAlert) return null;

  const isRitmo = currentAlert.type === "ritmo" || currentAlert.title.toLowerCase().includes("ritmo");
  const isFechamento = currentAlert.type === "fechamento" || currentAlert.title.toLowerCase().includes("expediente") || currentAlert.title.toLowerCase().includes("fechamento");

  const handleAction = () => {
    onOpenLancarVenda();
    setCurrentAlert(null);
  };

  return (
    <div className="fixed top-3 left-3 right-3 sm:top-5 sm:left-auto sm:right-5 sm:max-w-md z-[100] animate-in slide-in-from-top-4 duration-300">
      <div className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all ${
        isRitmo
          ? "bg-slate-900/95 border-amber-500/40 text-white"
          : "bg-slate-900/95 border-blue-500/40 text-white"
      }`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
            isRitmo ? "bg-amber-500 text-slate-950" : "bg-[#0082D7] text-white"
          }`}>
            {isRitmo ? (
              <Flame className="w-5 h-5" />
            ) : isFechamento ? (
              <Clock className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-sky-200">
                Lembrete Serallê
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <Volume2 className="w-3 h-3 text-emerald-400" />
                Sinal Ativo
              </span>
            </div>

            <h4 className="text-sm font-extrabold text-white mt-1 leading-snug">
              {currentAlert.title}
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed line-clamp-3">
              {currentAlert.body}
            </p>

            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleAction}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#0082D7] to-[#006BB5] hover:from-[#0070B8] hover:to-[#005A99] text-white text-xs font-black shadow-md cursor-pointer transition-all active:scale-95"
              >
                <span>Lançar Vendas de Hoje</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentAlert(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Dispensar
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentAlert(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
