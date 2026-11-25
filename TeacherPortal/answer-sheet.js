/**
 * Reads model answers from an answer-sheet PDF, where each answer is numbered
 * "A1)", "A2)", ... Uses pdf.js, loaded as the global `pdfjsLib`.
 */
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js";
const ANSWER_MARKER = /A(\d+)\s*\)/g;

async function readPdfText(file) {
  const { pdfjsLib } = window;
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;

  const pages = [];
  for (let number = 1; number <= pdf.numPages; number += 1) {
    const content = await (await pdf.getPage(number)).getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  // Join every page first, so an answer that continues onto the next page stays whole.
  return pages.join(" ");
}

/**
 * Splits text into answers by their "A<n>)" markers, ordered by number.
 * Exported for testing.
 */
export function splitAnswers(text) {
  const markers = [...text.matchAll(ANSWER_MARKER)];
  const answers = new Map();
  markers.forEach((marker, i) => {
    const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
    answers.set(Number(marker[1]), text.slice(marker.index + marker[0].length, end).trim());
  });
  return [...answers.keys()].sort((a, b) => a - b).map((number) => answers.get(number));
}

export async function readAnswerSheet(file) {
  return splitAnswers(await readPdfText(file));
}
