import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface Venda {
  id: string;
  data: string;
  cliente: string;
  produto: string;
  valor: number;
  quantidade: number;
  observacoes: string;
  createdAt: string;
}

interface VendasContextType {
  vendas: Venda[];
  loading: boolean;
  adicionarVenda: (venda: Omit<Venda, "id" | "createdAt">) => Promise<void>;
  atualizarVenda: (id: string, venda: Partial<Omit<Venda, "id" | "createdAt">>) => Promise<void>;
  removerVenda: (id: string) => Promise<void>;
  vendasPorData: (data: string) => Venda[];
  vendasDeHoje: () => Venda[];
  totalPorData: (data: string) => number;
}

const STORAGE_KEY = "@diario_vendas:vendas";

const VendasContext = createContext<VendasContextType | null>(null);

function getHoje(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function gerarId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function VendasProvider({ children }: { children: React.ReactNode }) {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setVendas(JSON.parse(raw));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const salvar = useCallback(async (novasVendas: Venda[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novasVendas));
    setVendas(novasVendas);
  }, []);

  const adicionarVenda = useCallback(
    async (venda: Omit<Venda, "id" | "createdAt">) => {
      const nova: Venda = {
        ...venda,
        id: gerarId(),
        createdAt: new Date().toISOString(),
      };
      const atualizado = [nova, ...vendas];
      await salvar(atualizado);
    },
    [vendas, salvar]
  );

  const atualizarVenda = useCallback(
    async (id: string, dados: Partial<Omit<Venda, "id" | "createdAt">>) => {
      const atualizado = vendas.map((v) =>
        v.id === id ? { ...v, ...dados } : v
      );
      await salvar(atualizado);
    },
    [vendas, salvar]
  );

  const removerVenda = useCallback(
    async (id: string) => {
      const atualizado = vendas.filter((v) => v.id !== id);
      await salvar(atualizado);
    },
    [vendas, salvar]
  );

  const vendasPorData = useCallback(
    (data: string) => vendas.filter((v) => v.data === data),
    [vendas]
  );

  const vendasDeHoje = useCallback(
    () => vendas.filter((v) => v.data === getHoje()),
    [vendas]
  );

  const totalPorData = useCallback(
    (data: string) =>
      vendas
        .filter((v) => v.data === data)
        .reduce((acc, v) => acc + v.valor * v.quantidade, 0),
    [vendas]
  );

  return (
    <VendasContext.Provider
      value={{
        vendas,
        loading,
        adicionarVenda,
        atualizarVenda,
        removerVenda,
        vendasPorData,
        vendasDeHoje,
        totalPorData,
      }}
    >
      {children}
    </VendasContext.Provider>
  );
}

export function useVendas() {
  const ctx = useContext(VendasContext);
  if (!ctx) throw new Error("useVendas deve ser usado dentro de VendasProvider");
  return ctx;
}

export { getHoje };
