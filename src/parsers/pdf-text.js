// Shared PDF text extraction for all parsers in this project.
//
// Uses pdfjs-dist directly (actively maintained) rather than the abandoned
// pdf-parse package, which bundles a ~2016-era pdf.js that reproducibly
// rejected an otherwise valid, structurally verified PDF (confirmed by
// manually walking its xref table and object offsets) with "bad XRef
// entry". pdfjs-dist parses the same file without issue.
//
// pdfjs-dist returns individually positioned text items rather than
// pre-joined lines, so lines are reconstructed here by grouping items that
// share a y-coordinate, matching the line-oriented text that later parsing
// logic (anchors, regex) expects.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STANDARD_FONT_DATA_URL = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "node_modules",
  "pdfjs-dist",
  "standard_fonts",
) + path.sep;

export async function extractPdfText(pdfBuffer) {
  const doc = await getDocument({
    data: new Uint8Array(pdfBuffer),
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  }).promise;

  let text = "";
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    let currentLine = "";
    let lastY = null;
    for (const item of content.items) {
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        text += currentLine + "\n";
        currentLine = "";
      }
      currentLine += item.str;
      lastY = y;
    }
    text += currentLine + "\n";
  }

  return text;
}
