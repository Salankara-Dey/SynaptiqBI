import { useRef, useEffect } from "react";
import { ChartResponse } from "@/features/analytics/services/analyticsApi";

// ── Palette ──────────────────────────────────────────────────────
const PALETTE = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#a855f7",
];

interface Props {
  data: ChartResponse;
  width?: number;
  height?: number;
}

export function ChartRenderer({ data, width = 700, height = 380 }: Props) {
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

    switch (data.chart_type) {
      case "bar":
        drawBar(ctx, data, width, height);
        break;
      case "line":
        drawLine(ctx, data, width, height);
        break;
      case "pie":
        drawPie(ctx, data, width, height);
        break;
      case "scatter":
        drawScatter(ctx, data, width, height);
        break;
      case "histogram":
        drawBar(ctx, data, width, height);
        break;
    }
  }, [data, width, height]);

  return (
    <div className="overflow-auto rounded-xl p-4" style={{ background: "white", border: "1.5px solid var(--border)" }}>
      <canvas ref={canvasRef} style={{ display: "block", margin: "0 auto" }} />
    </div>
  );
}

// ── Shared helpers ───────────────────────────────────────────────

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, opts: { size?: number; color?: string; align?: CanvasTextAlign; baseline?: CanvasTextBaseline; maxWidth?: number; rotate?: number } = {}) {
  ctx.save();
  ctx.font = `${opts.size || 11}px 'Syne', system-ui, sans-serif`;
  ctx.fillStyle = opts.color || "#8a8990";
  ctx.textAlign = opts.align || "center";
  ctx.textBaseline = opts.baseline || "middle";
  if (opts.rotate) {
    ctx.translate(x, y);
    ctx.rotate(opts.rotate);
    ctx.fillText(text, 0, 0, opts.maxWidth);
  } else {
    ctx.fillText(text, x, y, opts.maxWidth);
  }
  ctx.restore();
}

function truncLabel(label: string, maxLen = 12): string {
  return label.length > maxLen ? label.slice(0, maxLen - 1) + "…" : label;
}

// ── Bar chart ────────────────────────────────────────────────────

function drawBar(ctx: CanvasRenderingContext2D, data: ChartResponse, w: number, h: number) {
  const pad = { top: 30, right: 20, bottom: 60, left: 60 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  if (!data.labels.length || !data.series.length) return;

  const allVals = data.series.flatMap((s) => s.data.map(Number));
  const maxVal = Math.max(...allVals, 1);
  const seriesCount = data.series.length;
  const barGroupWidth = plotW / data.labels.length;
  const barWidth = Math.max(4, (barGroupWidth * 0.7) / seriesCount);
  const gap = (barGroupWidth - barWidth * seriesCount) / 2;

  // Y-axis gridlines
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + plotH - (plotH * i) / gridLines;
    const val = (maxVal * i) / gridLines;
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    drawText(ctx, val.toFixed(val > 100 ? 0 : 1), pad.left - 8, y, { align: "right", size: 10 });
  }

  // Bars
  data.series.forEach((series, si) => {
    const color = PALETTE[si % PALETTE.length];
    data.labels.forEach((label, li) => {
      const val = Number(series.data[li]) || 0;
      const barH = (val / maxVal) * plotH;
      const x = pad.left + li * barGroupWidth + gap + si * barWidth;
      const y = pad.top + plotH - barH;

      // Bar with rounded top
      const radius = Math.min(4, barWidth / 2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y + radius);
      ctx.arcTo(x, y, x + barWidth, y, radius);
      ctx.arcTo(x + barWidth, y, x + barWidth, y + barH, radius);
      ctx.lineTo(x + barWidth, pad.top + plotH);
      ctx.lineTo(x, pad.top + plotH);
      ctx.closePath();
      ctx.fill();
    });
  });

  // X-axis labels
  data.labels.forEach((label, i) => {
    const x = pad.left + i * barGroupWidth + barGroupWidth / 2;
    drawText(ctx, truncLabel(String(label)), x, h - pad.bottom + 18, { size: 10, rotate: data.labels.length > 10 ? -0.5 : 0 });
  });

  // Legend
  if (data.series.length > 1) {
    drawLegend(ctx, data.series, w, pad.top - 10);
  }
}

// ── Line chart ───────────────────────────────────────────────────

function drawLine(ctx: CanvasRenderingContext2D, data: ChartResponse, w: number, h: number) {
  const pad = { top: 30, right: 20, bottom: 60, left: 60 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  if (!data.labels.length || !data.series.length) return;

  const allVals = data.series.flatMap((s) => s.data.map(Number));
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(...allVals, 0);
  const range = maxVal - minVal || 1;

  // Gridlines
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + plotH - (plotH * i) / gridLines;
    const val = minVal + (range * i) / gridLines;
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    drawText(ctx, val.toFixed(1), pad.left - 8, y, { align: "right", size: 10 });
  }

  data.series.forEach((series, si) => {
    const color = PALETTE[si % PALETTE.length];
    const points = series.data.map((v, i) => ({
      x: pad.left + (i / Math.max(data.labels.length - 1, 1)) * plotW,
      y: pad.top + plotH - ((Number(v) - minVal) / range) * plotH,
    }));

    // Area fill
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0].x, pad.top + plotH);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, pad.top + plotH);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();

    // Dots
    points.forEach((p) => {
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // X labels
  const step = Math.max(1, Math.floor(data.labels.length / 12));
  data.labels.forEach((label, i) => {
    if (i % step !== 0) return;
    const x = pad.left + (i / Math.max(data.labels.length - 1, 1)) * plotW;
    drawText(ctx, truncLabel(String(label)), x, h - pad.bottom + 18, { size: 10 });
  });

  if (data.series.length > 1) drawLegend(ctx, data.series, w, pad.top - 10);
}

// ── Pie chart ────────────────────────────────────────────────────

function drawPie(ctx: CanvasRenderingContext2D, data: ChartResponse, w: number, h: number) {
  if (!data.labels.length || !data.series.length) return;

  const values = data.series[0].data.map(Number);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const cx = w * 0.4;
  const cy = h / 2;
  const radius = Math.min(w * 0.3, h * 0.4);

  let startAngle = -Math.PI / 2;
  values.forEach((val, i) => {
    const sliceAngle = (val / total) * Math.PI * 2;
    const color = PALETTE[i % PALETTE.length];

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();

    // White separator
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    startAngle += sliceAngle;
  });

  // Donut hole
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Center text
  drawText(ctx, "Total", cx, cy - 8, { size: 11, color: "#8a8990" });
  drawText(ctx, total.toLocaleString(), cx, cy + 12, { size: 18, color: "#0a0a0f" });

  // Legend on the right
  const legendX = w * 0.68;
  const legendStartY = Math.max(30, cy - (data.labels.length * 22) / 2);
  data.labels.forEach((label, i) => {
    const y = legendStartY + i * 22;
    const pct = ((values[i] / total) * 100).toFixed(1);

    ctx.fillStyle = PALETTE[i % PALETTE.length];
    ctx.beginPath();
    ctx.arc(legendX, y, 5, 0, Math.PI * 2);
    ctx.fill();

    drawText(ctx, `${truncLabel(String(label), 16)} (${pct}%)`, legendX + 14, y, { size: 10, align: "left", color: "#0a0a0f" });
  });
}

// ── Scatter chart ────────────────────────────────────────────────

function drawScatter(ctx: CanvasRenderingContext2D, data: ChartResponse, w: number, h: number) {
  const pad = { top: 30, right: 20, bottom: 50, left: 60 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  if (!data.labels.length || !data.series.length) return;

  const xs = data.labels.map(Number);
  const ys = data.series[0].data.map(Number);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  // Grid
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + plotH - (plotH * i) / 5;
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    drawText(ctx, (yMin + (yRange * i) / 5).toFixed(1), pad.left - 8, y, { align: "right", size: 10 });
  }

  // Points
  const color = PALETTE[0];
  ctx.globalAlpha = 0.6;
  xs.forEach((xv, i) => {
    const px = pad.left + ((xv - xMin) / xRange) * plotW;
    const py = pad.top + plotH - ((ys[i] - yMin) / yRange) * plotH;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Axis labels
  for (let i = 0; i <= 5; i++) {
    const x = pad.left + (plotW * i) / 5;
    drawText(ctx, (xMin + (xRange * i) / 5).toFixed(1), x, h - pad.bottom + 18, { size: 10 });
  }

  drawText(ctx, data.series[0].name, w / 2, h - 8, { size: 11, color: "#0a0a0f" });
}

// ── Legend helper ────────────────────────────────────────────────

function drawLegend(ctx: CanvasRenderingContext2D, series: { name: string }[], w: number, y: number) {
  let x = w / 2 - (series.length * 60) / 2;
  series.forEach((s, i) => {
    ctx.fillStyle = PALETTE[i % PALETTE.length];
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    drawText(ctx, s.name, x + 8, y, { size: 10, align: "left", color: "#0a0a0f" });
    x += Math.max(60, s.name.length * 7 + 24);
  });
}
