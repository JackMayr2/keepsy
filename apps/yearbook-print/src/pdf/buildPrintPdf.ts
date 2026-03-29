import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { ArchiveBundle } from '../services/data';

const PAGE_W = 612;
const PAGE_H = 792;
const M = 48;
const LINE_H = 14;
const MAX_W = PAGE_W - M * 2;

function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
      line = trial;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawParagraph(
  page: PDFPage,
  font: PDFFont,
  size: number,
  text: string,
  x: number,
  yTop: number,
  color = rgb(0.1, 0.12, 0.14)
): number {
  let y = yTop;
  const lines = wrapLines(text, font, size, MAX_W);
  for (const ln of lines) {
    page.drawText(ln, { x, y, size, font, color });
    y -= LINE_H * (size / 11);
  }
  return y - 8;
}

async function tryEmbedImage(pdf: PDFDocument, bytes: Uint8Array) {
  if (bytes.length > 4) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      return pdf.embedJpg(bytes);
    }
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      return pdf.embedPng(bytes);
    }
  }
  return null;
}

async function fetchImage(url: string | null | undefined): Promise<Uint8Array | null> {
  if (!url?.trim()) return null;
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) return null;
    return new Uint8Array(await r.arrayBuffer());
  } catch {
    return null;
  }
}

function displayName(u: { firstName?: string; lastName?: string } | undefined): string {
  if (!u) return 'Member';
  const n = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return n || 'Member';
}

export async function buildPrintPdf(bundle: ArchiveBundle): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const {
    yearbookName,
    compilation,
    prompts,
    drafts,
    polls,
    superlatives,
    travels,
    users,
    memberDocToUserId,
  } = bundle;
  const draftList = [...drafts.values()];

  const addPage = () => {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_W,
      height: PAGE_H,
      color: rgb(1, 1, 1),
    });
    return page;
  };

  const renderPage = async (section: string, items: string[]) => {
    const page = addPage();
    let y = PAGE_H - M;

    page.drawText(`Keepsy yearbook · ${yearbookName}`, {
      x: M,
      y: PAGE_H - 28,
      size: 9,
      font,
      color: rgb(0.45, 0.5, 0.55),
    });

    const sectionTitle = section.charAt(0).toUpperCase() + section.slice(1);
    page.drawText(sectionTitle, { x: M, y, size: 18, font: fontBold, color: rgb(0.05, 0.08, 0.12) });
    y -= 36;

    if (section === 'cover') {
      y = drawParagraph(page, fontBold, 22, yearbookName, M, y);
      y = drawParagraph(page, font, 12, 'Printed compilation snapshot', M, y);
      if (compilation.editorNotes?.trim()) {
        y -= 8;
        y = drawParagraph(page, fontBold, 11, 'Editor notes', M, y);
        y = drawParagraph(page, font, 10, compilation.editorNotes, M, y);
      }
      return;
    }

    if (section === 'closing') {
      drawParagraph(page, font, 14, 'Thank you for the memories.', M, y);
      return;
    }

    if (section === 'members') {
      for (const memberDocId of items) {
        const uid = memberDocToUserId.get(memberDocId);
        const u = uid ? users.get(uid) : undefined;
        const line = displayName(u);
        y = drawParagraph(page, font, 11, `• ${line}`, M, y);
        if (y < M + 60) break;
      }
      return;
    }

    if (section === 'prompts') {
      for (const promptId of items) {
        const p = prompts.get(promptId);
        if (!p) continue;
        y = drawParagraph(page, fontBold, 12, p.text, M, y);
        const subs = draftList.filter((d) => d.promptId === promptId);
        for (const d of subs) {
          const who = displayName(users.get(d.userId));
          y = drawParagraph(page, font, 10, `${who}: ${d.content}`, M, y);
          if (d.photoURL) {
            const bytes = await fetchImage(d.photoURL);
            if (bytes) {
              const img = await tryEmbedImage(pdf, bytes);
              if (img) {
                const iw = Math.min(MAX_W, img.width);
                const ih = (img.height * iw) / img.width;
                if (y - ih < M) {
                  break;
                }
                page.drawImage(img, { x: M, y: y - ih, width: iw, height: ih });
                y -= ih + 12;
              }
            }
          }
          if (y < M + 80) break;
        }
        y -= 6;
        if (y < M + 80) break;
      }
      return;
    }

    if (section === 'polls') {
      for (const pollId of items) {
        const p = polls.get(pollId);
        if (!p) continue;
        y = drawParagraph(page, fontBold, 12, p.question, M, y);
        p.options.forEach((opt, i) => {
          y = drawParagraph(page, font, 10, `${i + 1}. ${opt}`, M, y);
        });
        y -= 8;
        if (y < M + 60) break;
      }
      return;
    }

    if (section === 'superlatives') {
      for (const sid of items) {
        const s = superlatives.get(sid);
        if (!s) continue;
        y = drawParagraph(page, fontBold, 12, s.category, M, y);
        for (const [k, v] of Object.entries(s.nominations)) {
          y = drawParagraph(page, font, 10, `${k}: ${v}`, M, y);
          if (y < M + 50) break;
        }
        y -= 6;
      }
      return;
    }

    if (section === 'travels') {
      for (const tid of items) {
        const t = travels.get(tid);
        if (!t) continue;
        const title = t.placeName || t.caption || t.notes || 'Trip';
        y = drawParagraph(page, fontBold, 11, title, M, y);
        const cap = t.caption || t.notes;
        if (cap) y = drawParagraph(page, font, 10, cap, M, y);
        const urls = t.photoURLs?.length ? t.photoURLs : t.photoURL ? [t.photoURL] : [];
        for (const url of urls.slice(0, 2)) {
          const bytes = await fetchImage(url);
          if (!bytes) continue;
          const img = await tryEmbedImage(pdf, bytes);
          if (!img) continue;
          const iw = Math.min(MAX_W, img.width);
          const ih = (img.height * iw) / img.width;
          if (y - ih < M) break;
          page.drawImage(img, { x: M, y: y - ih, width: iw, height: ih });
          y -= ih + 10;
        }
        y -= 6;
        if (y < M + 80) break;
      }
    }
  };

  const plan = compilation.pagePlan.length
    ? compilation.pagePlan
    : [
        { pageNumber: 1, section: 'cover', layout: 'fallback', items: ['cover'] },
        { pageNumber: 2, section: 'closing', layout: 'fallback', items: ['closing'] },
      ];

  for (const p of plan) {
    await renderPage(p.section, p.items);
  }

  return pdf.save();
}
