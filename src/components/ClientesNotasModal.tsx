import React, { useState, useEffect } from "react";
import {
  NotebookTabs,
  Plus,
  Trash2,
  CheckCircle2,
  Phone,
  Search,
  X,
  Footprints,
  Calendar,
  MessageCircle,
  Clock,
} from "lucide-react";
import { NotaCliente } from "@/types";
import { useProfile } from "@/context/ProfileContext";

interface ClientesNotasModalProps {
  onClose: () => void;
}

export function ClientesNotasModal({ onClose }: ClientesNotasModalProps) {
  const { perfilAtivo } = useProfile();
  const storageKey = `@diario_vendas:notas_clientes_${perfilAtivo?.id || "default"}`;

  const [notas, setNotas] = useState<NotaCliente[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [filtro, setFiltro] = useState("");
  const [showNovoForm, setShowNovoForm] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [calcadoDesejado, setCalcadoDesejado] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(notas));
    } catch {}
  }, [notas, storageKey]);

  const handleAddNota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCliente.trim() || !calcadoDesejado.trim()) return;

    const nova: NotaCliente = {
      id: "cli_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      nomeCliente: nomeCliente.trim(),
      telefone: telefone.trim(),
      calcadoDesejado: calcadoDesejado.trim(),
      tamanho: tamanho.trim(),
      observacoes: observacoes.trim(),
      atendido: false,
      dataCriacao: new Date().toLocaleDateString("pt-BR"),
    };

    setNotas([nova, ...notas]);
    setNomeCliente("");
    setTelefone("");
    setCalcadoDesejado("");
    setTamanho("");
    setObservacoes("");
    setShowNovoForm(false);
  };

  const handleToggleAtendido = (id: string) => {
    setNotas(
      notas.map((n) => (n.id === id ? { ...n, atendido: !n.atendido } : n))
    );
  };

  const handleRemoveNota = (id: string) => {
    setNotas(notas.filter((n) => n.id !== id));
  };

  const notasFiltradas = notas.filter((n) => {
    const q = filtro.toLowerCase();
    return (
      n.nomeCliente.toLowerCase().includes(q) ||
      n.calcadoDesejado.toLowerCase().includes(q) ||
      (n.tamanho && n.tamanho.toLowerCase().includes(q)) ||
      (n.telefone && n.telefone.includes(q))
    );
  });

  const pendentesCount = notas.filter((n) => !n.atendido).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-700 to-teal-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <NotebookTabs className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                Caderno de Clientes & Vendas Programadas
              </h3>
              <p className="text-xs text-emerald-100">
                Guarde encomendas, numerações pendentes e contatos para avisar no WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Top Bar with actions and search */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar cliente, modelo ou numeração..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-600 outline-hidden"
              />
            </div>

            <button
              onClick={() => setShowNovoForm(!showNovoForm)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{showNovoForm ? "Cancelar" : "Nova Encomenda / Contato"}</span>
            </button>
          </div>

          {/* Form to add client request */}
          {showNovoForm && (
            <form
              onSubmit={handleAddNota}
              className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3 animate-in fade-in"
            >
              <h4 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider">
                Cadastrar Pedido / Aviso de Chegada
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="Ex: Maria Aparecida"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-600 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    WhatsApp / Telefone
                  </label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(44) 99999-9999"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-600 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Calçado / Modelo Desejado *
                  </label>
                  <input
                    type="text"
                    required
                    value={calcadoDesejado}
                    onChange={(e) => setCalcadoDesejado(e.target.value)}
                    placeholder="Ex: Scarpin Vizzano Nude ou Tênis Nike"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-600 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Numeração
                  </label>
                  <input
                    type="text"
                    value={tamanho}
                    onChange={(e) => setTamanho(e.target.value)}
                    placeholder="Ex: 37 / 41"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-600 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Observações adicionais (Cor, preferência, prazo)
                </label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Quer para o casamento dia 15"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-600 outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNovoForm(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Salvar Contato
                </button>
              </div>
            </form>
          )}

          {/* List of client cards */}
          {notasFiltradas.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <NotebookTabs className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-600">
                Nenhum contato ou encomenda registrado no momento
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Clique no botão acima para anotar clientes que pediram aviso de chegada de calçados.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                <span>Total de {notas.length} pedidos anotados</span>
                <span className="text-emerald-700 font-bold">
                  {pendentesCount} pendentes de atendimento
                </span>
              </div>

              {notasFiltradas.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    n.atendido
                      ? "bg-slate-50 border-slate-200 opacity-60"
                      : "bg-white border-slate-200 hover:border-emerald-300 shadow-xs"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900">
                        {n.nomeCliente}
                      </span>
                      {n.tamanho && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Nº {n.tamanho}
                        </span>
                      )}
                      {n.atendido && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-bold">
                          Concluído / Avisado
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                      <Footprints className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{n.calcadoDesejado}</span>
                    </div>

                    {n.observacoes && (
                      <p className="text-[11px] text-slate-500 italic">
                        "{n.observacoes}"
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                      <span>Cadastrado em {n.dataCriacao}</span>
                      {n.telefone && (
                        <span className="font-semibold text-slate-600">
                          Tel: {n.telefone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {n.telefone && (
                      <a
                        href={`https://wa.me/55${n.telefone.replace(/\D/g, "")}?text=Olá%20${encodeURIComponent(
                          n.nomeCliente
                        )},%20sou%20da%20Serallê%20Calçados!%20O%20modelo%20${encodeURIComponent(
                          n.calcadoDesejado
                        )}%20já%20está%20disponível%20para%20você!`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Mandar mensagem no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    )}

                    <button
                      onClick={() => handleToggleAtendido(n.id)}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                        n.atendido
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                      }`}
                      title={n.atendido ? "Reabrir pedido" : "Marcar como atendido"}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {n.atendido ? "Reabrir" : "Atendido"}
                      </span>
                    </button>

                    <button
                      onClick={() => handleRemoveNota(n.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Serallê Calçados · Fidelização de Clientes
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
