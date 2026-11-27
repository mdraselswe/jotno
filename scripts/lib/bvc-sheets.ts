/**
 * Review sheets for the BVC import: the rows whose name or reg no the PDF text
 * can't give, cut out of the rendered page and stacked into PNGs, with a fixes
 * CSV to fill in by eye. `pnpm bvc:import <pdf> --review <dir>` writes them;
 * `--fixes <dir>/fixes.csv` reads the CSV back.
 *
 * Only the number, name and reg no columns are cut out: no addresses.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, type Canvas } from "@napi-rs/canvas";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { csvField, type VoterRow } from "./bvc-rows.ts";

const SCALE = 3;
/** Left and right edges (PDF points) of the number, name and reg no columns. */
const LEFT = 40;
const RIGHT = 316;
const LABEL = 150;
const PER_SHEET = 20;
/** A row's text reaches this far above its number's baseline. */
const ABOVE = 11;

/** Where to cut each row: from just above its number to just above the next one. */
function cuts(rows: VoterRow[], all: VoterRow[]) {
  const onPage = new Map<number, number[]>();
  for (const r of all) onPage.set(r.page, [...(onPage.get(r.page) ?? []), r.y]);
  return rows.map((r) => {
    const below = (onPage.get(r.page) ?? []).filter((y) => y < r.y - 4).sort((a, b) => b - a)[0];
    const bottom = Math.max(r.y - 45, Math.min(r.y - 12, (below ?? r.y - 26) + ABOVE));
    return { row: r, top: r.y + ABOVE, bottom };
  });
}

/**
 * Writes `sheet-001.png`… and `fixes.csv` (voter_no, page, reg_no, name_bn,
 * sheet) into `dir`, with what the PDF text did give filled in.
 */
export async function writeReviewSheets(
  doc: PDFDocumentProxy,
  rows: VoterRow[],
  all: VoterRow[],
  dir: string,
) {
  mkdirSync(dir, { recursive: true });
  const pages = new Map<number, { canvas: Canvas; height: number }>();
  const pageImage = async (n: number) => {
    const done = pages.get(n);
    if (done) return done;
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: SCALE });
    const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // pdf.js draws on any 2D context; @napi-rs/canvas has the same drawing API.
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport: vp,
    }).promise;
    page.cleanup();
    // Keep only the last few pages: rows come in page order.
    if (pages.size > 3) pages.delete(pages.keys().next().value ?? n);
    const image = { canvas, height: vp.height };
    pages.set(n, image);
    return image;
  };

  const csv = ["voter_no,page,reg_no,name_bn,sheet"];
  const list = cuts(rows, all);
  for (let s = 0; s * PER_SHEET < list.length; s++) {
    const part = list.slice(s * PER_SHEET, (s + 1) * PER_SHEET);
    const name = `sheet-${String(s + 1).padStart(3, "0")}.png`;
    const heights = part.map((c) => Math.round((c.top - c.bottom) * SCALE));
    const width = LABEL + Math.round((RIGHT - LEFT) * SCALE);
    const sheet = createCanvas(
      width,
      heights.reduce((a, b) => a + b + 2, 0),
    );
    const ctx = sheet.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    let y = 0;
    for (const [i, c] of part.entries()) {
      const h = heights[i] ?? 0;
      const { canvas, height } = await pageImage(c.row.page);
      ctx.drawImage(
        canvas,
        LEFT * SCALE,
        height - c.top * SCALE,
        width - LABEL,
        h,
        LABEL,
        y,
        width - LABEL,
        h,
      );
      ctx.fillStyle = "#c00";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(`#${c.row.voterNo}`, 8, y + 34);
      ctx.fillStyle = "#666";
      ctx.font = "20px sans-serif";
      ctx.fillText(`p${c.row.page}`, 8, y + 60);
      ctx.fillStyle = "#bbb";
      ctx.fillRect(0, y + h, width, 2);
      y += h + 2;
      csv.push(
        [c.row.voterNo, c.row.page, c.row.regNo, c.row.readable ? c.row.name : "", name]
          .map(csvField)
          .join(","),
      );
    }
    writeFileSync(join(dir, name), sheet.toBuffer("image/png"));
  }
  writeFileSync(join(dir, "fixes.csv"), `﻿${csv.join("\n")}\n`);
  return Math.ceil(list.length / PER_SHEET);
}
