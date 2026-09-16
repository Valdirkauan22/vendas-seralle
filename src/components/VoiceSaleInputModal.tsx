import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle, Check, Sparkles, X, Edit3, Volume2, HelpCircle } from "lucide-react";
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

const CATEGORIAS_DISPONIVEIS = [
  "Feminino",
  "Masculino",
  "Infantil",
  "Esportivo",
  "Conforto",
  "Acessórios",
];

// Helper robusto para extrair valores, pares, agregados e categoria do texto falado ou digitado
export function parseSpokenText(transcript: string) {
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

  // 2. Extrair AGREGADOS (meias, sprays, palmilhas, etc.)
  let agregados = 0;
  const agNumMatch = text.match(
    /(\d+)\s*(meia|meias|spray|sprays|palmilha|palmilhas|cinto|cintos|carteira|carteiras|agregado|agregados|limpador|impermeabilizante)/i
  );
  if (agNumMatch && agNumMatch[1]) {
    agregados = parseInt(agNumMatch[1], 10) || 1;
    text = text.replace(agNumMatch[0], " ");
  } else if (
    text.includes("uma meia") ||
    text.includes("um spray") ||
    text.includes("uma palmilha") ||
    text.includes("um cinto") ||
    text.includes("uma carteira") ||
    text.includes("um limpador")
  ) {
    agregados = 1;
    text = text.replace(/uma? (meia|spray|palmilha|cinto|carteira|limpador)/g, " ");
  } else if (
    text.includes("duas meias") ||
    text.includes("dois sprays") ||
    text.includes("dois agregados") ||
    text.includes("duas palmilhas")
  ) {
    agregados = 2;
    text = text.replace(/(duas?|dois) (meias?|sprays?|agregados?|palmilhas?)/g, " ");
  } else if (
    text.includes("meia") ||
    text.includes("meias") ||
    text.includes("spray") ||
    text.includes("palmilha") ||
    text.includes("agregado")
  ) {
    agregados = 1;
  }

  // 3. Extrair CATEGORIA
  let categoria = "Feminino";
  if (
    text.includes("masculino") ||
    text.includes("homem") ||
    text.includes("social masculino") ||
    text.includes("sapatenis") ||
    text.includes("sapatênis") ||
    text.includes("democrata") ||
    text.includes("ferracini") ||
    text.includes("pegada")
  ) {
    categoria = "Masculino";
  } else if (
    text.includes("infantil") ||
    text.includes("criança") ||
    text.includes("menino") ||
    text.includes("menina") ||
    text.includes("kids") ||
    text.includes("baby") ||
    text.includes("bibi") ||
    text.includes("klin") ||
    text.includes("molekinh")
  ) {
    categoria = "Infantil";
  } else if (
    text.includes("esportivo") ||
    text.includes("esporte") ||
    text.includes("corrida") ||
    text.includes("academia") ||
    text.includes("mizuno") ||
    text.includes("nike") ||
    text.includes("olympikus") ||
    text.includes("tenis") ||
    text.includes("tênis") ||
    text.includes("fila") ||
    text.includes("asics")
  ) {
    categoria = "Esportivo";
  } else if (
    text.includes("conforto") ||
    text.includes("usaflex") ||
    text.includes("modare") ||
    text.includes("ortopedico") ||
    text.includes("ortopédico") ||
    text.includes("campesi") ||
    text.includes("piccadilly")
  ) {
    categoria = "Conforto";
  } else if (
    text.includes("acessório") ||
    text.includes("acessorio") ||
    text.includes("bolsa") ||
    text.includes("mochila") ||
    text.includes("carteira") ||
    text.includes("cinto")
  ) {
    categoria = "Acessórios";
  } else if (
    text.includes("chinelo") ||
    text.includes("sandalia") ||
    text.includes("sandália") ||
    text.includes("rasteira") ||
    text.includes("rasteirinha") ||
    text.includes("salto") ||
    text.includes("scarpin") ||
    text.includes("bota") ||
    text.includes("botinha") ||
    text.includes("sapatilha") ||
    text.includes("vizzano") ||
    text.includes("beira rio") ||
    text.includes("moleca") ||
    text.includes("dakota") ||
    text.includes("via marte") ||
    text.includes("feminino")
  ) {
    categoria = "Feminino";
  }

  // 4. Extrair VALOR MONETÁRIO
  let valor = 0;

  // 4a. Valor explícito com vírgula ou ponto decimal: "199,90", "199.90", "R$ 250,00"
  const formatoMoedaRegex = /(?:r\$\s*)?(\d{1,4}(?:[\.,]\d{2}))/i;
  // 4b. Padrão "150 reais e 50 centavos" ou "150 reais e 50" ou "150 e 50"
  const reaisCentavosRegex = /(\d+)\s*(?:reais|real)?\s*(?:e\s*(\d{1,2})\s*(?:centavos)?)?/i;
  // 4c. Padrão número seguido de "reais": "150 reais", "200 real"
  const numeroReaisRegex = /(\d+)\s*(?:reais|real)/i;

  const matchMoeda = text.match(formatoMoedaRegex);
  const matchReais = text.match(numeroReaisRegex);
  const matchReaisCent = text.match(reaisCentavosRegex);

  if (matchMoeda && matchMoeda[1]) {
    valor = parseValorMonetario(matchMoeda[1]);
  } else if (matchReais && matchReais[1]) {
    valor = parseFloat(matchReais[1]) || 0;
  } else if (
    matchReaisCent &&
    matchReaisCent[1] &&
    (text.includes("real") || text.includes("reais") || matchReaisCent[2])
  ) {
    const inteiro = parseFloat(matchReaisCent[1]) || 0;
    let centavos = 0;
    if (matchReaisCent[2]) {
      centavos = parseInt(matchReaisCent[2], 10) || 0;
      if (centavos < 10 && matchReaisCent[2].length === 1) centavos *= 10;
    }
    valor = inteiro + centavos / 100;
  } else {
    // 4d. Tentar converter números por extenso
    const extensoNum = converterExtensoParaNumero(text);
    if (extensoNum > 0) {
      valor = extensoNum;
    } else {
      // 4e. Fallback: procurar qualquer número no texto
      const generalNumMatch = text.match(/(\d+(?:[\.,]\d{1,2})?)/);
      if (generalNumMatch && generalNumMatch[1]) {
        valor = parseValorMonetario(generalNumMatch[1]);
      }
    }
  }

  // Descrição
  const descricaoOriginal = transcript.trim();
  const descricao =
    descricaoOriginal.length > 2
      ? descricaoOriginal.charAt(0).toUpperCase() + descricaoOriginal.slice(1)
      : `${pares} par(es) ${categoria}`;

  return {
    valorStr:
      valor > 0
        ? valor.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "",
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
  const [statusMsg, setStatusMsg] = useState<string>("Toque no microfone para começar");
  const [speechSupported, setSpeechSupported] = useState(true);

  // Editable parsed fields
  const [valorInput, setValorInput] = useState("");
  const [paresInput, setParesInput] = useState("1");
  const [agregadosInput, setAgregadosInput] = useState("0");
  const [categoriaInput, setCategoriaInput] = useState("Feminino");
  const [descricaoInput, setDescricaoInput] = useState("");

  const recognitionRef = useRef<any>(null);

  // Check speech recognition support once on mount/open
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      setSpeechSupported(!!SpeechRecognition);
    }
  }, []);

  // Reset states on modal open / close
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript("");
      setErrorMsg(null);
      setValorInput("");
      setParesInput("1");
      setAgregadosInput("0");
      setCategoriaInput("Feminino");
      setDescricaoInput("");
      setStatusMsg("Toque no microfone para começar");
      return;
    }

    // When opened, do NOT auto-start to avoid browser security policy rejections!
    // Instead, prompt the user with a friendly invitation to tap.
    setStatusMsg("Clique no botão do microfone e fale a venda.");
  }, [isOpen]);

  // Clean up recognition instance when unmounting
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // Update parsed inputs whenever new transcript text is processed
  const applyParsedText = (text: string) => {
    const parsed = parseSpokenText(text);
    if (parsed.valorStr) setValorInput(parsed.valorStr);
    if (parsed.paresStr) setParesInput(parsed.paresStr);
    if (parsed.agregadosStr) setAgregadosInput(parsed.agregadosStr);
    if (parsed.categoria) setCategoriaInput(parsed.categoria);
    if (parsed.descricao) setDescricaoInput(parsed.descricao);
  };

  const startListening = async () => {
    setErrorMsg(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg(
        "Seu navegador não possui suporte ao microfone Web Speech. Você pode digitar a venda diretamente no campo abaixo!"
      );
      setSpeechSupported(false);
      return;
    }

    // Stop any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    try {
      // Create a brand-new instance for every recognition cycle
      const recognition = new SpeechRecognition();
      recognition.lang = "pt-BR";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMsg("Ouvindo... Pode falar agora!");
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        let finalStr = "";
        let interimStr = "";

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalStr += res[0].transcript + " ";
          } else {
            interimStr += res[0].transcript;
          }
        }

        const fullCurrentText = (finalStr + interimStr).trim();
        setTranscript(fullCurrentText);
        applyParsedText(fullCurrentText);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);

        if (event.error === "no-speech") {
          setStatusMsg("Nenhuma voz foi detectada. Tente novamente falando perto do aparelho.");
        } else if (event.error === "not-allowed") {
          setErrorMsg(
            "Permissão de microfone negada. Verifique as permissões no cadeado da barra do navegador ou digite a venda abaixo."
          );
        } else if (event.error === "audio-capture") {
          setErrorMsg("Nenhum microfone encontrado neste dispositivo.");
        } else if (event.error === "network") {
          setErrorMsg(
            "Erro de conexão com o serviço de voz do navegador. Você pode digitar a venda no campo abaixo."
          );
        } else if (event.error !== "aborted") {
          setErrorMsg(`Aviso do microfone: ${event.error}. Você pode digitar a frase abaixo.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setStatusMsg("Gravação finalizada. Confira os dados identificados abaixo.");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
      setErrorMsg(
        "Não foi possível iniciar o microfone. Você pode digitar os dados da venda diretamente no campo abaixo."
      );
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleManualTranscriptChange = (text: string) => {
    setTranscript(text);
    applyParsedText(text);
  };

  const handleApplySample = (sample: string) => {
    setTranscript(sample);
    applyParsedText(sample);
    setErrorMsg(null);
  };

  const handleConfirm = () => {
    const valor = parseValorMonetario(valorInput);
    if (valor <= 0) {
      setErrorMsg("Por favor, preencha um valor válido para a venda.");
      return;
    }

    onParsedSale({
      valorStr: valorInput,
      paresStr: paresInput || "1",
      agregadosStr: agregadosInput || "0",
      categoria: categoriaInput || "Feminino",
      descricao:
        descricaoInput.trim() ||
        `${paresInput || "1"} par(es) ${categoriaInput || "Feminino"}`,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-700 to-sky-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                Lançamento Rápido por Voz
              </h3>
              <p className="text-[11px] text-blue-100 font-medium">
                Fale ou digite a venda e preencheremos os dados para você
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

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Microphone Central Action */}
          <div className="flex flex-col items-center justify-center py-2 text-center">
            <div className="relative">
              {isListening && (
                <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
              )}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 ${
                  isListening
                    ? "bg-red-500 text-white ring-8 ring-red-100 animate-pulse"
                    : "bg-blue-700 text-white hover:bg-blue-800 ring-4 ring-blue-100"
                }`}
                title={isListening ? "Clique para pausar" : "Clique para falar"}
              >
                {isListening ? (
                  <Mic className="w-9 h-9" />
                ) : (
                  <Mic className="w-9 h-9" />
                )}
              </button>
            </div>

            <p className="mt-3 text-xs font-bold text-slate-800">
              {statusMsg}
            </p>

            <span className="text-[11px] text-slate-500 max-w-xs mt-0.5">
              Ex: <em>"Cento e noventa e nove reais, um par feminino e uma meia"</em>
            </span>
          </div>

          {/* Transcript / Input text box */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                Texto capturado / Digitação rápida:
              </label>
              {transcript && (
                <button
                  type="button"
                  onClick={() => handleManualTranscriptChange("")}
                  className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={transcript}
                onChange={(e) => handleManualTranscriptChange(e.target.value)}
                placeholder="Ou digite aqui (ex: 250 tênis masculino 1 par e 1 meia)..."
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Quick Test Samples */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Exemplos rápidos:
            </span>
            <button
              type="button"
              onClick={() => handleApplySample("199,90 tênis feminino")}
              className="text-[11px] px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer transition-colors"
            >
              199,90 tênis fem
            </button>
            <button
              type="button"
              onClick={() => handleApplySample("280 reais 2 pares calçado e 1 meia")}
              className="text-[11px] px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer transition-colors"
            >
              280 2 pares + meia
            </button>
            <button
              type="button"
              onClick={() => handleApplySample("350 sapatênis masculino")}
              className="text-[11px] px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer transition-colors"
            >
              350 sapatênis masc
            </button>
          </div>

          {/* Parsed Result Preview & Direct Adjustments */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Dados que serão preenchidos:</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal">
                Você pode ajustar os valores diretamente abaixo:
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {/* Valor */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  Valor (R$):
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-2 text-xs font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="text"
                    value={valorInput}
                    onChange={(e) => setValorInput(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-7 pr-2 py-1 text-sm font-extrabold text-emerald-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Pares */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  Pares Calçado:
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setParesInput((prev) =>
                        String(Math.max(1, (parseInt(prev, 10) || 1) - 1))
                      )
                    }
                    className="w-6 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={paresInput}
                    onChange={(e) => setParesInput(e.target.value)}
                    className="w-full text-center py-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setParesInput((prev) =>
                        String((parseInt(prev, 10) || 0) + 1)
                      )
                    }
                    className="w-6 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Agregados */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  Agregados:
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setAgregadosInput((prev) =>
                        String(Math.max(0, (parseInt(prev, 10) || 0) - 1))
                      )
                    }
                    className="w-6 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={agregadosInput}
                    onChange={(e) => setAgregadosInput(e.target.value)}
                    className="w-full text-center py-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAgregadosInput((prev) =>
                        String((parseInt(prev, 10) || 0) + 1)
                      )
                    }
                    className="w-6 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Categoria Selector */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  Categoria:
                </label>
                <select
                  value={categoriaInput}
                  onChange={(e) => setCategoriaInput(e.target.value)}
                  className="w-full py-1 px-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                >
                  {CATEGORIAS_DISPONIVEIS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                Descrição ou Detalhes do Produto:
              </label>
              <input
                type="text"
                value={descricaoInput}
                onChange={(e) => setDescricaoInput(e.target.value)}
                placeholder="Ex: Tênis Mizuno Feminino + Meia Cano Alto"
                className="w-full px-2.5 py-1 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
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
            disabled={!valorInput || parseValorMonetario(valorInput) <= 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
              valorInput && parseValorMonetario(valorInput) > 0
                ? "bg-blue-700 hover:bg-blue-800 text-white shadow-blue-700/20"
                : "bg-slate-300 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Confirmar e Inserir Venda</span>
          </button>
        </div>
      </div>
    </div>
  );
}
