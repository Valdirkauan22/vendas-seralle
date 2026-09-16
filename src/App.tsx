import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { VendasProvider, useVendas } from "@/context/VendasContext";
import { AuthScreen } from "@/components/AuthScreen";
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
import { InstalarMobileModal } from "@/components/InstalarMobileModal";
import { LembretesModal } from "@/components/LembretesModal";
import { BackupModal } from "@/components/BackupModal";
import { CadastroModal } from "@/components/CadastroModal";
import { InAppNotificationToast } from "@/components/InAppNotificationToast";
import { BottomNav } from "@/components/BottomNav";
import { ViewMode } from "@/types";
import { Store } from "lucide-react";
import { getMesAtualId, getDataHoje } from "@/utils/formatters";
import {
  getLembretesConfig,
  sendNativeNotification,
  hasNotificationFiredToday,
  markNotificationFiredToday,
} from "@/utils/notifications";

function MainApp() {
  const { getDiaTotais } = useVendas();
  const { user, userProfile } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [currentMonthId, setCurrentMonthId] = useState<string>(getMesAtualId());

  // Modals state
  const [selectedDiaDate, setSelectedDiaDate] = useState<string | null>(null);
  const [metasModalOpen, setMetasModalOpen] = useState(false);
  const [relatorioModalOpen, setRelatorioModalOpen] = useState(false);
  const [perfisModalOpen, setPerfisModalOpen] = useState(false);
  const [guiaModalOpen, setGuiaModalOpen] = useState(false);
  const [instalarMobileModalOpen, setInstalarMobileModalOpen] = useState(false);
  const [lembretesModalOpen, setLembretesModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [cadastroModalOpen, setCadastroModalOpen] = useState(false);

  // Ao fazer login com o Google e entrar, se ainda não informou a filial específica (ou cadastro não confirmado),
  // abre o modal de cadastro/filial na primeira vez na sessão para facilitar (ex: Serallê Cianorte).
  useEffect(() => {
    if (user && userProfile) {
      const jaExibiuPrompt = sessionStorage.getItem("@diario_vendas:prompt_filial_seen");
      const precisaConfigurarFilial =
        !userProfile.cadastroConfirmado &&
        (!userProfile.loja || userProfile.loja === "Serallê Calçados");

      if (precisaConfigurarFilial && !jaExibiuPrompt) {
        sessionStorage.setItem("@diario_vendas:prompt_filial_seen", "true");
        setCadastroModalOpen(true);
      }
    }
  }, [user, userProfile]);

  // Verificação periódica de lembretes e alertas de turno
  useEffect(() => {
    const checkLembretes = () => {
      const cfg = getLembretesConfig();
      if (!cfg.habilitado) return;

      const now = new Date();
      const horaMinutoAtual = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      // 1. Fechamento de Turno
      if (cfg.fechamentoTurnoAtivo && horaMinutoAtual === cfg.horarioFechamento) {
        if (!hasNotificationFiredToday("fechamento")) {
          const hojeStr = getDataHoje();
          const diaHoje = getDiaTotais(hojeStr);
          markNotificationFiredToday("fechamento");
          sendNativeNotification("⏰ Diário Serallê · Fim de Expediente", {
            body:
              diaHoje.qtd === 0
                ? "Seu turno está quase no fim! Não esqueça de registrar os atendimentos e vendas de hoje."
                : `Turno concluído! Você registrou ${diaHoje.pares} pares hoje. Parabéns pelo empenho!`,
            type: "fechamento",
          });
        }
      }

      // 2. Aviso de Ritmo de Vendas
      if (cfg.avisoRitmoAtivo && horaMinutoAtual === cfg.horarioAvisoRitmo) {
        if (!hasNotificationFiredToday("ritmo")) {
          const hojeStr = getDataHoje();
          const diaHoje = getDiaTotais(hojeStr);
          markNotificationFiredToday("ritmo");
          sendNativeNotification("⚡ Diário Serallê · Aviso de Ritmo", {
            body: `Metade do turno! Hoje você já realizou ${diaHoje.pares} pares. Continue acelerando para bater sua cota!`,
            type: "ritmo",
          });
        }
      }
    };

    const timer = setInterval(checkLembretes, 30000);
    return () => clearInterval(timer);
  }, [getDiaTotais]);

  const handleLancarVendaHoje = () => {
    setSelectedDiaDate(getDataHoje());
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Floating In-App Reminder Notification */}
      <InAppNotificationToast onOpenLancarVenda={handleLancarVendaHoje} />

      {/* Top Application Header */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenLancarVenda={handleLancarVendaHoje}
        onOpenMetas={() => setMetasModalOpen(true)}
        onOpenRelatorio={() => setRelatorioModalOpen(true)}
        onOpenGuia={() => setGuiaModalOpen(true)}
        onOpenLembretes={() => setLembretesModalOpen(true)}
        onOpenBackup={() => setBackupModalOpen(true)}
        onOpenCadastro={() => setCadastroModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 pb-28 md:pb-8">
        {/* Banner de Boas-vindas para informar Filial Serallê */}
        {(!userProfile?.cadastroConfirmado || userProfile?.loja === "Serallê Calçados") && (
          <div className="mb-4 p-3.5 sm:p-4 bg-gradient-to-r from-sky-600 via-[#0082D7] to-[#006BB5] text-white rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold leading-tight">
                  Informe sua unidade Serallê (ex: Loja Cianorte)
                </p>
                <p className="text-[11px] text-sky-100 font-medium mt-0.5">
                  Selecione sua filial no menu suspenso para sincronizar suas metas e vendas com a loja correta.
                </p>
              </div>
            </div>
            <button
              onClick={() => setCadastroModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-white text-[#0082D7] hover:bg-sky-50 rounded-xl text-xs font-bold shrink-0 transition-colors shadow-sm cursor-pointer text-center"
            >
              Selecionar no Menu Suspenso
            </button>
          </div>
        )}

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
            onOpenLembretes={() => setLembretesModalOpen(true)}
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
              className="text-blue-700 hover:underline font-medium cursor-pointer"
            >
              Guia de Uso
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Navigation */}
      <BottomNav
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenLancarVenda={handleLancarVendaHoje}
        onOpenMetas={() => setMetasModalOpen(true)}
        onOpenRelatorio={() => setRelatorioModalOpen(true)}
        onOpenLembretes={() => setLembretesModalOpen(true)}
        onOpenBackup={() => setBackupModalOpen(true)}
        onOpenCadastro={() => setCadastroModalOpen(true)}
      />

      {/* Modals */}
      {cadastroModalOpen && (
        <CadastroModal
          isOpen={cadastroModalOpen}
          onClose={() => setCadastroModalOpen(false)}
        />
      )}

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
          onOpenBackup={() => setBackupModalOpen(true)}
        />
      )}

      {guiaModalOpen && (
        <GuiaModal
          onClose={() => setGuiaModalOpen(false)}
        />
      )}

      {instalarMobileModalOpen && (
        <InstalarMobileModal
          onClose={() => setInstalarMobileModalOpen(false)}
        />
      )}

      {lembretesModalOpen && (
        <LembretesModal
          onClose={() => setLembretesModalOpen(false)}
          onOpenLancarVenda={handleLancarVendaHoje}
        />
      )}

      {backupModalOpen && (
        <BackupModal
          onClose={() => setBackupModalOpen(false)}
        />
      )}
    </div>
  );
}

function AppContent() {
  const { user, userProfile, isModoOffline, loading } = useAuth();
  const [mobileModalOpen, setMobileModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-200">Carregando Diário Serallê...</p>
      </div>
    );
  }

  if (!user && !isModoOffline && !userProfile) {
    return (
      <>
        <AuthScreen onOpenMobileGuide={() => setMobileModalOpen(true)} />
        {mobileModalOpen && (
          <InstalarMobileModal onClose={() => setMobileModalOpen(false)} />
        )}
      </>
    );
  }

  return <MainApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <VendasProvider>
          <AppContent />
        </VendasProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
