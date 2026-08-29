import React, { useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Tag,
  Calendar,
  Footprints,
  DollarSign,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { useVendas } from "@/context/VendasContext";
import { formatMoeda, DIAS_SEMANA_ABREV } from "@/utils/formatters";

interface AnalisesGraficosViewProps {
  mesId: string;
  onOpenDia: (dataStr: string) => void;
}

const CATEGORY_COLORS = [
  "#2563EB", // Blue
  "#10B981", // Emerald
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#64748B", // Slate
];

const DIAS_SEMANA_NOMES = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export function AnalisesGraficosView({
  mesId,
  onOpenDia,
}: AnalisesGraficosViewProps) {
  const { dias, getTotalMes, getConfigMes } = useVendas();
  const totalMes = getTotalMes(mesId);
  const config = getConfigMes(mesId);

  const [ano, mes] = mesId.split("-").map(Number);
  const totalDiasMes = new Date(ano, mes, 0).getDate();

  // 1. Evolução Diária Acumulada e Vendas Diárias
  const dadosEvolucao = useMemo(() => {
    let acumulado = 0;
    const items = [];

    for (let d = 1; d <= totalDiasMes; d++) {
      const dataStr = `${mesId}-${String(d).padStart(2, "0")}`;
      const dia = dias[dataStr];
      const valorDia = dia?.itens?.reduce((s, i) => s + i.valor, 0) || 0;
      const paresDia = dia?.itens?.reduce((s, i) => s + i.pares, 0) || 0;

      acumulado += valorDia;

      items.push({
        dia: d,
        dataStr,
        valorDia,
        paresDia,
        acumulado,
        folga: dia?.folga || false,
      });
    }

    return items;
  }, [mesId, dias, totalDiasMes]);

  // 2. Análise por Dia da Semana (Média de faturamento por Segunda, Terça, etc)
  const dadosPorDiaSemana = useMemo(() => {
    const mapSemana = [0, 1, 2, 3, 4, 5, 6].map((dayIdx) => ({
      diaSemana: DIAS_SEMANA_NOMES[dayIdx],
      abrev: DIAS_SEMANA_ABREV[dayIdx],
      totalValor: 0,
      totalPares: 0,
      contagemDias: 0,
      mediaValor: 0,
    }));

    for (let d = 1; d <= totalDiasMes; d++) {
      const dateObj = new Date(ano, mes - 1, d);
      const dayIdx = dateObj.getDay();
      const dataStr = `${mesId}-${String(d).padStart(2, "0")}`;
      const dia = dias[dataStr];

      if (dia && dia.itens && dia.itens.length > 0) {
        const valorDia = dia.itens.reduce((s, i) => s + i.valor, 0);
        const paresDia = dia.itens.reduce((s, i) => s + i.pares, 0);
        mapSemana[dayIdx].totalValor += valorDia;
        mapSemana[dayIdx].totalPares += paresDia;
        mapSemana[dayIdx].contagemDias += 1;
      }
    }

    return mapSemana.map((item) => ({
      ...item,
      mediaValor: item.contagemDias > 0 ? item.totalValor / item.contagemDias : 0,
    }));
  }, [ano, mes, mesId, dias, totalDiasMes]);

  // 3. Distribuição por Categoria de Produto
  const dadosCategorias = useMemo(() => {
    const catMap: Record<string, { valor: number; pares: number; count: number }> = {};

    Object.entries(dias).forEach(([dStr, dia]) => {
      if (dStr.startsWith(mesId) && dia.itens) {
        dia.itens.forEach((item) => {
          const cat = item.categoria || "Geral";
          if (!catMap[cat]) {
            catMap[cat] = { valor: 0, pares: 0, count: 0 };
          }
          catMap[cat].valor += item.valor;
          catMap[cat].pares += item.pares;
          catMap[cat].count += 1;
        });
      }
    });

    const list = Object.entries(catMap).map(([categoria, stat]) => ({
      name: categoria,
      valor: stat.valor,
      pares: stat.pares,
      count: stat.count,
      pctValor: totalMes.valor > 0 ? (stat.valor / totalMes.valor) * 100 : 0,
    }));

    return list.sort((a, b) => b.valor - a.valor);
  }, [dias, mesId, totalMes.valor]);

  // Melhores dias
  const melhorDiaSemana = [...dadosPorDiaSemana].sort((a, b) => b.totalValor - a.totalValor)[0];
  const categoriaMaisVendida = dadosCategorias[0];

  return (
    <div className="space-y-6">
      {/* ─── Top Highlights Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Dia Mais Forte da Semana
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-xl font-extrabold text-slate-900">
              {melhorDiaSemana && melhorDiaSemana.totalValor > 0
                ? melhorDiaSemana.diaSemana
                : "Sem dados"}
            </h4>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {melhorDiaSemana && melhorDiaSemana.totalValor > 0
                ? `Total ${formatMoeda(melhorDiaSemana.totalValor)} acumulado`
                : "Lance vendas para analisar"}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Categoria Campeã
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-xl font-extrabold text-slate-900 truncate">
              {categoriaMaisVendida ? categoriaMaisVendida.name : "Nenhuma ainda"}
            </h4>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {categoriaMaisVendida
                ? `${formatMoeda(categoriaMaisVendida.valor)} (${categoriaMaisVendida.pares} pares)`
                : "Adicione categorias nas vendas"}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Ritmo de Conversão
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-xl font-extrabold text-slate-900">
              {totalMes.qtdVendas > 0
                ? `${(totalMes.pares / totalMes.qtdVendas).toFixed(1)} pares / venda`
                : "—"}
            </h4>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {totalMes.qtdVendas > 0 ? `${totalMes.qtdVendas} atendimentos no mês` : "Sem vendas"}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Gráfico: Evolução Diária de Faturamento ────────────────────── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-700" />
              Evolução Diária & Vendas por Dia
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Acompanhe os picos de faturamento e volume de pares vendidos a cada dia do mês
            </p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosEvolucao} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748B" }}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: any, name: any) => {
                  if (name === "valorDia") return [formatMoeda(Number(value)), "Venda no Dia"];
                  if (name === "acumulado") return [formatMoeda(Number(value)), "Acumulado no Mês"];
                  return [value, name];
                }}
                labelFormatter={(label) => `Dia ${label}`}
                contentStyle={{
                  backgroundColor: "#0F172A",
                  borderColor: "#334155",
                  borderRadius: "12px",
                  color: "#F8FAFC",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="valorDia" name="valorDia" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Two-Column: Categorias & Performance por Dia da Semana ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Pizza: Categorias Mais Vendidas */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-purple-600" />
                Vendas por Categoria / Estilo
              </h3>
            </div>

            {dadosCategorias.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs rounded-xl border border-dashed border-slate-200">
                Nenhuma venda com categoria registrada. Ao lançar vendas no dia, selecione a categoria correspondente.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosCategorias}
                        dataKey="valor"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={45}
                        paddingAngle={3}
                      >
                        {dadosCategorias.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [formatMoeda(Number(value)), "Faturamento"]}
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          borderRadius: "12px",
                          color: "#F8FAFC",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Categories Table / List */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {dadosCategorias.map((cat, idx) => (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          style={{
                            backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                          }}
                          className="w-3 h-3 rounded-md"
                        />
                        <span className="font-bold text-slate-800">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-medium">{cat.pares} pares</span>
                        <span className="font-extrabold text-slate-900">{formatMoeda(cat.valor)}</span>
                        <span className="font-bold text-blue-700 text-[11px] bg-blue-50 px-1.5 py-0.5 rounded-md">
                          {cat.pctValor.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico Barras: Dia da Semana Mais Lucrativo */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Performance por Dia da Semana
              </h3>
            </div>

            <div className="h-56 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosPorDiaSemana} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="abrev" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      formatMoeda(Number(value)),
                      name === "totalValor" ? "Total Acumulado" : "Média por Dia",
                    ]}
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      borderRadius: "12px",
                      color: "#F8FAFC",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="totalValor" name="totalValor" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* List breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
              {dadosPorDiaSemana.map((d) => (
                <div key={d.diaSemana} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{d.diaSemana}</span>
                  <p className="text-xs font-extrabold text-slate-900 mt-0.5">{formatMoeda(d.totalValor)}</p>
                  <span className="text-[10px] text-slate-400 font-medium">{d.totalPares} pares</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
