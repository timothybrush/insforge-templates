'use client';

import { pdfjs } from 'react-pdf';

// pdfjs ships a separate worker bundle that must be loaded outside the
// main JS bundle. The unpkg CDN is the lowest-friction default for a
// template — self-host this if you want offline support or strict CSP:
// copy `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` into `public/`
// and point workerSrc at `/pdf.worker.min.mjs` instead.
let configured = false;
export function ensurePdfWorker() {
  if (configured) return;
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  configured = true;
}
