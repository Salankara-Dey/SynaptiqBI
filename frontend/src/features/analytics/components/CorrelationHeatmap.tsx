import { useRef, useEffect } from "react";
import { CorrelationResponse } from "@/features/analytics/services/analyticsApi";

const COLD = [72, 118, 255];   // #4876ff — negative
const WARM = [239, 68, 68];    // #ef4444 — positive
const NEUTRAL = [245, 244, 240]; // var(--surface)

function interpolateColor(value: number | null): string {
  if (value === null) return "#e5e5e5";
  const t = (value + 1) / 2; // -1..1 → 0..1
  if (t < 0.5) {
    const f = t / 0.5;
    return `rgb(${lerp(COLD[0], NEUTRAL[0], f)},${lerp(COLD[1], NEUTRAL[1], f)},${lerp(COLD[2], NEUTRAL[2], f)})`;
  }
  const f = (t - 0.5) / 0.5;
  return `rgb(${lerp(NEUTRAL[0], WARM[0], f)},${lerp(NEUTRAL[1], WARM[1], f)},${lerp(NEUTRAL[2], WARM[2], f)})`;
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

interface Props {
  data: CorrelationResponse;
}

export function CorrelationHeatmap({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { columns, matrix } = data;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || columns.length === 0 || matrix.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const n = columns.length;
    const cellSize = Math.min(60, Math.max(32, 500 / n));
    const labelW = 100;
    const labelH = 80;
    const totalW = labelW + n * cellSize + 60; // Extra for color legend
    const totalH = labelH + n * cellSize + 10;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = `${totalW}px`;
    canvas.style.height = `${totalH}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalW, totalH);

    // Draw cells
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const val = matrix[r][c];
        const x = labelW + c * cellSize;
        const y = labelH + r * cellSize;

        ctx.fillStyle = interpolateColor(val);
        ctx.beginPath();
        roundedRect(ctx, x + 1, y + 1, cellSize - 2, cellSize - 2, 3);
        ctx.fill();

        // Value text
        if (val !== null && cellSize >= 32) {
          ctx.font = `600 ${Math.min(11, cellSize / 4)}px 'Syne', system-ui, sans-serif`;
          ctx.fillStyle = Math.abs(val) > 0.6 ? "white" : "#0a0a0f";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(val.toFixed(2), x + cellSize / 2, y + cellSize / 2);
        }
      }
    }

    // Column labels (top, rotated)
    ctx.font = "500 10px 'Syne', system-ui, sans-serif";
    ctx.fillStyle = "#0a0a0f";
    columns.forEach((col, i) => {
      const x = labelW + i * cellSize + cellSize / 2;
      ctx.save();
      ctx.translate(x, labelH - 8);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(col.length > 14 ? col.slice(0, 13) + "…" : col, 0, 0);
      ctx.restore();
    });

    // Row labels (left)
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    columns.forEach((col, i) => {
      const y = labelH + i * cellSize + cellSize / 2;
      ctx.fillStyle = "#0a0a0f";
      ctx.fillText(col.length > 14 ? col.slice(0, 13) + "…" : col, labelW - 8, y);
    });

    // Color legend
    const legendX = labelW + n * cellSize + 16;
    const legendY = labelH;
    const legendH = n * cellSize;
    const legendW = 14;

    for (let i = 0; i < legendH; i++) {
      const val = 1 - (i / legendH) * 2; // 1 to -1 top to bottom
      ctx.fillStyle = interpolateColor(val);
      ctx.fillRect(legendX, legendY + i, legendW, 1);
    }

    // Legend border
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX, legendY, legendW, legendH);

    // Legend labels
    ctx.font = "500 9px 'Syne', system-ui, sans-serif";
    ctx.fillStyle = "#8a8990";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("+1", legendX + legendW + 4, legendY);
    ctx.textBaseline = "middle";
    ctx.fillText("0", legendX + legendW + 4, legendY + legendH / 2);
    ctx.textBaseline = "bottom";
    ctx.fillText("−1", legendX + legendW + 4, legendY + legendH);
  }, [columns, matrix]);

  if (columns.length === 0 || matrix.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm" style={{ color: "var(--muted)" }}>
        Not enough numeric columns for correlation analysis
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-xl p-4" style={{ background: "white", border: "1.5px solid var(--border)" }}>
      <canvas ref={canvasRef} style={{ display: "block", margin: "0 auto" }} />
    </div>
  );
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
