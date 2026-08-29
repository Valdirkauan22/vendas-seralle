import React, { useState } from "react";
import {
  ShoppingBag,
  Users,
  Target,
  FileText,
  RefreshCw,
  HelpCircle,
  Calendar,
  BarChart3,
  ChevronDown,
  Sparkles,
  Check,
  PieChart as PieIcon,
  Store,
} from "lucide-react";
import { useProfile } from "@/context/ProfileContext";
import { useVendas } from "@/context/VendasContext";
import { getAvatarColor, getIniciais } from "@/utils/formatters";
import { ViewMode } from "@/types";

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onOpenMetas: () => void;
  onOpenRelatorio: () => void;
  onOpenPerfis: () => void;
  onOpenGuia: () => void;
}

export function Header({
  viewMode,
  setViewMode,
  onOpenMetas,
  onOpenRelatorio,
  onOpenPerfis,
  onOpenGuia,
}: HeaderProps) {
  const { perfis, perfilAtivo, selecionarPerfil, isSyncing, lastSync, syncCode } = useProfile();
  const { sincronizarAgora } = useVendas();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const corAvatar = perfilAtivo ? getAvatarColor(perfilAtivo.id) : "#1A6BB5";
  const iniciais = perfilAtivo ? getIniciais(perfilAtivo.nome) : "V";

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center text-white shadow-md shadow-blue-900/10">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
                  SERALLÊ
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
                  Calçados
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500">
                Diário de Vendas & Metas
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 gap-1">
            <button
              onClick={() => setViewMode("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "dashboard"
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
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
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
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
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
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
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
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
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Histórico de Cotas</span>
            </button>
          </nav>

          {/* Right Action Tools & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Sync Button */}
            <button
              onClick={() => sincronizarAgora()}
              disabled={isSyncing}
              title={`Sincronização em Nuvem (Código: ${syncCode || "—"})`}
              className="p-2 sm:px-3 sm:py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 text-xs font-semibold transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 text-blue-600 ${isSyncing ? "animate-spin text-blue-500" : ""}`}
              />
              <span className="hidden lg:inline">
                {isSyncing ? "Sincronizando..." : "Sincronizar"}
              </span>
              {lastSync && !isSyncing && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 hidden sm:inline-block" />
              )}
            </button>

            {/* Metas Modal Button */}
            <button
              onClick={onOpenMetas}
              className="p-2 sm:px-3 sm:py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 text-xs font-semibold transition-colors"
            >
              <Target className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Metas</span>
            </button>

            {/* Relatório Modal Button */}
            <button
              onClick={onOpenRelatorio}
              className="p-2 sm:px-3 sm:py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 flex items-center gap-1.5 text-xs font-semibold transition-colors"
            >
              <FileText className="w-4 h-4 text-blue-700" />
              <span className="hidden sm:inline">Relatório</span>
            </button>

            {/* Seller Profile Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200 transition-all text-left"
              >
                <div
                  style={{ backgroundColor: corAvatar }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-xs"
                >
                  {iniciais}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[100px]">
                    {perfilAtivo?.nome || "Vendedora"}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                    Vendedora
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
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Vendedora Ativa
                      </p>
                      <p className="text-sm font-bold text-slate-900 truncate mt-0.5">
                        {perfilAtivo?.nome}
                      </p>
                    </div>

                    <div className="max-h-56 overflow-y-auto py-1">
                      <p className="px-4 py-1 text-[11px] font-semibold text-slate-400">
                        Trocar Perfil:
                      </p>
                      {perfis.map((p) => {
                        const ativo = p.id === perfilAtivo?.id;
                        const c = getAvatarColor(p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              selecionarPerfil(p.id);
                              setProfileDropdownOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                style={{ backgroundColor: c }}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                              >
                                {getIniciais(p.nome)}
                              </div>
                              <span
                                className={`text-xs font-semibold ${
                                   ativo ? "text-blue-700" : "text-slate-700"
                                }`}
                              >
                                {p.nome}
                              </span>
                            </div>
                            {ativo && <Check className="w-4 h-4 text-blue-700" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="border-t border-slate-100 pt-1 mt-1">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onOpenPerfis();
                        }}
                        className="w-full px-4 py-2 text-left flex items-center gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Users className="w-4 h-4 text-slate-500" />
                        <span>Gerenciar Vendedoras & Nuvem</span>
                      </button>
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onOpenGuia();
                        }}
                        className="w-full px-4 py-2 text-left flex items-center gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <HelpCircle className="w-4 h-4 text-slate-500" />
                        <span>Como usar o Diário</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-slate-100 overflow-x-auto gap-1">
          <button
            onClick={() => setViewMode("dashboard")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
              viewMode === "dashboard"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Painel</span>
          </button>

          <button
            onClick={() => setViewMode("calendario")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
              viewMode === "calendario"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendário</span>
          </button>

          <button
            onClick={() => setViewMode("analises")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
              viewMode === "analises"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Gráficos</span>
          </button>

          <button
            onClick={() => setViewMode("loja")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
              viewMode === "loja"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Loja</span>
          </button>

          <button
            onClick={() => setViewMode("historico-metas")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
              viewMode === "historico-metas"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Cotas</span>
          </button>
        </div>
      </div>
    </header>
  );
}
