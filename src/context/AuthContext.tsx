import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
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
  entrarModoOffline: (nome?: string, loja?: string) => void;
  sair: () => Promise<void>;
  recuperarSenha: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_OFFLINE_USER = "@diario_vendas:offline_user_v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UsuarioAuth | null>(null);
  const [isModoOffline, setIsModoOffline] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_OFFLINE_USER) !== null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsModoOffline(false);
        localStorage.removeItem(STORAGE_OFFLINE_USER);
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
              createdAt: data.createdAt || now,
              lastLoginAt: now,
            };
            // Atualiza dados de acesso no Firestore
            await setDoc(
              userDocRef,
              {
                uid: currentUser.uid,
                name: updatedProfile.displayName,
                email: updatedProfile.email,
                photoURL: updatedProfile.photoURL,
                loja: updatedProfile.loja,
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
              createdAt: now,
              lastLoginAt: now,
            };
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              name: newProfile.displayName,
              email: newProfile.email,
              photoURL: newProfile.photoURL,
              loja: newProfile.loja,
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
      } else {
        const storedOffline = localStorage.getItem(STORAGE_OFFLINE_USER);
        if (storedOffline) {
          try {
            const parsed = JSON.parse(storedOffline);
            setUserProfile(parsed);
            setIsModoOffline(true);
          } catch {
            const defaultProfile: UsuarioAuth = {
              uid: "offline_user",
              email: null,
              displayName: "Vendedora Serallê",
              loja: "Serallê Calçados",
              createdAt: new Date().toISOString(),
            };
            localStorage.setItem(STORAGE_OFFLINE_USER, JSON.stringify(defaultProfile));
            setUserProfile(defaultProfile);
            setIsModoOffline(true);
          }
        } else {
          // Sem usuário logado e sem sessão offline prévia (primeiro acesso ou reinstalação)
          // Mostra a tela de autenticação para que a vendedora possa entrar com Google, E-mail,
          // restaurar por código de sincronização ou optar pelo modo rápido.
          setUserProfile(null);
          setIsModoOffline(false);
        }
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
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);
    
    // Assegura documento e perfil do usuário no Firestore
    const userDocRef = doc(db, "users", cred.user.uid);
    const snap = await getDoc(userDocRef);
    const now = new Date().toISOString();
    
    if (!snap.exists()) {
      const newProfile: UsuarioAuth = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || "Vendedora Serallê",
        photoURL: cred.user.photoURL || null,
        loja: "Serallê Calçados",
        createdAt: now,
        lastLoginAt: now,
      };
      await setDoc(userDocRef, {
        uid: cred.user.uid,
        name: newProfile.displayName,
        email: newProfile.email,
        photoURL: newProfile.photoURL,
        loja: newProfile.loja,
        createdAt: newProfile.createdAt,
        lastLoginAt: now,
      });
      setUserProfile(newProfile);
    } else {
      const data = snap.data();
      const existingProfile: UsuarioAuth = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: data.name || cred.user.displayName || "Vendedora Serallê",
        photoURL: cred.user.photoURL || data.photoURL || null,
        loja: data.loja || "Serallê Calçados",
        createdAt: data.createdAt || now,
        lastLoginAt: now,
      };
      await setDoc(
        userDocRef,
        {
          uid: cred.user.uid,
          name: existingProfile.displayName,
          email: existingProfile.email,
          photoURL: existingProfile.photoURL,
          loja: existingProfile.loja,
          lastLoginAt: now,
        },
        { merge: true }
      );
      setUserProfile(existingProfile);
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

  const sair = async () => {
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
