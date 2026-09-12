import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle, Check, Sparkles, X } from "lucide-react";
import { parseValorMonetario, converterExtensoParaNumero } from "@/utils/formatters";

interface VoiceSaleInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParsedSale: (sale: {
    valorStr: string;
    paresStr: string;
    agregadosStr: string;
    categoria: string;
    descricao: string;
  }) => void;
}

// Helper robusto para extrair valores, pares, agregados e categoria do áudio
function parseSpokenText(transcript: string) {
  let text = transcript.toLowerCase().trim();
  if (!text) {
    return {
      valorStr: "",
      paresStr: "1",
      agregadosStr: "0",
      categoria: "Feminino",
      descricao: "",
    };
  }

  // 1. Extrair PARES PRIMEIRO (para que '2 pares' não seja interpretado como 'R$ 2,00')
  let pares = 1;
  const paresNumMatch = text.match(/(\d+)\s*(par|pares)/i);
  if (paresNumMatch && paresNumMatch[1]) {
    pares = parseInt(paresNumMatch[1], 10) || 1;
    // Remove do texto para não contaminar a busca de valor
    text = text.replace(paresNumMatch[0], " ");
  } else if (text.includes("dois pares") || text.includes("duas pares")) {
    pares = 2;
    text = text.replace(/dois pares|duas pares/g, " ");
  } else if (text.includes("tres pares") || text.includes("três pares")) {
    pares = 3;
    text = text.replace(/tr[eê]s pares/g, " ");
  } else if (text.includes("quatro pares")) {
    pares = 4;
    text = text.replace(/quatro pares/g, " ");
  } else if (text.includes("cinco pares")) {
    pares = 5;
    text = text.replace(/cinco pares/g, " ");
  } else if (text.includes("um par") || text.includes("uma par")) {
    pares = 1;
    text = text.replace(/um par|uma par/g, " ");
  }

  // 2. Extrair AGREGADOS (meias, sprays, etc.)
  let agregados = 0;
  const agNumMatch = text.match(/(\d+)\s*(meia|meias|spray|sprays|palmilha|palmilhas|cinto|cintos|carteira|carteiras|agregado|agregados|limpador)/i);
  if (agNumMatch && agNumMatch[1]) {
    agregados = parseInt(agNumMatch[1], 10) || 1;
    text = text.replace(agNumMatch[0], " ");
  } else if (text.includes("uma meia") || text.includes("um spray") || text.includes("uma palmilha") || text.includes("um cinto") || text.includes("uma carteira")) {
    agregados = 1;
    text = text.replace(/uma? (meia|spray|palmilha|cinto|carteira)/g, " ");
  } else if (text.includes("duas meias") || text.includes("dois sprays") || text.includes("dois agregados")) {
    agregados = 2;
    text = text.replace(/(duas?|dois) (meias?|sprays?|agregados?)/g, " ");
  } else if (text.includes("meia") || text.includes("meias") || text.includes("spray") || text.includes("palmilha") || text.includes("agregado")) {
    agregados = 1;
  }

  // 3. Extrair CATEGORIA
  let categoria = "Feminino";
  if (text.includes("masculino") || text.includes("homem") || text.includes("social masculino") || text.includes("sapatenis") || text.includes("sapatênis")) {
    categoria = "Masculino";
  } else if (text.includes("infantil") || text.includes("criança") || text.includes("menino") || text.includes("menina") || text.includes("kids")) {
    categoria = "Infantil";
  } else if (text.includes("esportivo") || text.includes("esporte") || text.includes("corrida") || text.includes("academia") || text.includes("mizuno") || text.includes("nike") || text.includes("olympikus") || text.includes("tenis") || text.includes("tênis")) {
    categoria = "Esportivo";
  } else if (text.includes("conforto") || text.includes("usaflex") || text.includes("modare") || text.includes("ortopedico") || text.includes("ortopédico")) {
    categoria = "Conforto";
  } else if (text.includes("acessório") || text.includes("acessorio") || text.includes("bolsa") || text.includes("mochila") || text.includes("cinto")) {
    categoria = "Acessórios";
  } else if (text.includes("chinelo") || text.includes("sandalia") || text.includes("sandália") || text.includes("rasteira") || text.includes("salto") || text.includes("scarpin") || text.includes("bota") || text.includes("vizzano") || text.includes("beira rio") || text.includes("moleca") || text.includes("feminino")) {
    categoria = "Feminino";
  }

  // 4. Extrair VALOR MONETÁRIO
  let valor = 0;

  // 4a. Padrão "150 reais e 50 centavos" ou "150 reais e 50" ou "150 e 50"
  const reaisCentavosRegex = /(\d+[\.,]?\d*)\s*(reais|real)?\s*(e\s*(\d{1,2})\s*(centavos)?)?/i;
  // 4b. Padrão explícito com vírgula ou ponto: "199,90", "199.90", "R$ 250,00"
  const formatoMoedaRegex = /(?:r\$\s*)?(\d{1,4}(?:[\.,]\d{2}))/i;
  // 4c. Padrão número seguido de "reais": "150 reais", "200 real"
  const numeroReaisRegex = /(\d+)\s*(reais|real)/i;

  const matchMoeda = text.match(formatoMoedaRegex);
  const matchReais = text.match(numeroReaisRegex);
  const matchReaisCent = text.match(reaisCentavosRegex);

  if (matchMoeda && matchMoeda[1]) {
    valor = parseValorMonetario(matchMoeda[1]);
  } else if (matchReais && matchReais[1]) {
    valor = parseFloat(matchReais[1]) || 0;
  } else if (matchReaisCent && matchReaisCent[1] && (text.includes("real") || text.includes("reais") || matchReaisCent[4])) {
    const inteiro = parseFloat(matchReaisCent[1].replace(",", ".")) || 0;
    let centavos = 0;
    if (matchReaisCent[4]) {
      centavos = parseInt(matchReaisCent[4], 10) || 0;
      if (centavos < 10 && matchReaisCent[4].length === 1) centavos *= 10;
    }
    valor = inteiro + centavos / 100;
  } else {
    // 4d. Tentar converter números falados por extenso (ex: "cento e cinquenta", "duzentos e noventa e nove")
    const extensoNum = converterExtensoParaNumero(text);
    if (extensoNum > 0) {
      valor = extensoNum;
    } else {
      // 4e. Fallback: procurar qualquer número no texto restante
      const generalNumMatch = text.match(/(\d+(?:[\.,]\d{1,2})?)/);
      if (generalNumMatch && generalNumMatch[1]) {
        valor = parseValorMonetario(generalNumMatch[1]);
      }
    }
  }

  // Descrição
  const descricaoOriginal = transcript.trim();
  const descricao = descricaoOriginal.length > 2 
    ? descricaoOriginal.charAt(0).toUpperCase() + descricaoOriginal.slice(1)
    : `${pares} par(es) ${categoria}`;

  return {
    valorStr: valor > 0 ? valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
    paresStr: String(pares),
    agregadosStr: String(agregados),
    categoria,
    descricao,
  };
}

export function VoiceSaleInputModal({
  isOpen,
  onClose,
  onParsedSale,
}: VoiceSaleInputModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ReturnType<typeof parseSpokenText> | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript("");
      setParsedResult(null);
      setErrorMsg(null);
      return;
    }

    // Check SpeechRecognition support in browser
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg("O reconhecimento de voz não é suportado pelo seu navegador atual. Recomendamos usar o Google Chrome ou Microsoft Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "pt-BR";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        let currentText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
        const parsed = parseSpokenText(currentText);
        setParsedResult(parsed);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === "no-speech") {
          setErrorMsg("Nenhuma fala detectada. Tente falar mais perto do microfone.");
        } else if (event.error === "audio-capture") {
          setErrorMsg("Microfone não encontrado ou não permitido.");
        } else if (event.error === "not-allowed") {
          setErrorMsg("Permissão de microfone negada no navegador. Por favor, libere o acesso ao microfone.");
        } else {
          setErrorMsg(`Erro de áudio: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      startListening();
    } catch (e) {
      setErrorMsg("Falha ao inicializar o microfone.");
    }

    return () => {
      stopListening();
    };
  }, [isOpen]);

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        setErrorMsg(null);
        setTranscript("");
        setParsedResult(null);
        recognitionRef.current.start();
      } catch (err) {
        // May already be started
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
      setIsListening(false);
    }
  };

  const handleConfirm = () => {
    if (parsedResult && parsedResult.valorStr) {
      onParsedSale(parsedResult);
      onClose();
    } else {
      setErrorMsg("Por favor, diga pelo menos o valor da venda (ex: 'Duzentos reais, um par de bota').");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-700 to-sky-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                Lançamento Rápido por Voz
              </h3>
              <p className="text-[11px] text-blue-100 font-medium">
                Fale a venda e preencheremos os dados automaticamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Microphone Central Animation */}
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                isListening
                  ? "bg-red-500 text-white animate-pulse ring-8 ring-red-100"
                  : "bg-blue-700 text-white hover:bg-blue-800 ring-4 ring-blue-50"
              }`}
              title={isListening ? "Clique para pausar" : "Clique para falar"}
            >
              {isListening ? (
                <Mic className="w-9 h-9 animate-bounce" />
              ) : (
                <MicOff className="w-9 h-9" />
              )}
            </button>

            <span className="mt-3 text-xs font-bold text-slate-800">
              {isListening ? "Ouvindo... Pode falar agora!" : "Clique no microfone para falar"}
            </span>
            <span className="text-[11px] text-slate-500 max-w-xs mt-0.5">
              Exemplo: <em>"Cento e noventa e nove reais, um par vizzano feminino e uma meia"</em>
            </span>
          </div>

          {/* Transcript Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 min-h-[60px] flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">
              O que você falou:
            </span>
            <p className="text-sm font-medium text-slate-900 italic">
              {transcript ? `"${transcript}"` : isListening ? "Aguardando sua voz..." : "Nenhum áudio gravado ainda."}
            </p>
          </div>

          {/* Parsed Result Preview */}
          {parsedResult && parsedResult.valorStr && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Dados Identificados:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-500 block">Valor:</span>
                  <strong className="text-emerald-700 font-extrabold text-sm">
                    R$ {parsedResult.valorStr}
                  </strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-500 block">Pares:</span>
                  <strong className="text-slate-800 font-bold">
                    {parsedResult.paresStr} par(es)
                  </strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-500 block">Agregados:</span>
                  <strong className="text-slate-800 font-bold">
                    {parsedResult.agregadosStr} item(ns)
                  </strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-500 block">Categoria:</span>
                  <strong className="text-slate-800 font-bold">
                    {parsedResult.categoria}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!parsedResult || !parsedResult.valorStr}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
              parsedResult && parsedResult.valorStr
                ? "bg-blue-700 hover:bg-blue-800 text-white shadow-blue-700/20"
                : "bg-slate-300 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Preencher no Lançamento</span>
          </button>
        </div>
      </div>
    </div>
  );
}
