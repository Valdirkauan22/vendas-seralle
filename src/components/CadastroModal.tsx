import React, { useState, useEffect } from "react";
import {
  X,
  Store,
  UserCheck,
  Check,
  Building2,
  Sparkles,
  Phone,
  Briefcase,
  AlertCircle,
  ShieldCheck,
  MapPin,
  ChevronDown,
  Info,
  Search,
  Copy,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LOJAS_SERALLE, LojaSeralle } from "@/data/lojasSeralle";

interface CadastroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CARGOS_SUGERIDOS = [
  "Vendedora de Calçados",
  "Consultora de Vendas",
  "Vendedor(a) Líder",
  "Caixa / Apoio",
  "Subgerente",
  "Gerente de Loja",
];

export function CadastroModal({ isOpen, onClose, onSuccess }: CadastroModalProps) {
  const { user, userProfile, atualizarPerfilUsuario } = useAuth();

  const [nome, setNome] = useState("");
  const [lojaSelecionada, setLojaSelecionada] = useState("Loja Cianorte");
  const [enderecoLoja, setEnderecoLoja] = useState("");
  const [cepLoja, setCepLoja] = useState("");
  const [mostrarMaisDetalhes, setMostrarMaisDetalhes] = useState(true);
  const [cargo, setCargo] = useState("Vendedora de Calçados");
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [copiadoEndereco, setCopiadoEndereco] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (isOpen) {
      setNome(userProfile?.displayName || user?.displayName || "Vendedora Serallê");

      // Encontra a loja salva do perfil ou padrão Cianorte
      let lojaInicial = "Loja Cianorte";
      if (userProfile?.loja && userProfile.loja !== "Serallê Calçados") {
        lojaInicial = userProfile.loja;
      }

      // Normaliza se veio no formato "Serallê Cianorte" para "Loja Cianorte"
      const matchLoja = LOJAS_SERALLE.find(
        (l) =>
          l.nome.toLowerCase() === lojaInicial.toLowerCase() ||
          lojaInicial.toLowerCase().includes(l.cidade.toLowerCase())
      );

      if (matchLoja) {
        setLojaSelecionada(matchLoja.nome);
        setEnderecoLoja(userProfile?.lojaEndereco || matchLoja.endereco);
        setCepLoja(userProfile?.lojaCep || matchLoja.cep);
      } else {
        const cianorte = LOJAS_SERALLE[0];
        setLojaSelecionada(lojaInicial || cianorte.nome);
        setEnderecoLoja(userProfile?.lojaEndereco || cianorte.endereco);
        setCepLoja(userProfile?.lojaCep || cianorte.cep);
      }

      setCargo(userProfile?.cargo || "Vendedora de Calçados");
      setTelefone(userProfile?.telefone || "");
      setFeedback(null);
      setBusca("");
    }
  }, [isOpen, userProfile, user]);

  if (!isOpen) return null;

  const handleMudarLoja = (nomeLoja: string) => {
    setLojaSelecionada(nomeLoja);
    const lojaObj = LOJAS_SERALLE.find((l) => l.nome === nomeLoja);
    if (lojaObj) {
      setEnderecoLoja(lojaObj.endereco);
      setCepLoja(lojaObj.cep);
    }
  };

  const lojaAtualObj = LOJAS_SERALLE.find((l) => l.nome === lojaSelecionada);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lojaSelecionada.trim()) {
      setFeedback({ type: "error", text: "Por favor, selecione ou informe a sua unidade Serallê." });
      return;
    }

    setSalvando(true);
    setFeedback(null);

    try {
      await atualizarPerfilUsuario({
        displayName: nome.trim() || "Vendedora Serallê",
        loja: lojaSelecionada.trim(),
        lojaEndereco: enderecoLoja.trim(),
        lojaCep: cepLoja.trim(),
        cargo: cargo.trim(),
        telefone: telefone.trim(),
      });

      setFeedback({
        type: "success",
        text: `Cadastro confirmado com sucesso! Filial: ${lojaSelecionada.trim()}`,
      });

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      console.error("Erro ao salvar cadastro:", err);
      setFeedback({
        type: "error",
        text: err.message || "Não foi possível salvar os dados. Tente novamente.",
      });
    } finally {
      setSalvando(false);
    }
  };

  const lojasFiltradas = LOJAS_SERALLE.filter(
    (l) =>
      l.nome.toLowerCase().includes(busca.toLowerCase()) ||
      l.cidade.toLowerCase().includes(busca.toLowerCase()) ||
      l.endereco.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0082D7] text-white flex items-center justify-center shadow-md shadow-[#0082D7]/20 shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                Meu Cadastro & Unidade Serallê
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Selecione sua loja e filial para acompanhamento das vendas
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

        {/* Modal Form */}
        <form onSubmit={handleSalvar} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 text-sm">
          {/* Feedback */}
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                feedback.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border border-rose-200 text-rose-900"
              }`}
            >
              {feedback.type === "success" ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Account Indicator */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Perfil"
                  className="w-9 h-9 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#0082D7] text-white flex items-center justify-center font-bold text-xs">
                  {nome ? nome.charAt(0).toUpperCase() : "V"}
                </div>
              )}
              <div className="leading-tight">
                <p className="text-xs font-bold text-slate-900">{user?.email || "Conta Conectada"}</p>
                <p className="text-[11px] text-slate-500 font-medium">Conta Google / Firebase Ativa</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Verificado
            </span>
          </div>

          {/* Field: Nome de Exibição */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nome de Exibição (Como prefere ser chamada)
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Maria Vendedora, Camila..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0082D7]"
            />
          </div>

          {/* Field: MENU SUSPENSO DE LOJAS SERALLÊ */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="select-loja-seralle"
                className="text-xs font-bold text-slate-900 flex items-center gap-1.5"
              >
                <Building2 className="w-4 h-4 text-[#0082D7]" />
                <span>Menu Suspenso de Lojas Serallê ({LOJAS_SERALLE.length} Unidades)</span>
              </label>
              <span className="text-[10px] font-bold text-[#0082D7] bg-sky-100/80 px-2 py-0.5 rounded-full">
                Selecione sua Loja
              </span>
            </div>

            {/* Menu Suspenso (Dropdown Select) */}
            <div className="relative">
              <select
                id="select-loja-seralle"
                value={lojaSelecionada}
                onChange={(e) => handleMudarLoja(e.target.value)}
                className="w-full pl-3.5 pr-10 py-3 bg-white border-2 border-[#0082D7]/30 hover:border-[#0082D7] rounded-xl text-xs sm:text-sm font-bold text-slate-900 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#0082D7] cursor-pointer appearance-none transition-colors"
              >
                {LOJAS_SERALLE.map((l) => (
                  <option key={l.id} value={l.nome}>
                    {l.nome} — {l.cidade}, PR ({l.cep})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#0082D7]">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {/* Card com Detalhes da Loja Selecionada */}
            {lojaAtualObj && (
              <div className="bg-white rounded-xl border border-sky-200 p-3.5 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#0082D7] flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-extrabold text-slate-900 leading-tight">
                          {lojaAtualObj.nome}
                        </p>
                        {lojaAtualObj.destaque && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-full">
                            <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                            Destaque
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        {lojaAtualObj.endereco}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMostrarMaisDetalhes(!mostrarMaisDetalhes)}
                    className="text-[10px] font-bold text-[#0082D7] hover:underline shrink-0 bg-sky-50 px-2 py-1 rounded-lg border border-sky-200 cursor-pointer"
                  >
                    {mostrarMaisDetalhes ? "Menos detalhes" : "Mais detalhes"}
                  </button>
                </div>

                {mostrarMaisDetalhes && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2.5 text-[11px]">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-semibold">Cidade / Estado:</span>
                        <span className="font-bold text-slate-800">{lojaAtualObj.cidade}, {lojaAtualObj.uf}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-semibold">CEP:</span>
                        <span className="font-bold text-slate-800">{lojaAtualObj.cep}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-slate-400 block font-semibold">Rede:</span>
                        <span className="font-bold text-[#0082D7]">Serallê Calçados</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `Serallê Calçados, ${lojaAtualObj.endereco}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0082D7]/10 hover:bg-[#0082D7]/20 text-[#0082D7] font-bold text-[11px] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir no Google Maps</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          const textoCopiar = `${lojaAtualObj.nome} - Serallê Calçados\nEndereço: ${lojaAtualObj.endereco}\nCEP: ${lojaAtualObj.cep}`;
                          navigator.clipboard.writeText(textoCopiar);
                          setCopiadoEndereco(true);
                          setTimeout(() => setCopiadoEndereco(false), 2000);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        {copiadoEndereco ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Endereço Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copiar Endereço & CEP</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Seletor Rápido com Pesquisa / Grade de Lojas */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-600">
                  Ou escolha pelo catálogo de unidades:
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {lojasFiltradas.length} encontradas
                </span>
              </div>

              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por cidade ou endereço..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0082D7]"
                />
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1 pr-1 border border-slate-200/80 rounded-xl p-1 bg-white">
                {lojasFiltradas.map((l) => {
                  const isSelected = lojaSelecionada === l.nome;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => handleMudarLoja(l.nome)}
                      className={`w-full p-2 rounded-lg text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-[#0082D7] text-white font-bold"
                          : "hover:bg-slate-50 text-slate-700 font-medium"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="truncate leading-tight">
                          {l.nome}
                        </p>
                        <p
                          className={`text-[10px] truncate ${
                            isSelected ? "text-sky-100" : "text-slate-400"
                          }`}
                        >
                          {l.endereco}
                        </p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Field: Cargo / Função */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              <span>Cargo / Função</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CARGOS_SUGERIDOS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCargo(c)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    cargo === c
                      ? "bg-slate-800 text-white border-slate-800 font-bold"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200 font-medium"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ex: Vendedora de Calçados"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0082D7]"
            />
          </div>

          {/* Field: Telefone / WhatsApp */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>Telefone / WhatsApp (Opcional)</span>
            </label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(44) 99999-9999"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0082D7]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2.5 rounded-xl bg-[#0082D7] hover:bg-[#006BB5] text-white text-xs font-bold shadow-md shadow-[#0082D7]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {salvando ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Salvar Dados do Cadastro</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
