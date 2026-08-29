import React from "react";
import {
  X,
  HelpCircle,
  TrendingUp,
  Target,
  Users,
  Cloud,
  FileText,
  CheckCircle2,
} from "lucide-react";

interface GuiaModalProps {
  onClose: () => void;
}

export function GuiaModal({ onClose }: GuiaModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Como Usar o Diário de Vendas Serallê
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Guia rápido para aproveitar ao máximo todas as ferramentas
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

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-700 text-xs sm:text-sm">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
              1
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Lançamento Diário de Vendas
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Clique no botão <strong>"+ Lançar Venda de Hoje"</strong> no painel ou clique em qualquer data no <strong>Calendário</strong>. Digite o valor da venda, a quantidade de pares e observações. Você também pode definir a <strong>Margem do Dia (%)</strong>.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
              2
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-600" />
                Acompanhamento das Cotas (A, B, C e Alta)
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Veja na barra de progresso do painel o quanto falta para cada cota. As metas padrão são: <strong>Cota A (55k/410p)</strong>, <strong>Cota B (65k/450p)</strong>, <strong>Cota C (75k/490p)</strong> e <strong>Cota Alta (90k/550p)</strong>. Você pode personalizar as metas do mês clicando em <strong>Metas</strong> no topo.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0">
              3
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-600" />
                Múltiplas Vendedoras & Perfis
              </h4>
              <p className="text-slate-600 leading-relaxed">
                No menu superior, clique no perfil para cadastrar novas vendedoras ou alternar instantaneamente entre elas. Cada vendedora tem seu próprio histórico e metas isoladas.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
              4
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-amber-600" />
                Sincronização em Nuvem (Sync Code)
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Seu navegador recebe um código único de 8 dígitos (ex: <code>K7P9X2M4</code>). Você pode copiar este código e colar em outro computador ou celular para acessar e sincronizar as mesmas vendas em tempo real!
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
              5
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                Relatórios e Exportação
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Gere relatórios completos do mês com um clique! Você pode <strong>imprimir em PDF</strong>, <strong>baixar em arquivo HTML</strong> ou <strong>copiar o resumo formatado diretamente para enviar no WhatsApp</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Entendido, começar a usar!
          </button>
        </div>
      </div>
    </div>
  );
}
