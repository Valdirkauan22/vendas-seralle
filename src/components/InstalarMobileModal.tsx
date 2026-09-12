import React, { useState, useEffect } from "react";
import {
  X,
  Smartphone,
  QrCode,
  Copy,
  Check,
  Share2,
  Download,
  Apple,
  Globe,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { LogoSeralle } from "@/components/LogoSeralle";

interface InstalarMobileModalProps {
  onClose: () => void;
}

export function InstalarMobileModal({ onClose }: InstalarMobileModalProps) {
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"android" | "ios">("android");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Determine the absolute public URL of the app
    const url = window.location.href;
    setCurrentUrl(url);

    // Listen for PWA installation prompt if available
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Detect if already running standalone
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `📲 Acesse e instale o Diário de Vendas Serallê no seu celular:\n${currentUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#0082D7] to-[#005FA3] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Smartphone className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Usar no Celular (Modo Aplicativo)
              </h3>
              <p className="text-xs text-sky-100 font-medium">
                Escaneie o QR Code ou adicione à tela inicial
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sky-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* QR Code Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-inner shrink-0 flex flex-col items-center">
              {currentUrl ? (
                <QRCodeSVG
                  value={currentUrl}
                  size={140}
                  level="M"
                  includeMargin={false}
                  fgColor="#0F172A"
                />
              ) : (
                <div className="w-[140px] h-[140px] bg-slate-100 animate-pulse rounded-lg" />
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-[#0082D7] border border-sky-200 mb-1">
                  <Sparkles className="w-3 h-3 text-[#0082D7]" />
                  Acesso Instantâneo
                </span>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Aponte a câmera do seu celular
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Abra a câmera do smartphone para abrir o Diário de Vendas Serallê diretamente no aparelho.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                  <span>{copied ? "Link Copiado!" : "Copiar Link"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Enviar por WhatsApp</span>
                </button>
              </div>
            </div>
          </div>

          {/* Native PWA Install Button if available */}
          {deferredPrompt && !isInstalled && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#0082D7] to-[#006BB5] text-white shadow-md flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-black">Instalar Diário no Aparelho</h4>
                  <p className="text-xs text-sky-100">Criar atalho direto de aplicativo</p>
                </div>
              </div>
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 rounded-xl bg-white text-[#0082D7] font-extrabold text-xs shadow-md hover:bg-sky-50 transition-all cursor-pointer"
              >
                Instalar Agora
              </button>
            </div>
          )}

          {/* Step-by-step Installation Tutorial */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Como fixar como Aplicativo na Tela de Início
            </h4>

            {/* Platform Tabs */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab("android")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "android"
                    ? "bg-white text-[#0082D7] shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>Android (Google Chrome)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("ios")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "ios"
                    ? "bg-white text-[#0082D7] shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Apple className="w-3.5 h-3.5 text-slate-800" />
                <span>iPhone / iPad (Safari)</span>
              </button>
            </div>

            {/* Android Steps */}
            {activeTab === "android" && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Abra o link no navegador Google Chrome
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Toque no menu de <strong>três pontinhos (⋮)</strong> no canto superior direito do navegador.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Toque em "Instalar aplicativo" ou "Adicionar à tela inicial"
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Confirme no botão "Instalar" / "Adicionar".
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Pronto! Ícone criado no celular
                    </p>
                    <p className="text-[11px] text-slate-500">
                      O aplicativo abrirá em tela cheia com alta velocidade e suporte para lançamentos rápidos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* iOS Steps */}
            {activeTab === "ios" && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-[#0082D7] flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Abra o link no navegador Safari
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Toque no botão de <strong>Compartilhar</strong> (ícone de um quadrado com a seta para cima ⎋ na barra inferior).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-[#0082D7] flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Role para baixo e selecione "Adicionar à Tela de Início"
                    </p>
                    <p className="text-[11px] text-slate-500">
                      (Opção com ícone de "+").
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-[#0082D7] flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Toque em "Adicionar" no canto superior direito
                    </p>
                    <p className="text-[11px] text-slate-500">
                      O ícone do Serallê Vendas aparecerá junto com seus outros apps!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Features Highlights */}
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-200 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Sincronização em Nuvem</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-200 font-medium">
              <Wifi className="w-4 h-4 text-[#0082D7] shrink-0" />
              <span>Funciona Rápido e Offline</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <LogoSeralle size="xs" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#0082D7] hover:bg-[#0072C6] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
