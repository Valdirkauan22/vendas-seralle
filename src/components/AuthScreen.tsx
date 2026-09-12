import React, { useState, useRef } from "react";
import {
  Lock,
  Mail,
  User as UserIcon,
  Store,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
  Smartphone,
  Cloud,
  Upload,
  FileJson,
} from "lucide-react";
import { LogoSeralle } from "@/components/LogoSeralle";
import { useAuth } from "@/context/AuthContext";
import { useVendas } from "@/context/VendasContext";

interface AuthScreenProps {
  onOpenMobileGuide?: () => void;
}

export function AuthScreen({ onOpenMobileGuide }: AuthScreenProps) {
  const { entrar, entrarComGoogle, cadastrar, recuperarSenha, entrarModoOffline } = useAuth();
  const { restaurarPorCodigo, importarBackup } = useVendas();

  const [mode, setMode] = useState<"login" | "cadastro" | "recuperar" | "restaurar">("login");
  const [nome, setNome] = useState("");
  const [loja, setLoja] = useState("Serallê Calçados");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [syncCodeInput, setSyncCodeInput] = useState("");
  const [restoringSync, setRestoringSync] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setGoogleLoading(true);
    try {
      await entrarComGoogle();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setErrorMessage("A janela do Google foi fechada antes de concluir o login.");
      } else if (err.code === "auth/popup-blocked") {
        setErrorMessage("O navegador bloqueou o pop-up do Google. Permita pop-ups para fazer login.");
      } else if (err.code === "auth/account-exists-with-different-credential") {
        setErrorMessage("Já existe uma conta associada a este e-mail com outro método de acesso.");
      } else {
        setErrorMessage(err.message || "Não foi possível entrar com o Google. Tente com e-mail e senha ou no Modo Offline.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleRestaurarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = syncCodeInput.trim().toUpperCase();
    if (!code) {
      setErrorMessage("Por favor, digite o código de sincronização.");
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    setRestoringSync(true);
    try {
      const res = await restaurarPorCodigo(code);
      if (res.success) {
        setSuccessMessage(res.message);
        setTimeout(() => {
          entrarModoOffline("Vendedora Serallê", "Serallê Calçados");
        }, 1200);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao consultar a nuvem.");
    } finally {
      setRestoringSync(false);
    }
  };

  const handleArquivoBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setRestoringSync(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const res = await importarBackup(content);
        if (res.success) {
          setSuccessMessage(res.message);
          setTimeout(() => {
            entrarModoOffline("Vendedora Serallê", "Serallê Calçados");
          }, 1200);
        } else {
          setErrorMessage(res.message);
        }
      } catch (err: any) {
        setErrorMessage("Erro ao processar o arquivo de backup.");
      } finally {
        setRestoringSync(false);
      }
    };
    reader.readAsText(file);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (mode === "recuperar") {
      if (!email.trim()) {
        setErrorMessage("Informe seu e-mail para receber as instruções.");
        return;
      }
      setLoading(true);
      try {
        await recuperarSenha(email.trim());
        setSuccessMessage("Instruções de redefinição de senha enviadas para o seu e-mail!");
      } catch (err: any) {
        console.error(err);
        if (err.code === "auth/user-not-found") {
          setErrorMessage("Nenhuma conta encontrada com este e-mail.");
        } else if (err.code === "auth/invalid-email") {
          setErrorMessage("Formato de e-mail inválido.");
        } else {
          setErrorMessage("Não foi possível enviar o e-mail. Tente novamente.");
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === "cadastro") {
      if (!nome.trim()) {
        setErrorMessage("Por favor, preencha seu nome.");
        return;
      }
      if (!email.trim()) {
        setErrorMessage("Por favor, informe seu e-mail.");
        return;
      }
      if (senha.length < 6) {
        setErrorMessage("A senha deve conter no mínimo 6 caracteres.");
        return;
      }
      if (senha !== confirmarSenha) {
        setErrorMessage("As senhas digitadas não coincidem.");
        return;
      }

      setLoading(true);
      try {
        await cadastrar(nome, email, senha, loja);
      } catch (err: any) {
        console.error(err);
        if (err.code === "auth/email-already-in-use") {
          setErrorMessage("Este e-mail já possui cadastro. Faça login ou use outro e-mail.");
        } else if (err.code === "auth/invalid-email") {
          setErrorMessage("Formato de e-mail inválido.");
        } else if (err.code === "auth/weak-password") {
          setErrorMessage("A senha é muito fraca. Escolha ao menos 6 dígitos.");
        } else if (err.code === "auth/operation-not-allowed") {
          setErrorMessage(
            "O método de autenticação por E-mail e Senha precisa estar ativado no painel do Firebase Console (Authentication > Sign-in method > Email/Password). Você também pode usar o Modo Offline local clicando abaixo."
          );
        } else {
          setErrorMessage(err.message || "Erro ao criar conta. Verifique sua conexão e tente novamente.");
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // Login mode
    if (!email.trim() || !senha) {
      setErrorMessage("Preencha seu e-mail e senha para acessar.");
      return;
    }

    setLoading(true);
    try {
      await entrar(email, senha);
    } catch (err: any) {
      console.error(err);
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found"
      ) {
        setErrorMessage("E-mail ou senha incorretos. Verifique os dados.");
      } else if (err.code === "auth/invalid-email") {
        setErrorMessage("E-mail inválido.");
      } else if (err.code === "auth/too-many-requests") {
        setErrorMessage("Muitas tentativas sem sucesso. Aguarde alguns instantes.");
      } else if (err.code === "auth/operation-not-allowed") {
        setErrorMessage(
          "O login por E-mail/Senha precisa estar ativado no Firebase Console (Authentication > Sign-in method > Email/Password). Você também pode entrar no Modo Offline local."
        );
      } else {
        setErrorMessage(err.message || "Erro ao fazer login. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 1.5rem)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1.5rem)",
      }}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-[#072448] to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 selection:bg-[#0082D7] selection:text-white"
    >
      {/* Brand Subtle Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-[#0082D7]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="bg-white/95 p-4 rounded-3xl shadow-2xl border border-white/20 mb-4 backdrop-blur-md">
            <LogoSeralle size="lg" />
          </div>
          <p className="text-sm font-semibold text-sky-200 mt-1">
            Diário Oficial de Vendas & Metas Individuais
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 text-slate-900 shadow-2xl border border-slate-100">
          {/* Mode Switcher Tabs */}
          {mode === "restaurar" ? (
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-amber-600" />
                Restaurar Vendas Salvas
              </h2>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-xs font-bold text-[#0082D7] hover:underline cursor-pointer"
              >
                Voltar ao Login
              </button>
            </div>
          ) : mode === "recuperar" ? (
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#0082D7]" />
                Recuperar Senha
              </h2>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-xs font-bold text-[#0082D7] hover:underline cursor-pointer"
              >
                Voltar ao Login
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "login"
                    ? "bg-white text-[#0082D7] shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Entrar (Login)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("cadastro");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "cadastro"
                    ? "bg-white text-[#0082D7] shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Criar Conta</span>
              </button>
            </div>
          )}

          {/* Alerts */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">{successMessage}</div>
            </div>
          )}

          {/* ─── TELA DEDICADA DE RESTAURAÇÃO (PÓS-REINSTALAÇÃO) ─── */}
          {mode === "restaurar" ? (
            <div className="space-y-4 animate-in fade-in">
              <p className="text-xs text-slate-600 leading-relaxed">
                Se você desinstalou e reinstalou o app ou trocou de celular, recupere todos os seus lançamentos e metas abaixo:
              </p>

              {/* Opção 1: Por Código de Sincronização */}
              <form onSubmit={handleRestaurarCodigo} className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      1. Restaurar por Código de Sincronização
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      O código de 6 a 8 letras que você usava antes de desinstalar.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: SER-4921 ou A1B2C3D4"
                    value={syncCodeInput}
                    onChange={(e) => setSyncCodeInput(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 text-sm uppercase font-mono tracking-wider font-bold bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={restoringSync}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {restoringSync ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Consultando nuvem...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      <span>Restaurar Minhas Vendas da Nuvem</span>
                    </>
                  )}
                </button>
              </form>

              {/* Opção 2: Por Arquivo JSON de Backup */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      2. Restaurar de Arquivo (.json)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Se você baixou um arquivo de backup antes de desinstalar.
                    </p>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleArquivoBackup}
                  accept=".json,application/json"
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={restoringSync}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-2xs"
                >
                  <FileJson className="w-4 h-4 text-emerald-600" />
                  <span>Selecionar Arquivo de Backup</span>
                </button>
              </div>

              {/* Dica Google */}
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-100 flex items-start gap-2.5 text-xs text-sky-900">
                <Sparkles className="w-4 h-4 text-[#0082D7] shrink-0 mt-0.5" />
                <p>
                  <strong>Dica de Ouro:</strong> Se você conectou sua <strong>Conta Google</strong> no app anterior, basta voltar e clicar em <strong>"Entrar com Google"</strong> para trazer tudo de volta automaticamente!
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Google Sign In Button */}
              {mode !== "recuperar" && (
                <div className="mb-5">
                  <button
                    type="button"
                    id="btn-entrar-com-google"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading || loading}
                    className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm border border-slate-300 shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {googleLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#0082D7]" />
                        <span>Conectando com o Google...</span>
                      </>
                    ) : (
                      <>
                        {/* Official Google G SVG Icon */}
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Entrar com Google</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center my-4">
                    <div className="flex-1 border-t border-slate-200" />
                    <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      ou com e-mail
                    </span>
                    <div className="flex-1 border-t border-slate-200" />
                  </div>
                </div>
              )}

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {/* Registration specific fields */}
            {mode === "cadastro" && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nome Completo da Vendedora
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Juliana Santos"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0082D7] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Loja / Filial Serallê
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ex: Serallê Maringá Centro"
                      value={loja}
                      onChange={(e) => setLoja(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0082D7] focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="vendedora@seralle.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0082D7] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            {mode !== "recuperar" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {mode === "cadastro" ? "Criar Senha" : "Senha"}
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("recuperar");
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] font-bold text-[#0082D7] hover:underline cursor-pointer"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full pl-10 pr-11 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0082D7] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password Field */}
            {mode === "cadastro" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Repita sua senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0082D7] focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-2xl bg-[#0082D7] hover:bg-[#0072C6] active:scale-[0.99] text-white font-extrabold text-sm transition-all shadow-lg shadow-[#0082D7]/25 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : mode === "login" ? (
                <>
                  <span>Entrar no Diário</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === "cadastro" ? (
                <>
                  <span>Criar Minha Conta Segura</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Enviar Link de Recuperação</span>
                  <Mail className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
          </>
          )}

          {/* Quick Offline & Restoration Options */}
          {mode !== "restaurar" && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("restaurar");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5 text-amber-600" />
                <span>Reinstalou o app? Restaurar Vendas Salvas</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const vendedorNome = nome.trim() || "Vendedora Serallê";
                  entrarModoOffline(vendedorNome, loja);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#0082D7]" />
                <span>Entrar sem login (Modo Rápido / Offline)</span>
              </button>
            </div>
          )}

          {/* Data Privacy Guarantee Badge */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-start gap-2.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-800">Privacidade Absoluta:</strong> Seus lançamentos de vendas, comissões e metas ficam protegidos em sua conta individual.
            </p>
          </div>
        </div>

        {/* Mobile App QR Code quick access */}
        {onOpenMobileGuide && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onOpenMobileGuide}
              className="inline-flex items-center gap-2 text-xs font-bold text-sky-200 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all border border-white/10 backdrop-blur-xs cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-amber-300" />
              <span>Como instalar no Celular (Android / iPhone)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
