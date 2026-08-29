import type { ComparisonColumn, ComparisonExportRow } from "./comparison";

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function downloadComparisonPng(args: {
  title: string;
  notice: string;
  officialLabel: string;
  aiLabel: string;
  columns: ComparisonColumn[];
  rows: ComparisonExportRow[];
  filename?: string;
}): void {
  if (typeof document === "undefined") return;
  const colW = 200;
  const labelW = 170;
  const pad = 24;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.font = "13px Source Sans 3, Segoe UI, sans-serif";
  const headerLines = args.columns.map((col) => wrapText(ctx, `${col.code} ${col.name}`, colW - 16));
  const body = args.rows.map((row) => ({
    label: wrapText(ctx, row.label, labelW - 16),
    values: row.values.map((value) => wrapText(ctx, value, colW - 16)),
  }));

  const headerH = 56 + Math.max(2, ...headerLines.map((lines) => lines.length)) * 16;
  const rowHeights = body.map((row) => {
    const lines = Math.max(row.label.length, ...row.values.map((value) => value.length));
    return Math.max(36, 14 + lines * 16);
  });
  const width = pad * 2 + labelW + args.columns.length * colW;
  const height = pad * 2 + 72 + headerH + rowHeights.reduce((sum, h) => sum + h, 0) + 36;

  canvas.width = width * 2;
  canvas.height = height * 2;
  ctx.scale(2, 2);
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0b3f3c";
  ctx.font = "600 20px Source Serif 4, Georgia, serif";
  ctx.fillText(args.title, pad, pad + 22);
  ctx.font = "600 13px Source Sans 3, Segoe UI, sans-serif";
  ctx.fillStyle = "#8a4b12";
  ctx.fillText(args.notice, pad, pad + 46);

  let y = pad + 64;
  ctx.fillStyle = "#e8f1ef";
  ctx.fillRect(pad, y, labelW + args.columns.length * colW, headerH);
  ctx.fillStyle = "#0b3f3c";
  ctx.font = "600 12px Source Sans 3, Segoe UI, sans-serif";
  args.columns.forEach((col, index) => {
    const x = pad + labelW + index * colW + 8;
    ctx.fillText(col.code, x, y + 18);
    headerLines[index]?.forEach((line, lineIndex) => {
      ctx.fillText(line, x, y + 36 + lineIndex * 16);
    });
  });
  y += headerH;

  body.forEach((row, rowIndex) => {
    const h = rowHeights[rowIndex] ?? 36;
    ctx.fillStyle = rowIndex % 2 === 0 ? "#ffffff" : "#f7f4ee";
    ctx.fillRect(pad, y, labelW + args.columns.length * colW, h);
    ctx.fillStyle = "#5c6570";
    ctx.font = "600 12px Source Sans 3, Segoe UI, sans-serif";
    row.label.forEach((line, lineIndex) => ctx.fillText(line, pad + 8, y + 18 + lineIndex * 16));
    ctx.fillStyle = "#1c2430";
    ctx.font = "12px Source Sans 3, Segoe UI, sans-serif";
    row.values.forEach((value, index) => {
      value.forEach((line, lineIndex) => {
        ctx.fillText(line, pad + labelW + index * colW + 8, y + 18 + lineIndex * 16);
      });
    });
    y += h;
  });

  ctx.font = "11px Source Sans 3, Segoe UI, sans-serif";
  ctx.fillStyle = "#5c6570";
  ctx.fillText(`${args.officialLabel} · ${args.aiLabel}`, pad, height - 16);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = args.filename ?? "ammattialtistus-vertailu.png";
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
