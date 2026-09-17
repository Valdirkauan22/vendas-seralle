import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle, Check, Sparkles, X, Volume2, Loader2, RefreshCw, Settings, Square, ArrowRight, ExternalLink, Radio } from "lucide-react";
import { parseValorMonetario, converterExtensoParaNumero } from "@/utils/formatters";
import { getApiUrl } from "@/utils/apiConfig";

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

// Helper para remover repetições indesejadas causadas por bugs de streaming no Web Speech API (especialmente Android)
export function deduplicateSpokenText(raw: string): string {
  if (!raw) return "";
  let text = raw.trim();

  // 1. Remove frases repetidas de 2 a 5 palavras em sequência (ex: "tênis mizuno tênis mizuno" -> "tênis mizuno")
  text = text.replace(/\b([a-zA-ZÀ-ÿ0-9]+\s+[a-zA-ZÀ-ÿ0-9]+(?:\s+[a-zA-ZÀ-ÿ0-9]+){0,3})\s+\1\b/gi, "$1");
  text = text.replace(/\b([a-zA-ZÀ-ÿ0-9]+\s+[a-zA-ZÀ-ÿ0-9]+(?:\s+[a-zA-ZÀ-ÿ0-9]+){0,3})\s+\1\b/gi, "$1");

  // 2. Remove repetição consecutiva da mesma palavra (ex: "tênis tênis tênis" -> "tênis", "mizuno mizuno" -> "mizuno")
  text = text.replace(/\b([a-zA-ZÀ-ÿ0-9]+)(?:\s+\1\b)+/gi, "$1");

  // 3. Segunda passada para capturar repetições aninhadas
  text = text.replace(/\b([a-zA-ZÀ-ÿ0-9]+\s+[a-zA-ZÀ-ÿ0-9]+(?:\s+[a-zA-ZÀ-ÿ0-9]+){0,3})\s+\1\b/gi, "$1");
  text = text.replace(/\b([a-zA-ZÀ-ÿ0-9]+)(?:\s+\1\b)+/gi, "$1");

  // 4. Normaliza espaços múltiplos
  return text.replace(/\s{2,}/g, " ").trim();
}

// Helper robusto para extrair valores, pares, agregados e categoria do texto falado ou digitado
export function parseSpokenText(transcript: string) {
  const cleanedOriginal = deduplicateSpokenText(transcript);
  let text = cleanedOriginal.toLowerCase().trim();
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

  // Descrição limpa sem repetições
  const descricaoOriginal = cleanedOriginal.trim();
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("Toque no microfone para começar");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [audioVolume, setAudioVolume] = useState<number>(0);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [activeEngine, setActiveEngine] = useState<"speech" | "media_recorder">("speech");

  // Editable parsed fields
  const [valorInput, setValorInput] = useState("");
  const [paresInput, setParesInput] = useState("1");
  const [agregadosInput, setAgregadosInput] = useState("0");
  const [categoriaInput, setCategoriaInput] = useState("Feminino");
  const [descricaoInput, setDescricaoInput] = useState("");

  const recognitionRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptCaughtRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);

  // Check speech recognition support once on mount/open
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      setSpeechSupported(!!SpeechRecognition || !!navigator?.mediaDevices?.getUserMedia);
    }
  }, []);

  // Reset states on modal open / close
  useEffect(() => {
    if (!isOpen) {
      cleanupListening();
      setTranscript("");
      setErrorMsg(null);
      setPermissionDenied(false);
      setValorInput("");
      setParesInput("1");
      setAgregadosInput("0");
      setCategoriaInput("Feminino");
      setDescricaoInput("");
      setStatusMsg("Toque no microfone para começar");
      setIsProcessingAudio(false);
      setAudioVolume(0);
      setRecordingSeconds(0);
      setIsSpeaking(false);
      return;
    }

    setStatusMsg("Clique no botão do microfone e fale a venda.");
  }, [isOpen]);

  // Clean up recognition and stream when unmounting
  useEffect(() => {
    return () => {
      cleanupListening();
    };
  }, []);

  const cleanupAudioAnalyser = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    setAudioVolume(0);
  };

  const cleanupListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    setIsSpeaking(false);

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    cleanupAudioAnalyser();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {}
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
  };

  // Update parsed inputs whenever new transcript text is processed
  const applyParsedText = (text: string) => {
    const parsed = parseSpokenText(text);
    if (parsed.valorStr) setValorInput(parsed.valorStr);
    if (parsed.paresStr) setParesInput(parsed.paresStr);
    if (parsed.agregadosStr) setAgregadosInput(parsed.agregadosStr);
    if (parsed.categoria) setCategoriaInput(parsed.categoria);
    if (parsed.descricao) setDescricaoInput(parsed.descricao);
  };

  const processAudioWithGemini = async (audioBlob: Blob) => {
    try {
      setIsProcessingAudio(true);
      setStatusMsg("Analisando áudio com Inteligência Artificial...");

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);

      const audioBase64 = await base64Promise;
      if (!audioBase64) {
        throw new Error("Falha ao preparar gravação de áudio.");
      }

      const response = await fetch(getApiUrl("/api/transcribe-voice"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          mimeType: audioBlob.type || "audio/webm",
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Erro do servidor (${response.status})`);
      }

      const data = await response.json();

      if (data.transcricao) {
        setTranscript(data.transcricao);
      }
      if (data.valor && data.valor > 0) {
        setValorInput(
          Number(data.valor).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        );
      }
      if (data.pares !== undefined) setParesInput(String(data.pares || 1));
      if (data.agregados !== undefined) setAgregadosInput(String(data.agregados || 0));
      if (data.categoria) setCategoriaInput(data.categoria);
      if (data.descricao) setDescricaoInput(data.descricao);

      setStatusMsg("Venda identificada com sucesso!");
      setErrorMsg(null);
    } catch (err: any) {
      console.warn("Erro no processamento de voz:", err);
      if (!transcript) {
        setErrorMsg("Não foi possível transcrever automaticamente. Você pode digitar a venda no campo abaixo!");
      }
    } finally {
      setIsProcessingAudio(false);
    }
  };

  // Modo 1: Reconhecimento nativo Web Speech API (sem conflitos com getUserMedia)
  const startListening = async (forceMediaRecorder = false) => {
    cleanupListening();
    setErrorMsg(null);
    setPermissionDenied(false);
    transcriptCaughtRef.current = false;
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!forceMediaRecorder && SpeechRecognition) {
      try {
        setActiveEngine("speech");
        const recognition = new SpeechRecognition();
        recognition.lang = "pt-BR";
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          isListeningRef.current = true;
          setIsListening(true);
          setStatusMsg("Microfone aberto! Pode falar a sua venda...");
        };

        recognition.onaudiostart = () => {
          setIsListening(true);
        };

        recognition.onspeechstart = () => {
          setIsSpeaking(true);
          setStatusMsg("Captando sua voz...");
        };

        recognition.onspeechend = () => {
          setIsSpeaking(false);
        };

        recognition.onresult = (event: any) => {
          let combined = "";

          for (let i = 0; i < event.results.length; i++) {
            const item = (event.results[i][0]?.transcript || "").trim();
            if (!item) continue;

            // Se o item atual já é uma versão atualizada ou expandida do texto
            if (combined && item.toLowerCase().startsWith(combined.toLowerCase())) {
              combined = item;
            } else if (combined && combined.toLowerCase().includes(item.toLowerCase())) {
              // Já está contido, ignora repetição
            } else {
              combined = combined ? `${combined} ${item}` : item;
            }
          }

          const cleanedText = deduplicateSpokenText(combined);
          if (cleanedText.length > 0) {
            transcriptCaughtRef.current = true;
            setIsSpeaking(true);
            setTranscript(cleanedText);
            applyParsedText(cleanedText);
            setStatusMsg(`Captado: "${cleanedText}"`);

            // Se o último resultado for final (isFinal), agenda parada suave da escuta
            const lastRes = event.results[event.results.length - 1];
            if (lastRes?.isFinal) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = setTimeout(() => {
                if (isListeningRef.current) {
                  stopListening();
                }
              }, 600);
            } else {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = setTimeout(() => {
                if (isListeningRef.current) {
                  stopListening();
                }
              }, 2000);
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition notice:", event.error);
          if (event.error === "not-allowed" || event.error === "permission-denied") {
            setPermissionDenied(true);
            setErrorMsg("Permissão de microfone negada. Veja o passo a passo abaixo para liberar no celular.");
            cleanupListening();
          } else if (event.error === "no-speech") {
            setStatusMsg("Nenhuma fala detectada. Fale perto do microfone.");
          } else if (event.error === "audio-capture" || event.error === "network") {
            // Em caso de erro de rede ou hardware bloqueado, ativa automaticamente o gravador de áudio
            console.info("Migrando para modo MediaRecorder devido a:", event.error);
            startMediaRecorderFallback();
          }
        };

        recognition.onend = () => {
          setIsSpeaking(false);
          // Se já captou a fala, encerra de forma limpa sem ficar reiniciando em loop
          if (transcriptCaughtRef.current) {
            cleanupListening();
            setStatusMsg("Venda identificada com sucesso!");
          } else if (isListeningRef.current) {
            cleanupListening();
            setStatusMsg("Pronto para ouvir. Toque no microfone para falar.");
          }
        };

        recognitionRef.current = recognition;
        recognition.start();

        timerIntervalRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);

        return;
      } catch (speechErr) {
        console.warn("SpeechRecognition.start() falhou, tentando MediaRecorder:", speechErr);
      }
    }

    // Modo 2: Fallback com gravação de áudio via getUserMedia + MediaRecorder + Gemini
    await startMediaRecorderFallback();
  };

  const startMediaRecorderFallback = async () => {
    cleanupListening();
    setActiveEngine("media_recorder");

    let stream: MediaStream | null = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        audioStreamRef.current = stream;
      } catch (err: any) {
        console.warn("Erro getUserMedia:", err);
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError" ||
          err.name === "SecurityError"
        ) {
          setIsListening(false);
          isListeningRef.current = false;
          setPermissionDenied(true);
          setErrorMsg(
            "Permissão de microfone negada. Veja o passo a passo abaixo para liberar no celular."
          );
          return;
        }
      }
    }

    if (!stream) {
      setPermissionDenied(true);
      setErrorMsg("Não foi possível acessar o microfone deste aparelho. Você pode digitar a venda abaixo.");
      return;
    }

    isListeningRef.current = true;
    setIsListening(true);
    setStatusMsg("Gravando áudio... Fale a sua venda perto do aparelho.");

    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    // Conecta Web Audio API para detecção de volume e animação em tempo real
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.4;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const sampleAudio = () => {
          if (!isListeningRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / (dataArray.length || 1);
          const vol = Math.min(100, Math.round((avg / 128) * 160));
          setAudioVolume(vol);
          setIsSpeaking(vol > 15);
          animFrameRef.current = requestAnimationFrame(sampleAudio);
        };
        animFrameRef.current = requestAnimationFrame(sampleAudio);
      }
    } catch (audioErr) {
      console.warn("AudioContext visualizer notice:", audioErr);
    }

    // Inicializa MediaRecorder
    try {
      let mimeType = "";
      if (typeof MediaRecorder !== "undefined") {
        const candidateTypes = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/aac",
          "audio/ogg",
        ];
        for (const type of candidateTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            break;
          }
        }

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach((t) => t.stop());
            audioStreamRef.current = null;
          }

          if (audioChunksRef.current.length > 0) {
            const finalBlob = new Blob(audioChunksRef.current, {
              type: mimeType || "audio/webm",
            });

            const existingVal = parseValorMonetario(valorInput);
            if (existingVal > 0 && transcriptCaughtRef.current) {
              setStatusMsg("Venda identificada com sucesso!");
            } else if (finalBlob.size > 200) {
              processAudioWithGemini(finalBlob);
            }
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(100);
      }
    } catch (recErr) {
      console.warn("MediaRecorder falhou:", recErr);
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    setIsSpeaking(false);

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    cleanupAudioAnalyser();

    // Para SpeechRecognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
      recognitionRef.current = null;
    }

    // Para MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {}
    } else {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
    }

    if (transcriptCaughtRef.current || valorInput) {
      setStatusMsg("Venda identificada com sucesso!");
    } else {
      setStatusMsg("Gravação finalizada.");
    }
  };

  const handleManualTranscriptChange = (text: string) => {
    setTranscript(text);
    applyParsedText(text);
  };

  const handleApplySample = (sample: string) => {
    setTranscript(sample);
    applyParsedText(sample);
    setErrorMsg(null);
    setPermissionDenied(false);
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
            {isProcessingAudio ? (
              <div className="flex flex-col items-center gap-2.5 py-3">
                <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-inner">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-indigo-900">{statusMsg}</p>
                  <p className="text-[10px] text-slate-500">Aguarde alguns instantes...</p>
                </div>
              </div>
            ) : isListening ? (
              <div className="flex flex-col items-center gap-2 w-full py-1">
                {/* Visualizador de Ondas de Som em Tempo Real */}
                <div className="flex items-center justify-center gap-1.5 h-12">
                  {[0.6, 1.0, 1.5, 2.0, 1.5, 1.0, 0.6].map((mult, idx) => {
                    // Se o usuário está falando ou se há volume captado no MediaRecorder
                    let h = 8;
                    const isActive = isSpeaking || audioVolume > 10;
                    if (isActive) {
                      if (audioVolume > 10) {
                        h = Math.max(8, Math.min(44, Math.round(audioVolume * mult * 0.45) + 6));
                      } else {
                        // Animação rítmica enquanto a Web Speech API capta a voz
                        const wavePattern = [16, 28, 40, 44, 38, 26, 14];
                        h = wavePattern[idx] || 20;
                      }
                    }
                    return (
                      <div
                        key={idx}
                        className={`w-2 rounded-full transition-all duration-100 ${
                          isActive
                            ? "bg-emerald-500 shadow-sm animate-pulse"
                            : "bg-slate-300"
                        }`}
                        style={{ height: `${h}px` }}
                      />
                    );
                  })}
                </div>

                {/* Indicador de Nível / Estado de Captação */}
                <div className="flex items-center justify-center mt-1">
                  {isSpeaking || audioVolume > 10 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Captando sua voz em tempo real
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                      <Radio className="w-3 h-3 text-blue-600 animate-spin" />
                      Microfone aberto! Pode falar a venda agora
                    </span>
                  )}
                </div>

                <p className="text-xs font-bold text-slate-800 mt-1 max-w-sm text-center">
                  {statusMsg}
                </p>

                {/* Botões de Ação durante a escuta */}
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={stopListening}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-500/25 active:scale-95 transition-all cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Concluir ({String(recordingSeconds).padStart(2, "0")}s)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startListening(activeEngine === "speech")}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                    title="Alternar entre modo nativo e gravação com IA"
                  >
                    {activeEngine === "speech" ? "Usar Gravação IA" : "Usar Voz Direta"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => startListening(false)}
                  className="w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 bg-blue-700 text-white hover:bg-blue-800 ring-4 ring-blue-100 group"
                  title="Toque para falar a venda"
                >
                  <Mic className="w-9 h-9 group-hover:scale-110 transition-transform" />
                </button>

                <p className="mt-3 text-xs font-bold text-slate-800">
                  {statusMsg}
                </p>

                <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                  <span className="text-[11px] text-slate-500">
                    Toque no microfone e diga a venda
                  </span>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => startListening(true)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2 cursor-pointer"
                  >
                    Gravar com IA
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 max-w-xs mt-1">
                  Ex: <em>"Cento e noventa e nove reais, tênis feminino e uma meia"</em>
                </span>
              </div>
            )}
          </div>

          {/* Transcript / Input text box */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                Texto capturado / Digitação rápida:
              </label>
              <div className="flex items-center gap-2">
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
            </div>
            <div className="relative flex items-center gap-1.5">
              <input
                type="text"
                value={transcript}
                onChange={(e) => handleManualTranscriptChange(e.target.value)}
                placeholder="Ou digite aqui (ex: 250 tênis masculino 1 par e 1 meia)..."
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
              />
              {transcript.trim() && (
                <button
                  type="button"
                  onClick={() => applyParsedText(transcript)}
                  title="Analisar texto digitado e preencher campos"
                  className="shrink-0 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Preencher</span>
                </button>
              )}
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

          {/* Android Permission Guide */}
          {permissionDenied && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <Settings className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Como liberar o microfone no celular:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-800/90 pl-1 leading-relaxed">
                <li>Abra as <strong>Configurações</strong> do seu celular Android.</li>
                <li>Toque em <strong>Aplicativos</strong> e selecione o <strong>Serallê Vendas</strong>.</li>
                <li>Toque em <strong>Permissões</strong> &gt; <strong>Microfone</strong> e escolha <strong>"Permitir durante o uso do app"</strong>.</li>
              </ol>
              <div className="pt-1 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => startListening(false)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tentar Novamente</span>
                </button>
                <a
                  href={typeof window !== "undefined" ? window.location.href : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir App em Nova Aba</span>
                </a>
                <span className="text-[10px] text-amber-700">
                  Ou digite os dados no campo acima.
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && !permissionDenied && (
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
