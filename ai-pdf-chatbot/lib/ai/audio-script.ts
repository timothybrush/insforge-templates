import 'server-only';
import type { createClient } from '@insforge/sdk';
import { UTILITY_MODEL } from './constants';

type InsforgeClient = ReturnType<typeof createClient>;

export type AudioScriptTurn = {
  speaker: 'Sarah' | 'Mike';
  text: string;
};

// Trim each document summary so the joint prompt stays under a few k
// tokens. Quality of the conversational script saturates well before
// model context limits.
const SUMMARY_CHAR_BUDGET = 600;

function buildPrompt(
  workspaceName: string,
  docs: Array<{ file_name: string; summary: string | null }>,
): string {
  const block = docs
    .map((d, i) => `${i + 1}. ${d.file_name}\n   ${(d.summary ?? '').slice(0, SUMMARY_CHAR_BUDGET)}`)
    .join('\n\n');

  return `You write conversational audio scripts in the style of a NotebookLM "Audio Overview" podcast. Two hosts, Sarah and Mike, have a natural back-and-forth about a study workspace named "${workspaceName}". They sound curious, warm, and slightly informal — like two friends preparing for an exam together.

Requirements:
- 6 to 15 turns total, alternating speakers, starting with Sarah.
- Each turn is 1 to 3 sentences. No filler like "um" or "you know".
- They reference the source PDFs by topic, not by file name.
- The conversation has a clear arc: hook → main ideas → one concrete example → wrap-up.
- Total spoken length should fit roughly 5 to 8 minutes of audio.

Return ONLY a JSON object: {"turns":[{"speaker":"Sarah","text":"..."},{"speaker":"Mike","text":"..."}]}. No markdown fences.

PDF summaries:
${block}`;
}

export async function generateAudioScript(
  client: InsforgeClient,
  workspaceName: string,
  docs: Array<{ file_name: string; summary: string | null }>,
): Promise<AudioScriptTurn[]> {
  const completion = (await client.ai.chat.completions.create({
    model: UTILITY_MODEL,
    messages: [{ role: 'user', content: buildPrompt(workspaceName, docs) }],
  })) as { choices: Array<{ message: { content: string } }> };

  const raw = completion.choices?.[0]?.message?.content ?? '{}';
  return parseScript(raw);
}

function parseScript(raw: string): AudioScriptTurn[] {
  // Models sometimes wrap the JSON in code fences despite the prompt.
  const cleaned = raw.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as { turns?: Array<{ speaker?: string; text?: string }> };
    const turns = Array.isArray(parsed.turns) ? parsed.turns : [];
    return turns
      .map((t) => ({
        speaker: t.speaker === 'Mike' ? 'Mike' : 'Sarah',
        text: typeof t.text === 'string' ? t.text.trim() : '',
      }))
      .filter((t): t is AudioScriptTurn => t.text.length > 0);
  } catch {
    return [];
  }
}
