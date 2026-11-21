"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FORMAS_PAGO_LABELS } from "@/lib/constants";
import {
  formatDiaMes,
  formatMesAnio,
  formatMoneda,
  formatMonedaCompacta,
} from "@/lib/format";
import type { TableroDTO } from "@/services/tablero.service";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const FORMA_COLORS: Record<"contado" | "tarjeta" | "cuenta_corriente", string> =
  {
    contado: "#0f6c74",
    tarjeta: "#c99635",
    cuenta_corriente: "#7a8c99",
  };

export function TableroGraficos({
  ventasDiarias,
  porFormaDePago,
}: {
  ventasDiarias: TableroDTO["ventasDiarias"];
  porFormaDePago: TableroDTO["porFormaDePago"];
}) {
  const mesLabel = formatMesAnio();

  // Gráfico de barras: últimos 30 días, destacando hoy con tono más oscuro
  const barData = {
    labels: ventasDiarias.map((d) => formatDiaMes(d.fecha)),
    datasets: [
      {
        label: "Ventas",
        data: ventasDiarias.map((d) => d.importe),
        backgroundColor: ventasDiarias.map((_, idx) =>
          idx === ventasDiarias.length - 1 ? "#0f6c74" : "#97c6cd"
        ),
        hoverBackgroundColor: "#0c5a61",
        borderRadius: 4,
        maxBarThickness: 18,
      },
    ],
  };

  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => {
            const idx = items[0]?.dataIndex ?? 0;
            const fecha = ventasDiarias[idx]?.fecha;
            return fecha ? formatDiaMes(fecha) : "";
          },
          label: (item) => ` ${formatMoneda(Number(item.raw ?? 0))}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: "#64717d",
          font: { size: 11 },
          autoSkip: false,
          callback: (_val, index) =>
            index % 4 === 0 || index === ventasDiarias.length - 1
              ? formatDiaMes(ventasDiarias[index].fecha)
              : "",
        },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: "#eef0f2" },
        ticks: {
          color: "#64717d",
          font: { size: 11 },
          maxTicksLimit: 5,
          callback: (val) => formatMonedaCompacta(Number(val)),
        },
      },
    },
  };

  const totalMes = porFormaDePago.reduce((acc, p) => acc + p.importe, 0);
  const doughnutData = {
    labels: porFormaDePago.map((p) => FORMAS_PAGO_LABELS[p.forma]),
    datasets: [
      {
        data:
          totalMes > 0 ? porFormaDePago.map((p) => p.importe) : [1],
        backgroundColor:
          totalMes > 0
            ? porFormaDePago.map((p) => FORMA_COLORS[p.forma])
            : ["#e5e7eb"],
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };

  const doughnutOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "66%",
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: totalMes > 0,
        callbacks: {
          label: (item) =>
            ` ${item.label}: ${formatMoneda(Number(item.raw ?? 0))}`,
        },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <Card className="lg:col-span-7 xl:col-span-8">
        <CardHeader>
          <CardTitle>Ventas diarias</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <Bar data={barData} options={barOptions} />
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-5 xl:col-span-4 flex flex-col">
        <CardHeader>
          <CardTitle>Por forma de pago</CardTitle>
          <CardDescription>{mesLabel}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-between gap-4">
          <div className="relative size-[144px] shrink-0">
            <Doughnut data={doughnutData} options={doughnutOptions} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-3">
              <span className="text-[11px] text-muted-foreground">Total</span>
              <span className="text-sm font-bold text-foreground tabular-nums leading-tight">
                {formatMonedaCompacta(totalMes)}
              </span>
            </div>
          </div>

          <div className="w-full space-y-2.5 pt-1">
            {porFormaDePago.map((p) => {
              const pct =
                totalMes > 0 ? Math.round((p.importe / totalMes) * 100) : 0;
              return (
                <div
                  key={p.forma}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: FORMA_COLORS[p.forma] }}
                    />
                    <span className="font-medium text-foreground whitespace-nowrap">
                      {FORMAS_PAGO_LABELS[p.forma]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 tabular-nums">
                    <span className="text-muted-foreground w-8 text-right">
                      {pct}%
                    </span>
                    <span className="font-semibold text-foreground min-w-[84px] text-right">
                      {formatMoneda(p.importe)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
