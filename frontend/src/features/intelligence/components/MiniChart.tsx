import { useRef, useEffect } from "react";

interface ChartData {
  chart_type: string;
  labels: any[];
  series: { name: string; data: any[] }[];
}

interface Props {
  data: ChartData;
  width?: number;
  height?: number;
}

const PALETTE = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
];

const COLORS = {
  grid: "rgba(0,0,0,0.05)",
  text: "#8a8990",
  ink: "#0a0a0f",
};

export function MiniChart({ data, width = 560, height = 300 }: Props) {
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

    const type = data.chart_type;
    const labels = data.labels || [];
    const series = data.series || [];

    if (labels.length === 0 || series.length === 0) {
      ctx.font = "12px 'Syne', system-ui, sans-serif";
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = "center";
      ctx.fillText("No data to display", width / 2, height / 2);
      return;
    }

    if (type === "pie") {
      drawPie(ctx, labels, series, width, height);
    } else if (type === "scatter") {
      drawScatter(ctx, labels, series, width, height);
    } else {
      drawBarLine(ctx, labels, series, type, width, height);
    }
  }, [data, width, height]);

  return (
    <div className="overflow-auto rounded-xl p-4" style={{ background: "white", border: "1.5px solid var(--border)" }}>
      <canvas ref={canvasRef} style={{ display: "block", margin: "0 auto" }} />
    </div>
  );
}

// ── Bar / Line / Histogram ────────────────────────────────────────

function drawBarLine(
  ctx: CanvasRenderingContext2D,
  labels: any[],
  series: { name: string; data: any[] }[],
  type: string,
  w: number,
  h: number,
) {
  const pad = { top: 24, right: 20, bottom: 54, left: 55 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  // Find value range
  const allVals = series.flatMap((s) => s.data.map(Number).filter((v) => !isNaN(v)));
  if (allVals.length === 0) return;
  const minVal = Math.min(0, ...allVals);
  const maxVal = Math.max(...allVals) * 1.1 || 1;
  const yRange = maxVal - minVal || 1;

  const getY = (v: number) => pad.top + plotH - ((v - minVal) / yRange) * plotH;

  // Grid
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + plotH - (plotH * i) / gridLines;
    const val = minVal + (yRange * i) / gridLines;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.font = "10px 'Syne', system-ui, sans-serif";
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(val > 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(val > 100 ? 0 : 1), pad.left - 6, y);
  }

  const n = labels.length;
  const barGroupWidth = plotW / n;
  const seriesCount = series.length;

  if (type === "bar" || type === "histogram") {
    const barPad = Math.max(2, barGroupWidth * 0.15);
    const usableWidth = barGroupWidth - barPad * 2;
    const singleBarW = usableWidth / seriesCount;

    series.forEach((s, si) => {
      ctx.fillStyle = PALETTE[si % PALETTE.length];
      s.data.forEach((val, i) => {
        const v = Number(val);
        if (isNaN(v)) return;
        const x = pad.left + i * barGroupWidth + barPad + si * singleBarW;
        const barH = ((v - minVal) / yRange) * plotH;
        const y = pad.top + plotH - barH;
        // Rounded top corners
        const r = Math.min(3, singleBarW / 2);
        ctx.beginPath();
        ctx.moveTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.lineTo(x + singleBarW - r, y);
        ctx.quadraticCurveTo(x + singleBarW, y, x + singleBarW, y + r);
        ctx.lineTo(x + singleBarW, pad.top + plotH);
        ctx.lineTo(x, pad.top + plotH);
        ctx.closePath();
        ctx.fill();
      });
    });
  } else if (type === "line") {
    series.forEach((s, si) => {
      const color = PALETTE[si % PALETTE.length];
      // Area
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(pad.left + barGroupWidth / 2, pad.top + plotH);
      s.data.forEach((val, i) => {
        const v = Number(val);
        if (isNaN(v)) return;
        ctx.lineTo(pad.left + i * barGroupWidth + barGroupWidth / 2, getY(v));
      });
      ctx.lineTo(pad.left + (s.data.length - 1) * barGroupWidth + barGroupWidth / 2, pad.top + plotH);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      let started = false;
      s.data.forEach((val, i) => {
        const v = Number(val);
        if (isNaN(v)) return;
        const x = pad.left + i * barGroupWidth + barGroupWidth / 2;
        const y = getY(v);
        if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
      });
      ctx.stroke();

      // Dots
      s.data.forEach((val, i) => {
        const v = Number(val);
        if (isNaN(v)) return;
        const x = pad.left + i * barGroupWidth + barGroupWidth / 2;
        const y = getY(v);
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  // X-axis labels
  const maxLabels = 15;
  const step = Math.max(1, Math.ceil(n / maxLabels));
  ctx.font = "10px 'Syne', system-ui, sans-serif";
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = "center";
  labels.forEach((label, i) => {
    if (i % step !== 0 && i !== n - 1) return;
    const x = pad.left + i * barGroupWidth + barGroupWidth / 2;
    const text = String(label).length > 12 ? String(label).slice(0, 11) + "…" : String(label);
    ctx.save();
    ctx.translate(x, h - pad.bottom + 14);
    ctx.rotate(-0.4);
    ctx.textAlign = "right";
    ctx.fillText(text, 0, 0);
    ctx.restore();
  });

  // Legend
  if (series.length > 1) {
    let lx = pad.left;
    series.forEach((s, si) => {
      ctx.fillStyle = PALETTE[si % PALETTE.length];
      ctx.beginPath();
      ctx.arc(lx, pad.top - 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.ink;
      ctx.font = "10px 'Syne', system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(s.name, lx + 8, pad.top - 6);
      lx += ctx.measureText(s.name).width + 24;
    });
  }
}

// ── Pie ───────────────────────────────────────────────────────────

function drawPie(
  ctx: CanvasRenderingContext2D,
  labels: any[],
  series: { name: string; data: any[] }[],
  w: number,
  h: number,
) {
  const data = series[0]?.data.map(Number).filter((v) => !isNaN(v) && v > 0) || [];
  if (data.length === 0) return;
  const total = data.reduce((a, b) => a + b, 0);

  const cx = w / 2 - 60;
  const cy = h / 2;
  const radius = Math.min(cx - 20, cy - 20, 120);
  let startAngle = -Math.PI / 2;

  data.forEach((val, i) => {
    const sliceAngle = (val / total) * Math.PI * 2;
    ctx.fillStyle = PALETTE[i % PALETTE.length];
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

  // Inner circle (donut)
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Center text
  ctx.font = "bold 14px 'Syne', system-ui, sans-serif";
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(total > 1000 ? `${(total / 1000).toFixed(1)}k` : String(Math.round(total)), cx, cy - 6);
  ctx.font = "10px 'Syne', system-ui, sans-serif";
  ctx.fillStyle = COLORS.text;
  ctx.fillText("total", cx, cy + 10);

  // Legend
  const legendX = cx + radius + 30;
  let legendY = Math.max(20, cy - data.length * 10);
  const maxLegend = Math.min(data.length, 8);
  for (let i = 0; i < maxLegend; i++) {
    ctx.fillStyle = PALETTE[i % PALETTE.length];
    ctx.fillRect(legendX, legendY, 10, 10);
    ctx.fillStyle = COLORS.ink;
    ctx.font = "10px 'Syne', system-ui, sans-serif";
    ctx.textAlign = "left";
    const lbl = String(labels[i] ?? "").slice(0, 18);
    const pct = ((data[i] / total) * 100).toFixed(1);
    ctx.fillText(`${lbl} (${pct}%)`, legendX + 16, legendY + 9);
    legendY += 22;
  }
}

// ── Scatter ───────────────────────────────────────────────────────

function drawScatter(
  ctx: CanvasRenderingContext2D,
  labels: any[],
  series: { name: string; data: any[] }[],
  w: number,
  h: number,
) {
  const pad = { top: 24, right: 20, bottom: 40, left: 55 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const xVals = labels.map(Number).filter((v) => !isNaN(v));
  const yVals = series[0]?.data.map(Number).filter((v) => !isNaN(v)) || [];
  if (xVals.length === 0 || yVals.length === 0) return;

  const xMin = Math.min(...xVals);
  const xMax = Math.max(...xVals);
  const yMin = Math.min(...yVals);
  const yMax = Math.max(...yVals);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  // Grid
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + plotH - (plotH * i) / 5;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
  }

  // Points
  const color = PALETTE[0];
  for (let i = 0; i < Math.min(xVals.length, yVals.length); i++) {
    const x = pad.left + ((xVals[i] - xMin) / xRange) * plotW;
    const y = pad.top + plotH - ((yVals[i] - yMin) / yRange) * plotH;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Axis labels
  ctx.font = "10px 'Syne', system-ui, sans-serif";
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = "center";
  ctx.fillText(series[0]?.name || "y", pad.left - 30, pad.top + plotH / 2);
}
