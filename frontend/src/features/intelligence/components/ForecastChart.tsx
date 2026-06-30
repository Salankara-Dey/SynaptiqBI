import { useRef, useEffect } from "react";
import type { ForecastResponse } from "@/features/intelligence/services/intelligenceApi";

interface Props {
  data: ForecastResponse;
  width?: number;
  height?: number;
}

const COLORS = {
  historical: "#6366f1",
  forecast: "#10b981",
  band: "rgba(16,185,129,0.10)",
  bandStroke: "rgba(16,185,129,0.25)",
  grid: "rgba(0,0,0,0.05)",
  text: "#8a8990",
  ink: "#0a0a0f",
  divider: "#f59e0b",
};

export function ForecastChart({ data, width = 700, height = 380 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const pad = { top: 30, right: 30, bottom: 60, left: 65 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    // Combine all values for scaling
    const historicalVals = data.historical.map((p) => p.value);
    const forecastVals = data.forecast.map((p) => p.value);
    const allVals = [
      ...historicalVals,
      ...forecastVals,
      ...data.forecast.map((p) => p.upper_bound),
      ...data.forecast.map((p) => p.lower_bound),
    ];
    const totalPoints = data.historical.length + data.forecast.length;

    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);
    const valRange = maxVal - minVal || 1;
    const valPad = valRange * 0.08;
    const yMin = minVal - valPad;
    const yMax = maxVal + valPad;
    const yRange = yMax - yMin;

    const getX = (i: number) => pad.left + (i / Math.max(totalPoints - 1, 1)) * plotW;
    const getY = (v: number) => pad.top + plotH - ((v - yMin) / yRange) * plotH;

    // ── Grid lines ──
    const gridLines = 6;
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + plotH - (plotH * i) / gridLines;
      const val = yMin + (yRange * i) / gridLines;
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();

      ctx.font = "10px 'Syne', system-ui, sans-serif";
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(val.toFixed(val > 100 ? 0 : 1), pad.left - 8, y);
    }

    // ── Divider line between historical and forecast ──
    const dividerX = getX(data.historical.length - 1);
    ctx.strokeStyle = COLORS.divider;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(dividerX, pad.top);
    ctx.lineTo(dividerX, pad.top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.font = "bold 10px 'Syne', system-ui, sans-serif";
    ctx.fillStyle = COLORS.divider;
    ctx.textAlign = "center";
    ctx.fillText("forecast →", dividerX + 35, pad.top - 8);

    // ── Confidence band ──
    if (data.forecast.length > 0) {
      const forecastStartIdx = data.historical.length;
      ctx.fillStyle = COLORS.band;
      ctx.beginPath();

      // Upper bound path
      for (let i = 0; i < data.forecast.length; i++) {
        const x = getX(forecastStartIdx + i);
        const y = getY(data.forecast[i].upper_bound);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      // Lower bound path (reverse)
      for (let i = data.forecast.length - 1; i >= 0; i--) {
        const x = getX(forecastStartIdx + i);
        const y = getY(data.forecast[i].lower_bound);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // Band borders
      ctx.strokeStyle = COLORS.bandStroke;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      for (let i = 0; i < data.forecast.length; i++) {
        const x = getX(forecastStartIdx + i);
        const y = getY(data.forecast[i].upper_bound);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < data.forecast.length; i++) {
        const x = getX(forecastStartIdx + i);
        const y = getY(data.forecast[i].lower_bound);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Historical line ──
    if (data.historical.length > 0) {
      // Area fill
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = COLORS.historical;
      ctx.beginPath();
      ctx.moveTo(getX(0), pad.top + plotH);
      data.historical.forEach((p, i) => ctx.lineTo(getX(i), getY(p.value)));
      ctx.lineTo(getX(data.historical.length - 1), pad.top + plotH);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Line
      ctx.strokeStyle = COLORS.historical;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      data.historical.forEach((p, i) => {
        const x = getX(i);
        const y = getY(p.value);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Last point dot
      const lastIdx = data.historical.length - 1;
      const lx = getX(lastIdx);
      const ly = getY(data.historical[lastIdx].value);
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(lx, ly, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.historical;
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Forecast line ──
    if (data.forecast.length > 0) {
      const forecastStartIdx = data.historical.length;

      // Connect from last historical point
      ctx.strokeStyle = COLORS.forecast;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.setLineDash([8, 4]);
      ctx.beginPath();

      if (data.historical.length > 0) {
        const lastHist = data.historical[data.historical.length - 1];
        ctx.moveTo(getX(data.historical.length - 1), getY(lastHist.value));
      }

      data.forecast.forEach((p, i) => {
        ctx.lineTo(getX(forecastStartIdx + i), getY(p.value));
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // End point dot
      const endIdx = forecastStartIdx + data.forecast.length - 1;
      const ex = getX(endIdx);
      const ey = getY(data.forecast[data.forecast.length - 1].value);
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(ex, ey, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.forecast;
      ctx.beginPath();
      ctx.arc(ex, ey, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── X-axis labels ──
    const allDates = [...data.historical.map((p) => p.date), ...data.forecast.map((p) => p.date)];
    const labelStep = Math.max(1, Math.floor(allDates.length / 10));
    ctx.font = "10px 'Syne', system-ui, sans-serif";
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = "center";
    allDates.forEach((date, i) => {
      if (i % labelStep !== 0 && i !== allDates.length - 1) return;
      const x = getX(i);
      const label = date.length > 10 ? date.slice(5) : date;
      ctx.fillText(label, x, height - pad.bottom + 18);
    });

    // ── Legend ──
    const legendY = pad.top - 10;
    const legendStartX = pad.left;

    // Historical legend
    ctx.fillStyle = COLORS.historical;
    ctx.beginPath();
    ctx.arc(legendStartX, legendY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "10px 'Syne', system-ui, sans-serif";
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = "left";
    ctx.fillText("Historical", legendStartX + 10, legendY + 1);

    // Forecast legend
    const fLegendX = legendStartX + 85;
    ctx.fillStyle = COLORS.forecast;
    ctx.beginPath();
    ctx.arc(fLegendX, legendY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.ink;
    ctx.fillText("Forecast", fLegendX + 10, legendY + 1);

    // Confidence band legend
    const bLegendX = fLegendX + 75;
    ctx.fillStyle = COLORS.band;
    ctx.fillRect(bLegendX - 6, legendY - 5, 12, 10);
    ctx.strokeStyle = COLORS.bandStroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(bLegendX - 6, legendY - 5, 12, 10);
    ctx.fillStyle = COLORS.ink;
    ctx.fillText("95% CI", bLegendX + 12, legendY + 1);
  }, [data, width, height]);

  return (
    <div className="overflow-auto rounded-xl p-4" style={{ background: "white", border: "1.5px solid var(--border)" }}>
      <canvas ref={canvasRef} style={{ display: "block", margin: "0 auto" }} />
    </div>
  );
}
