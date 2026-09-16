import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UsuarioAuth } from "@/types";

interface AuthContextType {
  user: User | null;
  userProfile: UsuarioAuth | null;
  loading: boolean;
  isModoOffline: boolean;
  entrar: (email: string, pass: string) => Promise<void>;
  entrarComGoogle: () => Promise<void>;
  cadastrar: (nome: string, email: string, pass: string, loja?: string) => Promise<void>;
  atualizarPerfilUsuario: (dados: {
    displayName?: string;
    loja?: string;
    lojaEndereco?: string;
    lojaCep?: string;
    cargo?: string;
    telefone?: string;
  }) => Promise<void>;
  entrarModoOffline: (nome?: string, loja?: string) => void;
  sair: () => Promise<void>;
  recuperarSenha: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_OFFLINE_USER = "@diario_vendas:offline_user_v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UsuarioAuth | null>(null);
  const [isModoOffline, setIsModoOffline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const sincronizarPerfilUsuario = async (currentUser: User) => {
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const snap = await getDoc(userDocRef);
      const now = new Date().toISOString();
      if (snap.exists()) {
        const data = snap.data();
        const updatedProfile: UsuarioAuth = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: data.name || currentUser.displayName || "Vendedora Serallê",
          photoURL: currentUser.photoURL || data.photoURL || null,
          loja: data.loja || "Serallê Calçados",
          lojaEndereco: data.lojaEndereco || "",
          lojaCep: data.lojaCep || "",
          cargo: data.cargo || "Vendedora",
          telefone: data.telefone || "",
          cadastroConfirmado: data.cadastroConfirmado || (data.loja && data.loja !== "Serallê Calçados") || false,
          createdAt: data.createdAt || now,
          lastLoginAt: now,
          updatedAt: data.updatedAt || now,
        };
        await setDoc(
          userDocRef,
          {
            uid: currentUser.uid,
            name: updatedProfile.displayName,
            email: updatedProfile.email,
            photoURL: updatedProfile.photoURL,
            loja: updatedProfile.loja,
            lojaEndereco: updatedProfile.lojaEndereco,
            lojaCep: updatedProfile.lojaCep,
            cargo: updatedProfile.cargo,
            telefone: updatedProfile.telefone,
            cadastroConfirmado: updatedProfile.cadastroConfirmado,
            lastLoginAt: now,
          },
          { merge: true }
        );
        setUserProfile(updatedProfile);
      } else {
        const newProfile: UsuarioAuth = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || "Vendedora Serallê",
          photoURL: currentUser.photoURL || null,
          loja: "Serallê Calçados",
          lojaEndereco: "",
          lojaCep: "",
          cargo: "Vendedora",
          telefone: "",
          cadastroConfirmado: false,
          createdAt: now,
          lastLoginAt: now,
        };
        await setDoc(userDocRef, {
          uid: currentUser.uid,
          name: newProfile.displayName,
          email: newProfile.email,
          photoURL: newProfile.photoURL,
          loja: newProfile.loja,
          lojaEndereco: "",
          lojaCep: "",
          cargo: newProfile.cargo,
          telefone: newProfile.telefone,
          cadastroConfirmado: false,
          createdAt: newProfile.createdAt,
          lastLoginAt: now,
        });
        setUserProfile(newProfile);
      }
    } catch (err) {
      console.error("Erro ao carregar perfil do usuário:", err);
      setUserProfile({
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || "Vendedora Serallê",
        photoURL: currentUser.photoURL || null,
        loja: "Serallê Calçados",
      });
    }
  };

  useEffect(() => {
    // Processa eventual retorno de redirecionamento do Google (útil em mobile/navegadores restritos)
    getRedirectResult(auth)
      .then(async (cred) => {
        if (cred?.user) {
          await sincronizarPerfilUsuario(cred.user);
        }
      })
      .catch((err) => {
        console.warn("getRedirectResult aviso:", err);
      });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsModoOffline(false);
        localStorage.removeItem(STORAGE_OFFLINE_USER);
        await sincronizarPerfilUsuario(currentUser);
      } else {
        setUserProfile(null);
        setIsModoOffline(false);
        localStorage.removeItem(STORAGE_OFFLINE_USER);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const entrarModoOffline = (nome: string = "Vendedora", loja: string = "Serallê Calçados") => {
    const offlineProfile: UsuarioAuth = {
      uid: "offline_user",
      email: null,
      displayName: nome.trim() || "Vendedora",
      loja: loja.trim() || "Serallê Calçados",
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_OFFLINE_USER, JSON.stringify(offlineProfile));
    setUserProfile(offlineProfile);
    setIsModoOffline(true);
  };

  const entrar = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const entrarComGoogle = async () => {
    // 1. No ambiente nativo Android (APK), usa o fluxo nativo via Capacitor
    if (Capacitor.isNativePlatform()) {
      try {
        const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
        const result = await FirebaseAuthentication.signInWithGoogle();
        const idToken = result.credential?.idToken;
        if (!idToken) {
          throw new Error("Token de autenticação do Google (idToken) não foi retornado pelo serviço nativo.");
        }
        const credential = GoogleAuthProvider.credential(idToken);
        const cred = await signInWithCredential(auth, credential);
        if (cred?.user) {
          await sincronizarPerfilUsuario(cred.user);
        }
        return;
      } catch (nativeErr: any) {
        console.error("Erro na autenticação Google nativa:", nativeErr);
        throw nativeErr;
      }
    }

    // 2. No ambiente Web (computador/navegador), usa signInWithPopup
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const cred = await signInWithPopup(auth, provider);
      if (cred?.user) {
        await sincronizarPerfilUsuario(cred.user);
      }
    } catch (popupErr: any) {
      if (
        popupErr.code === "auth/popup-blocked" ||
        popupErr.code === "auth/cancelled-popup-request" ||
        popupErr.message?.includes("popup")
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw popupErr;
    }
  };

  const cadastrar = async (nome: string, email: string, pass: string, loja: string = "Serallê Calçados") => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const trimmedNome = nome.trim() || "Vendedora";
    
    // Atualiza nome no Firebase Auth
    await updateProfile(cred.user, {
      displayName: trimmedNome,
    });

    // Salva perfil no Firestore sob a coleção exclusiva do usuário
    const userDocRef = doc(db, "users", cred.user.uid);
    const profileData: UsuarioAuth = {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: trimmedNome,
      loja: loja.trim() || "Serallê Calçados",
      createdAt: new Date().toISOString(),
    };

    await setDoc(userDocRef, {
      uid: cred.user.uid,
      name: profileData.displayName,
      email: profileData.email,
      loja: profileData.loja,
      createdAt: profileData.createdAt,
    });

    setUserProfile(profileData);
  };

  const atualizarPerfilUsuario = async (dados: {
    displayName?: string;
    loja?: string;
    lojaEndereco?: string;
    lojaCep?: string;
    cargo?: string;
    telefone?: string;
  }) => {
    const trimmedNome =
      dados.displayName !== undefined
        ? dados.displayName.trim()
        : userProfile?.displayName || "Vendedora Serallê";
    const trimmedLoja =
      dados.loja !== undefined
        ? dados.loja.trim()
        : userProfile?.loja || "Serallê Calçados";
    const trimmedEndereco =
      dados.lojaEndereco !== undefined
        ? dados.lojaEndereco.trim()
        : userProfile?.lojaEndereco || "";
    const trimmedCep =
      dados.lojaCep !== undefined
        ? dados.lojaCep.trim()
        : userProfile?.lojaCep || "";
    const trimmedCargo =
      dados.cargo !== undefined
        ? dados.cargo.trim()
        : userProfile?.cargo || "Vendedora";
    const trimmedTelefone =
      dados.telefone !== undefined
        ? dados.telefone.trim()
        : userProfile?.telefone || "";

    const now = new Date().toISOString();

    if (user) {
      // 1. Atualiza displayName no Auth se necessário
      if (dados.displayName && auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, { displayName: trimmedNome });
        } catch (e) {
          console.warn("Erro ao atualizar displayName no Firebase Auth:", e);
        }
      }

      // 2. Salva no Firestore
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(
        userDocRef,
        {
          name: trimmedNome,
          loja: trimmedLoja,
          lojaEndereco: trimmedEndereco,
          lojaCep: trimmedCep,
          cargo: trimmedCargo,
          telefone: trimmedTelefone,
          cadastroConfirmado: true,
          updatedAt: now,
        },
        { merge: true }
      );

      const novoPerfil: UsuarioAuth = {
        ...(userProfile || { uid: user.uid, email: user.email }),
        displayName: trimmedNome,
        loja: trimmedLoja,
        lojaEndereco: trimmedEndereco,
        lojaCep: trimmedCep,
        cargo: trimmedCargo,
        telefone: trimmedTelefone,
        cadastroConfirmado: true,
        updatedAt: now,
      };
      setUserProfile(novoPerfil);
    } else if (isModoOffline) {
      const offlinePerfil: UsuarioAuth = {
        ...(userProfile || { uid: "offline_user", email: null }),
        displayName: trimmedNome,
        loja: trimmedLoja,
        lojaEndereco: trimmedEndereco,
        lojaCep: trimmedCep,
        cargo: trimmedCargo,
        telefone: trimmedTelefone,
        cadastroConfirmado: true,
        updatedAt: now,
      };
      localStorage.setItem(STORAGE_OFFLINE_USER, JSON.stringify(offlinePerfil));
      setUserProfile(offlinePerfil);
    }
  };

  const sair = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
        await FirebaseAuthentication.signOut();
      } catch (e) {
        console.warn("Erro no signOut nativo:", e);
      }
    }
    try {
      await signOut(auth);
    } catch {}
    localStorage.removeItem(STORAGE_OFFLINE_USER);
    setIsModoOffline(false);
    setUser(null);
    setUserProfile(null);
  };

  const recuperarSenha = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isModoOffline,
        entrar,
        entrarComGoogle,
        cadastrar,
        atualizarPerfilUsuario,
        entrarModoOffline,
        sair,
        recuperarSenha,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return ctx;
}
