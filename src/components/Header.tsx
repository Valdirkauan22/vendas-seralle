import React, { useState, useEffect } from "react";
import {
  Target,
  FileText,
  RefreshCw,
  HelpCircle,
  Calendar,
  BarChart3,
  ChevronDown,
  Sparkles,
  PieChart as PieIcon,
  Store,
  QrCode,
  LogOut,
  ShieldCheck,
  PlusCircle,
  Wifi,
  WifiOff,
  Cloud,
  Bell,
  HardDrive,
} from "lucide-react";
import { LogoSeralle } from "@/components/LogoSeralle";
import { useProfile } from "@/context/ProfileContext";
import { useVendas } from "@/context/VendasContext";
import { useAuth } from "@/context/AuthContext";
import { getAvatarColor, getIniciais } from "@/utils/formatters";
import { ViewMode } from "@/types";

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onOpenLancarVenda: () => void;
  onOpenMetas: () => void;
  onOpenRelatorio: () => void;
  onOpenPerfis?: () => void;
  onOpenGuia: () => void;
  onOpenInstalarMobile?: () => void;
  onOpenLembretes?: () => void;
  onOpenBackup?: () => void;
  onOpenCadastro?: () => void;
}

export function Header({
  viewMode,
  setViewMode,
  onOpenLancarVenda,
  onOpenMetas,
  onOpenRelatorio,
  onOpenPerfis,
  onOpenGuia,
  onOpenInstalarMobile,
  onOpenLembretes,
  onOpenBackup,
  onOpenCadastro,
}: HeaderProps) {
  const { user, userProfile, sair } = useAuth();
  const { perfilAtivo, isSyncing, lastSync, syncCode } = useProfile();
  const { sincronizarAgora } = useVendas();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const nomeExibicao = userProfile?.displayName || user?.displayName || perfilAtivo?.nome || "Vendedora";
  const corAvatar = perfilAtivo ? getAvatarColor(perfilAtivo.id) : "#0082D7";
  const iniciais = getIniciais(nomeExibicao);

  return (
    <header
      className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs pt-9 md:pt-0 app-header-safe"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Official Serallê Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <LogoSeralle size="sm" />
            <div className="hidden xl:block pl-3 border-l border-slate-200 text-left">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">
                Diário Oficial
              </p>
              <p className="text-xs font-semibold text-[#0082D7] leading-tight">
                Vendas & Metas
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 gap-1">
            <button
              onClick={() => setViewMode("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "dashboard"
                  ? "bg-white text-[#0082D7] shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Painel</span>
            </button>

            <button
              onClick={() => setViewMode("calendario")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "calendario"
                  ? "bg-white text-[#0082D7] shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendário</span>
            </button>

            <button
              onClick={() => setViewMode("analises")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "analises"
                  ? "bg-white text-[#0082D7] shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <PieIcon className="w-3.5 h-3.5 text-purple-600" />
              <span>Gráficos & Tendências</span>
            </button>

            <button
              onClick={() => setViewMode("loja")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "loja"
                  ? "bg-white text-[#0082D7] shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Store className="w-3.5 h-3.5 text-amber-600" />
              <span>Visão da Loja</span>
            </button>

            <button
              onClick={() => setViewMode("historico-metas")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "historico-metas"
                  ? "bg-white text-[#0082D7] shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Histórico de Cotas</span>
            </button>
          </nav>

          {/* Right Action Tools & Profile */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Direct Quick Sale Button (Desktop only - on mobile it sits prominently in BottomNav) */}
            <button
              onClick={onOpenLancarVenda}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-extrabold shadow-md shadow-blue-700/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              title="Lançar Nova Venda de Hoje"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>Lançar Venda</span>
            </button>

            {/* Quick Sync & Online/Offline Status Indicator */}
            <button
              onClick={() => sincronizarAgora()}
              disabled={isSyncing}
              title={
                !isOnline
                  ? "Modo Offline: Suas vendas estão gravadas com segurança no celular e sincronizarão assim que a internet voltar."
                  : isSyncing
                  ? "Sincronizando com a Nuvem Serallê..."
                  : `Nuvem Sincronizada (Última vez: ${lastSync || "Agora"} · Código: ${syncCode || "—"})`
              }
              className={`p-2 sm:px-3 sm:py-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                !isOnline
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : isSyncing
                  ? "bg-blue-50 border-blue-300 text-blue-800"
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              {!isOnline ? (
                <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
              ) : isSyncing ? (
                <RefreshCw className="w-4 h-4 text-[#0082D7] animate-spin shrink-0" />
              ) : (
                <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
              )}

              <span className="hidden lg:inline font-bold">
                {!isOnline
                  ? "Offline (Local)"
                  : isSyncing
                  ? "Salvando..."
                  : "Nuvem Ok"}
              </span>

              {/* Status indicator dot */}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  !isOnline
                    ? "bg-amber-500 animate-pulse"
                    : isSyncing
                    ? "bg-blue-500 animate-ping"
                    : "bg-emerald-500"
                }`}
              />
            </button>

            {/* Metas Modal Button (Desktop) */}
            <button
              onClick={onOpenMetas}
              title="Configurar Metas"
              className="hidden sm:flex p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 items-center gap-1.5 text-xs font-semibold transition-colors"
            >
              <Target className="w-4 h-4 text-emerald-600" />
              <span>Metas</span>
            </button>

            {/* Relatório Modal Button */}
            <button
              onClick={onOpenRelatorio}
              title="Relatório Mensal"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-blue-50/80 hover:bg-blue-100/80 text-[#0082D7] border border-blue-200/60 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#0082D7]" />
              <span className="hidden md:inline">Relatório</span>
            </button>

            {/* Backup & Proteção Button */}
            {onOpenBackup && (
              <button
                onClick={onOpenBackup}
                title="Backup & Proteção de Dados (Exportar / Restaurar)"
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 border border-emerald-200 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
              >
                <HardDrive className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="hidden md:inline">Backup</span>
              </button>
            )}

            {/* Lembretes & Alertas Button */}
            {onOpenLembretes && (
              <button
                onClick={onOpenLembretes}
                title="Lembretes & Alertas Inteligentes (Fechamento de Turno e Ritmo)"
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer relative"
              >
                <Bell className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="hidden xl:inline">Alertas</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              </button>
            )}

            {/* Seller Profile Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200 transition-all text-left cursor-pointer"
              >
                {userProfile?.photoURL || user?.photoURL ? (
                  <img
                    src={userProfile?.photoURL || user?.photoURL || ""}
                    alt={nomeExibicao}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover shadow-xs border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    style={{ backgroundColor: corAvatar }}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-xs"
                  >
                    {iniciais}
                  </div>
                )}
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                    {nomeExibicao}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                    {userProfile?.loja || "Vendedora Serallê"}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Conta Conectada
                        </p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Seguro
                        </span>
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 truncate mt-0.5">
                        {nomeExibicao}
                      </p>
                      {user?.email && (
                        <p className="text-[11px] text-slate-500 font-medium truncate">
                          {user.email}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60">
                        <span className="text-[11px] text-[#0082D7] font-bold bg-sky-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1 truncate max-w-[170px]">
                          🏬 {userProfile?.loja || "Serallê Calçados"}
                        </span>
                        {onOpenCadastro && (
                          <button
                            type="button"
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              onOpenCadastro();
                            }}
                            className="text-[10px] font-extrabold text-[#0082D7] hover:underline cursor-pointer ml-1 shrink-0"
                          >
                            Alterar
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="py-1">
                      {onOpenCadastro && (
                        <button
                          id="btn-meu-cadastro"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            onOpenCadastro();
                          }}
                          className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 text-xs font-bold text-[#0082D7] bg-sky-50/70 hover:bg-sky-100/70 border-b border-slate-100 cursor-pointer transition-colors"
                        >
                          <Store className="w-4 h-4 text-[#0082D7] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 leading-tight">Meu Cadastro & Filial</p>
                            <p className="text-[10px] text-[#0082D7] font-medium truncate">
                              {userProfile?.loja || "Informar unidade (ex: Cianorte)"}
                            </p>
                          </div>
                          <span className="text-[10px] bg-white text-[#0082D7] font-bold px-1.5 py-0.5 rounded border border-sky-200 shrink-0">
                            Editar
                          </span>
                        </button>
                      )}
                      {onOpenLembretes && (
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            onOpenLembretes();
                          }}
                          className="w-full px-4 py-2 text-left flex items-center gap-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 cursor-pointer"
                        >
                          <Bell className="w-4 h-4 text-amber-600" />
                          <span>⏰ Lembretes & Fechamento de Turno</span>
                        </button>
                      )}
                      {onOpenBackup && (
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            onOpenBackup();
                          }}
                          className="w-full px-4 py-2 text-left flex items-center gap-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                        >
                          <HardDrive className="w-4 h-4 text-emerald-600" />
                          <span>💾 Backup & Proteção dos Dados</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onOpenGuia();
                        }}
                        className="w-full px-4 py-2 text-left flex items-center gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <HelpCircle className="w-4 h-4 text-slate-500" />
                        <span>Como usar o Diário</span>
                      </button>

                      <button
                        id="btn-sair-conta"
                        onClick={async () => {
                          setProfileDropdownOpen(false);
                          await sair();
                        }}
                        className="w-full px-4 py-2.5 text-left flex items-center gap-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border-t border-slate-100 mt-1 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Sair da Conta / Tela de Login</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
