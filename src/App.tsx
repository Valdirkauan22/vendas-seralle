import React, { useState } from "react";
import { ProfileProvider } from "@/context/ProfileContext";
import { VendasProvider } from "@/context/VendasContext";
import { Header } from "@/components/Header";
import { MonthSelector } from "@/components/MonthSelector";
import { ResumoView } from "@/components/ResumoView";
import { HistoricoCalendarioView } from "@/components/HistoricoCalendarioView";
import { HistoricoMetasView } from "@/components/HistoricoMetasView";
import { AnalisesGraficosView } from "@/components/AnalisesGraficosView";
import { VisaoLojaView } from "@/components/VisaoLojaView";
import { DiaModal } from "@/components/DiaModal";
import { MetasModal } from "@/components/MetasModal";
import { PerfisModal } from "@/components/PerfisModal";
import { RelatorioModal } from "@/components/RelatorioModal";
import { GuiaModal } from "@/components/GuiaModal";
import { ViewMode } from "@/types";
import { getMesAtualId } from "@/utils/formatters";

function MainApp() {
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [currentMonthId, setCurrentMonthId] = useState<string>(getMesAtualId());

  // Modals state
  const [selectedDiaDate, setSelectedDiaDate] = useState<string | null>(null);
  const [metasModalOpen, setMetasModalOpen] = useState(false);
  const [relatorioModalOpen, setRelatorioModalOpen] = useState(false);
  const [perfisModalOpen, setPerfisModalOpen] = useState(false);
  const [guiaModalOpen, setGuiaModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Top Application Header */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenMetas={() => setMetasModalOpen(true)}
        onOpenRelatorio={() => setRelatorioModalOpen(true)}
        onOpenPerfis={() => setPerfisModalOpen(true)}
        onOpenGuia={() => setGuiaModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Month selector displayed for active month views */}
        {viewMode !== "historico-metas" && (
          <MonthSelector
            currentMonthId={currentMonthId}
            onMonthChange={(newMonthId) => setCurrentMonthId(newMonthId)}
          />
        )}

        {/* View Switcher */}
        {viewMode === "dashboard" && (
          <ResumoView
            mesId={currentMonthId}
            onOpenDia={(dataStr) => setSelectedDiaDate(dataStr)}
            onOpenMetas={() => setMetasModalOpen(true)}
          />
        )}

        {viewMode === "calendario" && (
          <HistoricoCalendarioView
            mesId={currentMonthId}
            onOpenDia={(dataStr) => setSelectedDiaDate(dataStr)}
          />
        )}

        {viewMode === "analises" && (
          <AnalisesGraficosView
            mesId={currentMonthId}
            onOpenDia={(dataStr) => setSelectedDiaDate(dataStr)}
          />
        )}

        {viewMode === "loja" && (
          <VisaoLojaView
            mesId={currentMonthId}
          />
        )}

        {viewMode === "historico-metas" && (
          <HistoricoMetasView
            onSelectMonth={(mesId) => {
              setCurrentMonthId(mesId);
              setViewMode("dashboard");
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-semibold text-slate-700">
            Serallê Calçados · Diário de Vendas & Acompanhamento de Cotas
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setGuiaModalOpen(true)}
              className="text-blue-700 hover:underline font-medium"
            >
              Guia de Uso
            </button>
            <span>·</span>
            <button
              onClick={() => setPerfisModalOpen(true)}
              className="text-blue-700 hover:underline font-medium"
            >
              Nuvem & Perfis
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedDiaDate && (
        <DiaModal
          dataStr={selectedDiaDate}
          onClose={() => setSelectedDiaDate(null)}
        />
      )}

      {metasModalOpen && (
        <MetasModal
          mesId={currentMonthId}
          onClose={() => setMetasModalOpen(false)}
        />
      )}

      {relatorioModalOpen && (
        <RelatorioModal
          mesId={currentMonthId}
          onClose={() => setRelatorioModalOpen(false)}
        />
      )}

      {perfisModalOpen && (
        <PerfisModal
          onClose={() => setPerfisModalOpen(false)}
        />
      )}

      {guiaModalOpen && (
        <GuiaModal
          onClose={() => setGuiaModalOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <VendasProvider>
        <MainApp />
      </VendasProvider>
    </ProfileProvider>
  );
}
