'use client';

import { useState } from 'react';
import { toast } from 'sonner';

// Shared open-citation handler. Both the in-message `[n]` button
// (components/chat-message.tsx) and the source rail's "Open" link
// (components/citation-rail.tsx) need the same flow: fetch a
// short-lived presigned URL for the source PDF, then open it in a new
// tab at the cited page. Centralizing here avoids drift between the
// two surfaces.
export function useOpenCitation() {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function open(documentId: string | null | undefined, pageNumber: number | null | undefined) {
    if (!documentId) return;
    setLoadingId(documentId);
    try {
      const res = await fetch(`/api/documents/${documentId}/url`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const { url } = (await res.json()) as { url: string };
      const fragment = pageNumber ? `#page=${pageNumber}` : '';
      window.open(url + fragment, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Could not open source PDF');
    } finally {
      setLoadingId(null);
    }
  }

  return { open, loadingId };
}
