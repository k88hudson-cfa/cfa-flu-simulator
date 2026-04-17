import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fieldsInSection, type FieldConfig } from "../config/uiConfig";
import type { Parameters } from "../composables/useParams";

interface ChartBlock {
  heading: string;
  svg: SVGSVGElement;
}

interface TableBlock {
  title: string;
  head: string[];
  body: string[][];
}

type Row = [string, string];

const MARGIN = 40;
const GAP_AFTER_CHART = 18;
const GAP_AFTER_TABLE = 20;
// Raster charts at 300 DPI relative to their placed size in the PDF.
// PDF units are points (72/inch), so 300 DPI = 300/72 px/pt.
const DPI = 300;
const PX_PER_PT = DPI / 72;
const PARAM_TABLE_HEAD: string[] = ["Parameter", "Value"];

export async function generateReport(
  container: HTMLElement,
  params: Parameters,
  days: number,
): Promise<void> {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;

  const title =
    container.querySelector("header h1")?.textContent?.trim() ??
    "Flu Simulator Report";
  const subtitle =
    container.querySelector("header .results__subtitle")?.textContent?.trim() ??
    "";

  let y = MARGIN;

  pdf.setFont("helvetica", "bold").setFontSize(18);
  pdf.text(title, MARGIN, y);
  y += 22;

  if (subtitle) {
    pdf.setFont("helvetica", "normal").setFontSize(11).setTextColor(110);
    const lines = pdf.splitTextToSize(subtitle, contentWidth);
    pdf.text(lines, MARGIN, y);
    y += lines.length * 14;
    pdf.setTextColor(0);
  }
  y += 12;

  for (const block of collectCharts(container)) {
    y = await drawChart(pdf, block, y, pageHeight, contentWidth);
  }

  const summaryTables = collectSummaryTables(container);
  if (summaryTables.length) {
    y = startSection(pdf, "Summary");
    for (const t of summaryTables) y = drawTable(pdf, t, y, pageHeight);
  }

  const paramTables = buildParamTables(params, days);
  if (paramTables.length) {
    y = startSection(pdf, "Parameters");
    for (const t of paramTables) y = drawTable(pdf, t, y, pageHeight);
  }

  const date = new Date().toISOString().slice(0, 10);
  pdf.save(`flu-simulator-report-${date}.pdf`);
}

function startSection(pdf: jsPDF, title: string): number {
  pdf.addPage();
  pdf.setFont("helvetica", "bold").setFontSize(16);
  pdf.text(title, MARGIN, MARGIN);
  return MARGIN + 24;
}

// --- chart rendering ------------------------------------------------------

async function drawChart(
  pdf: jsPDF,
  block: ChartBlock,
  y: number,
  pageHeight: number,
  contentWidth: number,
): Promise<number> {
  const rect = block.svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return y;

  const scale = Math.min(1, contentWidth / rect.width);
  const drawW = rect.width * scale;
  const drawH = rect.height * scale;
  const headingH = block.heading ? 16 : 0;

  if (y + headingH + drawH > pageHeight - MARGIN) {
    pdf.addPage();
    y = MARGIN;
  }

  if (block.heading) {
    pdf.setFont("helvetica", "bold").setFontSize(12);
    pdf.text(block.heading, MARGIN, y + 10);
    y += headingH;
  }

  const pxW = Math.round(drawW * PX_PER_PT);
  const pxH = Math.round(drawH * PX_PER_PT);
  const pngDataUrl = await svgToPngDataUrl(
    block.svg,
    rect.width,
    rect.height,
    pxW,
    pxH,
  );
  pdf.addImage(pngDataUrl, "PNG", MARGIN, y, drawW, drawH);

  return y + drawH + GAP_AFTER_CHART;
}

// Serialize an SVG, load it into an <img>, and paint to a canvas sized for
// the target DPI. Vue-scoped CSS and CSS variables don't follow the SVG out
// of the live DOM, so bake computed styles onto the clone first.
async function svgToPngDataUrl(
  svg: SVGSVGElement,
  srcWidth: number,
  srcHeight: number,
  targetPxWidth: number,
  targetPxHeight: number,
): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineComputedStyles(svg, clone);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(srcWidth));
  clone.setAttribute("height", String(srcHeight));

  const source = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = targetPxWidth;
    canvas.height = targetPxHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    ctx.drawImage(img, 0, 0, targetPxWidth, targetPxHeight);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

const SVG_STYLE_PROPS = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "opacity",
  "color",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-anchor",
  "dominant-baseline",
  "visibility",
  "display",
];

function inlineComputedStyles(src: Element, dst: Element): void {
  const srcEls = [src, ...src.querySelectorAll<Element>("*")];
  const dstEls = [dst, ...dst.querySelectorAll<Element>("*")];
  for (let i = 0; i < srcEls.length; i++) {
    const s = srcEls[i];
    const d = dstEls[i];
    if (!d) continue;
    const cs = window.getComputedStyle(s);
    const decls: string[] = [];
    for (const prop of SVG_STYLE_PROPS) {
      const v = cs.getPropertyValue(prop);
      if (v) decls.push(`${prop}:${v}`);
    }
    if (decls.length) d.setAttribute("style", decls.join(";"));
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load SVG image: ${src}`));
    img.src = src;
  });
}

// --- table rendering ------------------------------------------------------

function drawTable(
  pdf: jsPDF,
  t: TableBlock,
  y: number,
  pageHeight: number,
): number {
  if (y > pageHeight - MARGIN - 80) {
    pdf.addPage();
    y = MARGIN;
  }
  pdf.setFont("helvetica", "bold").setFontSize(12);
  pdf.text(t.title, MARGIN, y);
  y += 14;

  autoTable(pdf, {
    startY: y,
    head: [t.head],
    body: t.body,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [235, 235, 235], textColor: 30 },
    theme: "grid",
  });

  const finalY = (pdf as unknown as { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY;
  return (finalY ?? y) + GAP_AFTER_TABLE;
}

// --- DOM collectors -------------------------------------------------------

// The LineChart wrapper contains both the data SVG and a tiny menu-icon SVG
// (the kebab/arrow button). Pick the largest SVG in the host to skip the icon.
function findChartSvg(host: HTMLElement): SVGSVGElement | null {
  let best: SVGSVGElement | null = null;
  let bestArea = 0;
  host.querySelectorAll<SVGSVGElement>("svg").forEach((svg) => {
    if (svg.closest(".chart-menu-button, .chart-menu-trigger-area")) return;
    const r = svg.getBoundingClientRect();
    const area = r.width * r.height;
    if (area > bestArea) {
      bestArea = area;
      best = svg;
    }
  });
  return best;
}

function collectCharts(container: HTMLElement): ChartBlock[] {
  const blocks: ChartBlock[] = [];
  const sections = container.querySelectorAll<HTMLElement>("section");
  sections.forEach((section) => {
    const id = section.getAttribute("id");
    if (id === "summary" || id === "detection") return;

    const cards = section.querySelectorAll<HTMLElement>(".results__small");
    if (cards.length) {
      cards.forEach((card) => {
        const svg = findChartSvg(card);
        if (!svg) return;
        const heading = card.querySelector("h3")?.textContent?.trim() ?? "";
        blocks.push({ heading, svg });
      });
    } else {
      const svg = findChartSvg(section);
      if (!svg) return;
      const heading =
        section.querySelector("h1, h2, h3")?.textContent?.trim() ?? "";
      blocks.push({ heading, svg });
    }
  });
  return blocks;
}

function collectSummaryTables(container: HTMLElement): TableBlock[] {
  const blocks: TableBlock[] = [];
  const sections = container.querySelectorAll<HTMLElement>(".summary__section");
  sections.forEach((section) => {
    const title =
      section.querySelector(".summary__title")?.textContent?.trim() ?? "";
    const table = section.querySelector("table");
    if (!table) return;
    const head = Array.from(table.querySelectorAll("thead th")).map(
      (th) => th.textContent?.trim().replace(/\s+/g, " ") ?? "",
    );
    const body = Array.from(table.querySelectorAll("tbody tr")).map((tr) =>
      Array.from(tr.querySelectorAll("td")).map(
        (td) => td.textContent?.trim().replace(/\s+/g, " ") ?? "",
      ),
    );
    blocks.push({ title, head, body });
  });
  return blocks;
}

// --- parameter table builders --------------------------------------------
//
// Drives its content entirely from ui-params.toml — adding a new field
// there (with `section = "..."`) automatically adds it to the export.

interface ReportSection {
  id: string;
  title: string;
  // If present and false, the whole sub-table is skipped (used for disabled
  // mitigations).
  isEnabled?: (p: Parameters) => boolean;
}

const REPORT_SECTIONS: ReportSection[] = [
  { id: "scenario", title: "Scenario" },
  { id: "detection", title: "Detection" },
  {
    id: "vaccine",
    title: "Vaccine",
    isEnabled: (p) => p.mitigations.vaccine.enabled,
  },
  {
    id: "antivirals",
    title: "Antivirals",
    isEnabled: (p) => p.mitigations.antivirals.enabled,
  },
  {
    id: "community",
    title: "Community mitigation",
    isEnabled: (p) => p.mitigations.community.enabled,
  },
  {
    id: "ttiq",
    title: "TTIQ",
    isEnabled: (p) => p.mitigations.ttiq.enabled,
  },
];

const intFmt = new Intl.NumberFormat("en-US");

function fmtScalar(cfg: FieldConfig, value: number): string {
  if (cfg.type === "percent") return `${(value * 100).toFixed(1)}%`;
  if (cfg.type === "integer") return intFmt.format(value);
  if (cfg.type === "select") {
    const opt = cfg.options?.find((o) => o.value === value);
    return opt?.label ?? String(value);
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

function fmtGroup(
  cfg: FieldConfig,
  values: number[],
  groupLabels: string[],
): string {
  return values
    .map((v, i) => `${groupLabels[i] ?? `G${i}`}: ${fmtScalar(cfg, v)}`)
    .join(", ");
}

function fmtMatrix(
  cfg: FieldConfig,
  values: number[],
  groupLabels: string[],
): string {
  const n = groupLabels.length;
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      parts.push(
        `${groupLabels[i]} → ${groupLabels[j]}: ${fmtScalar(cfg, values[i * n + j] ?? 0)}`,
      );
    }
  }
  return parts.join("; ");
}

// The TOML uses `scenario.*` as a UI grouping for fields that live flat on
// Parameters (scenario.population → params.population). Mitigation paths
// mirror the struct exactly. `scenario.days` is synthetic (days is its own
// ref, not part of Parameters).
function resolveValue(
  params: Parameters,
  days: number,
  path: string,
): unknown {
  if (path === "scenario.days") return days;
  const parts = path.split(".");
  if (parts[0] === "scenario" && parts.length === 2) {
    return (params as unknown as Record<string, unknown>)[parts[1]];
  }
  let cur: unknown = params;
  for (const p of parts) {
    cur = (cur as Record<string, unknown> | undefined)?.[p];
  }
  return cur;
}

function isVisible(cfg: FieldConfig, params: Parameters): boolean {
  if (cfg.show_when_doses_2 && params.mitigations.vaccine.doses !== 2) {
    return false;
  }
  return true;
}

function buildRow(
  path: string,
  cfg: FieldConfig,
  value: unknown,
  groupLabels: string[],
): Row {
  if (cfg.matrix && Array.isArray(value)) {
    return [cfg.label, fmtMatrix(cfg, value as number[], groupLabels)];
  }
  if (cfg.per_group && Array.isArray(value)) {
    return [cfg.label, fmtGroup(cfg, value as number[], groupLabels)];
  }
  return [cfg.label, fmtScalar(cfg, value as number)];
}

function buildParamTables(params: Parameters, days: number): TableBlock[] {
  const groupLabels = params.population_fraction_labels;
  const tables: TableBlock[] = [];
  for (const section of REPORT_SECTIONS) {
    if (section.isEnabled && !section.isEnabled(params)) continue;
    const rows = fieldsInSection(section.id)
      .filter(([, cfg]) => isVisible(cfg, params))
      .map(([path, cfg]) =>
        buildRow(path, cfg, resolveValue(params, days, path), groupLabels),
      );
    if (rows.length) {
      tables.push({ title: section.title, head: PARAM_TABLE_HEAD, body: rows });
    }
  }
  return tables;
}
