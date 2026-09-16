import React, { useState } from "react";
import {
  BarChart3,
  Calendar,
  Plus,
  PieChart,
  Menu,
  Store,
  Target,
  FileText,
  Calculator,
  BookOpen,
  X,
  Sparkles,
  Bell,
  HardDrive,
} from "lucide-react";

interface BottomNavProps {
  viewMode: "dashboard" | "calendario" | "analises" | "loja" | "historico-metas";
  setViewMode: (mode: "dashboard" | "calendario" | "analises" | "loja" | "historico-metas") => void;
  onOpenLancarVenda: () => void;
  onOpenMetas: () => void;
  onOpenRelatorio: () => void;
  onOpenPerfis?: () => void;
  onOpenLembretes?: () => void;
  onOpenBackup?: () => void;
  onOpenCadastro?: () => void;
}

export function BottomNav({
  viewMode,
  setViewMode,
  onOpenLancarVenda,
  onOpenMetas,
  onOpenRelatorio,
  onOpenPerfis,
  onOpenLembretes,
  onOpenBackup,
  onOpenCadastro,
}: BottomNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSelectTab = (mode: "dashboard" | "calendario" | "analises" | "loja" | "historico-metas") => {
    setViewMode(mode);
    setMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer / Sheet for More Options */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMenuOpen(false)}
          />

          <div className="relative bg-white rounded-t-3xl p-5 shadow-2xl z-10 border-t border-slate-200 animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto">
            {/* Header of Drawer */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0082D7] flex items-center justify-center font-black text-sm">
                  S
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                    Mais Ferramentas & Vistas
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Serallê Calçados · Diário de Vendas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Grid in Drawer */}
            <div className="grid grid-cols-2 gap-2.5 py-4">
              <button
                onClick={() => handleSelectTab("loja")}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all ${
                  viewMode === "loja"
                    ? "bg-amber-50/80 border-amber-300 text-amber-900"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold leading-tight">Visão da Loja</p>
                  <p className="text-[10px] text-slate-500 font-medium">Meta geral da filial</p>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab("historico-metas")}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all ${
                  viewMode === "historico-metas"
                    ? "bg-purple-50/80 border-purple-300 text-purple-900"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold leading-tight">Histórico de Cotas</p>
                  <p className="text-[10px] text-slate-500 font-medium">Evolução por mês</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenMetas();
                }}
                className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-left flex flex-col gap-1.5 transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold leading-tight">Ajustar Metas</p>
                  <p className="text-[10px] text-slate-500 font-medium">Comissões e cotas</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenRelatorio();
                }}
                className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-left flex flex-col gap-1.5 transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#0082D7] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold leading-tight">Relatório do Mês</p>
                  <p className="text-[10px] text-slate-500 font-medium">Resumo consolidado</p>
                </div>
              </button>

              {onOpenCadastro && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenCadastro();
                  }}
                  className="col-span-2 p-3 rounded-2xl border border-sky-300 bg-sky-50 hover:bg-sky-100/70 text-sky-950 text-left flex items-center justify-between gap-3 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#0082D7] text-white flex items-center justify-center shadow-xs">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold leading-tight">Meu Cadastro & Filial Serallê</p>
                      <p className="text-[10px] text-sky-800/80 font-medium">Informar unidade (ex: Cianorte) e nome</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#0082D7] border border-sky-200">
                    Editar
                  </span>
                </button>
              )}

              {onOpenBackup && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenBackup();
                  }}
                  className="col-span-2 p-3 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/70 text-emerald-950 text-left flex items-center justify-between gap-3 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-200 text-emerald-800 flex items-center justify-center">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold leading-tight">Backup & Proteção dos Dados</p>
                      <p className="text-[10px] text-emerald-800/80 font-medium">Exportar e restaurar antes de atualizar</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                    Segurança
                  </span>
                </button>
              )}

              {onOpenLembretes && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenLembretes();
                  }}
                  className="col-span-2 p-3 rounded-2xl border border-amber-200 bg-amber-50 hover:bg-amber-100/70 text-amber-950 text-left flex items-center justify-between gap-3 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold leading-tight">Lembretes & Fechamento</p>
                      <p className="text-[10px] text-amber-800/80 font-medium">Alertas de turno e ritmo diário</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                    Ativo
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Fixed Bottom Bar */}
      <nav
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      >
        <div className="max-w-md mx-auto px-3 pt-1.5 flex items-center justify-around relative">
          {/* Tab 1: Painel */}
          <button
            onClick={() => handleSelectTab("dashboard")}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              viewMode === "dashboard"
                ? "text-[#0082D7]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-all ${
                viewMode === "dashboard" ? "bg-sky-50" : "bg-transparent"
              }`}
            >
              <BarChart3 className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                viewMode === "dashboard" ? "font-extrabold" : "font-medium"
              }`}
            >
              Painel
            </span>
          </button>

          {/* Tab 2: Calendário */}
          <button
            onClick={() => handleSelectTab("calendario")}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              viewMode === "calendario"
                ? "text-[#0082D7]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-all ${
                viewMode === "calendario" ? "bg-sky-50" : "bg-transparent"
              }`}
            >
              <Calendar className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                viewMode === "calendario" ? "font-extrabold" : "font-medium"
              }`}
            >
              Calendário
            </span>
          </button>

          {/* Center Elevated Action: Lançar Venda */}
          <div className="relative -top-3 flex flex-col items-center">
            <button
              onClick={onOpenLancarVenda}
              title="Lançar Venda de Hoje"
              className="w-13 h-13 rounded-full bg-gradient-to-tr from-blue-800 to-[#0082D7] text-white shadow-lg shadow-blue-700/35 hover:scale-105 active:scale-95 transition-all flex items-center justify-center border-4 border-white cursor-pointer"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </button>
            <span className="text-[10px] font-extrabold text-blue-900 tracking-tight mt-0.5">
              + Venda
            </span>
          </div>

          {/* Tab 3: Gráficos */}
          <button
            onClick={() => handleSelectTab("analises")}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              viewMode === "analises"
                ? "text-[#0082D7]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-all ${
                viewMode === "analises" ? "bg-sky-50" : "bg-transparent"
              }`}
            >
              <PieChart className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                viewMode === "analises" ? "font-extrabold" : "font-medium"
              }`}
            >
              Gráficos
            </span>
          </button>

          {/* Tab 4: Mais / Menu */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              menuOpen || viewMode === "loja" || viewMode === "historico-metas"
                ? "text-[#0082D7]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-all ${
                menuOpen || viewMode === "loja" || viewMode === "historico-metas"
                  ? "bg-sky-50"
                  : "bg-transparent"
              }`}
            >
              <Menu className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                menuOpen || viewMode === "loja" || viewMode === "historico-metas"
                  ? "font-extrabold"
                  : "font-medium"
              }`}
            >
              Mais
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
