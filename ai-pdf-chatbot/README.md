<a href="https://insforge.dev">
  <h1 align="center">InsForge AI PDF Chatbot</h1>
</a>

<p align="center">
  Upload PDFs and chat with them. RAG with citations powered by InsForge pgvector + InsForge AI.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#demo"><strong>Demo</strong></a> ·
  <a href="#quick-launch"><strong>Quick Launch</strong></a> ·
  <a href="#run-locally"><strong>Run Locally</strong></a> ·
  <a href="#prerequisites"><strong>Prerequisites</strong></a> ·
  <a href="#architecture"><strong>Architecture</strong></a>
</p>

## Features

- Next.js 16 App Router
- PDF upload (≤ 10 MB) with server-side extraction via `pdfjs-dist`
- Vector search on InsForge pgvector (`vector(1536)` + ivfflat cosine)
- Streaming chat with bracketed `[n]` source citations
- **Better Auth** for email + password sign-in — user/session tables live in your InsForge Postgres
- HS256 bridge JWT from BA → InsForge: RLS reads `requesting_user_id()` so every user only sees their own documents and chats
- shadcn/ui + Tailwind 4 design tokens

## Demo

[aipdfchat.insforge.site](https://aipdfchat.insforge.site) — sign up with any email, upload a PDF, ask away.

## Quick Launch

Fastest path:

```bash
npx @insforge/cli create
```

1. Pick the **AI PDF Chatbot** template.
2. Create or connect your InsForge project.
3. The CLI provisions the project and fills the `NEXT_PUBLIC_INSFORGE_*` and `DATABASE_URL` values into `.env.local`.
4. Fill in the remaining BA secrets (see below), then `npm run setup && npm run dev`.

## Run Locally

If you'd rather clone manually:

```bash
git clone https://github.com/InsForge/insforge-templates.git
cd insforge-templates/ai-pdf-chatbot
npm install
```

1. Create a project at [insforge.dev](https://insforge.dev) and copy its **URL** and **anon key** from **Connect → API Keys**.
2. Link this directory:

   ```bash
   npx @insforge/cli link --project-id <your-project-id>
   ```

3. Copy the env example and fill in:

   ```bash
   cp .env.example .env.local
   ```

   - `NEXT_PUBLIC_INSFORGE_BASE_URL`, `NEXT_PUBLIC_INSFORGE_ANON_KEY` — from the dashboard
   - `DATABASE_URL` — the Postgres connection string for the BA tables (cloud: from the dashboard; self-hosted: the default `postgresql://postgres:postgres@127.0.0.1:5432/insforge` works against the local stack)
   - `BETTER_AUTH_SECRET` — `openssl rand -hex 32`
   - `BETTER_AUTH_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL` — `http://localhost:3000` for dev
   - `INSFORGE_JWT_SECRET` — `npx @insforge/cli secrets get JWT_SECRET`

4. Generate the BA tables and create the storage bucket:

   ```bash
   npm run setup
   ```

   `npx @insforge/cli link` (step 2) already applied `migrations/db_init.sql`, which created the `better_auth` schema, the `requesting_user_id()` helper, the app tables (`documents`, `document_chunks`, `chat_sessions`, `chat_messages`), all RLS policies, and the per-bucket storage grants. `npm run setup` now only runs `better-auth migrate` to populate `better_auth.{user,session,account,verification}` and creates the `pdf-documents` storage bucket.

5. Start the dev server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

## Prerequisites

- **InsForge project with AI billing enabled.** The template calls `client.ai.embeddings.create` and `client.ai.chat.completions.create`; both route through OpenRouter under the hood. Free-tier quota runs out quickly under regular use.
- **pgvector extension** — the migration runs `create extension if not exists vector;` against the `public` schema. Supported on any standard InsForge project.
- **Node 18+** for `node:test` and the ESM `pdfjs-dist` build.
- **InsForge SMTP** configured if you want password resets to send mail. Cloud projects: configured automatically. Self-hosted: `PUT /api/auth/smtp-config`.

## Architecture

```
Sign in (Better Auth) ──► same-origin cookie ──► /api/insforge-token signs HS256
                                                            │
                                                            ▼
                                  edgeFunctionToken on InsForge client
                                                            │
                                                            ▼
                              RLS policies read `sub` via requesting_user_id()

PDF upload ──► /api/documents/upload ──► storage.upload + insert documents row + ingest()
                                              │
                                              ▼
                       parsePdf (pdfjs-dist legacy) ──► chunkPages (~800 chars)
                                              │
                                              ▼
                  client.ai.embeddings.create (batches of 16)
                                              │
                                              ▼
                    insert document_chunks (vector(1536), ivfflat)

Chat ──► /api/chat (NDJSON stream) ──► embed(question) ──► match_document_chunks RPC
                                                                  │
                                                                  ▼
                                  send {type:'citations'} to client
                                                                  │
                                                                  ▼
              client.ai.chat.completions.create({ stream: true })  ──► {type:'delta'}…{type:'done'}
                                                                  │
                                                                  ▼
                  persist assistant message with citations payload
```

## Customizing

- **Switch embedding model:** edit `lib/ai/constants.ts` (`EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`). If the dimension changes, also `ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(N)` and re-ingest existing documents.
- **Switch chat model:** edit `CHAT_MODEL` in the same file.
- **Add file types:** swap `lib/pdf/parse.ts` for the right parser; the rest of the pipeline (chunker, embedder, retriever) is format-agnostic.

## License

MIT — see `LICENSE`.
