/**
 * Hoopis Chat API Route — Anthropic proxy
 *
 * Drop either version into your project:
 *
 *   Next.js App Router  →  app/api/chat/route.ts
 *   Next.js Pages Router →  pages/api/chat.ts
 *   Express             →  see bottom of file
 *
 * Required env var: ANTHROPIC_API_KEY
 */

// ─────────────────────────────────────────────────────────────────────────────
// Option A: Next.js App Router  (app/api/chat/route.ts)
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { messages, system } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    // Validate roles alternate correctly (Claude API requirement)
    const sanitised = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .filter((m) => typeof m.content === 'string' && m.content.trim().length > 0);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: system ?? undefined,
      messages: sanitised,
    });

    const content =
      response.content.find((b) => b.type === 'text')?.text ?? '';

    return NextResponse.json({
      content,
      stop_reason: response.stop_reason,
      usage: response.usage,
    });
  } catch (error: unknown) {
    console.error('[/api/chat] Error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status ?? 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Only allow POST
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}


// ─────────────────────────────────────────────────────────────────────────────
// Option B: Next.js Pages Router  (pages/api/chat.ts)
// ─────────────────────────────────────────────────────────────────────────────
//
// import type { NextApiRequest, NextApiResponse } from 'next';
// import Anthropic from '@anthropic-ai/sdk';
//
// const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
//
// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== 'POST') {
//     res.setHeader('Allow', ['POST']);
//     return res.status(405).json({ error: 'Method not allowed' });
//   }
//
//   try {
//     const { messages, system } = req.body;
//
//     if (!Array.isArray(messages) || messages.length === 0) {
//       return res.status(400).json({ error: 'messages array is required' });
//     }
//
//     const response = await client.messages.create({
//       model: 'claude-sonnet-4-5',
//       max_tokens: 1024,
//       system: system ?? undefined,
//       messages,
//     });
//
//     const content = response.content.find((b) => b.type === 'text')?.text ?? '';
//     res.status(200).json({ content, stop_reason: response.stop_reason });
//   } catch (error: unknown) {
//     console.error('[/api/chat]', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// }


// ─────────────────────────────────────────────────────────────────────────────
// Option C: Express  (e.g., server.ts)
// ─────────────────────────────────────────────────────────────────────────────
//
// import express from 'express';
// import Anthropic from '@anthropic-ai/sdk';
//
// const app = express();
// app.use(express.json());
//
// const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
//
// app.post('/api/chat', async (req, res) => {
//   try {
//     const { messages, system } = req.body;
//
//     if (!Array.isArray(messages) || messages.length === 0) {
//       return res.status(400).json({ error: 'messages array is required' });
//     }
//
//     const response = await client.messages.create({
//       model: 'claude-sonnet-4-5',
//       max_tokens: 1024,
//       system: system ?? undefined,
//       messages,
//     });
//
//     const content = response.content.find((b) => b.type === 'text')?.text ?? '';
//     res.json({ content, stop_reason: response.stop_reason });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });
//
// app.listen(3001, () => console.log('API server running on :3001'));
