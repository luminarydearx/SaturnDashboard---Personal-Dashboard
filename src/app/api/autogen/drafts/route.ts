import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, readJson, writeJson } from '@/lib/db';

interface Draft {
  id:        string;
  type:      string;
  title:     string;
  content:   string;
  userId?:   string;
  createdAt: string;
  updatedAt: string;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || !['owner','co-owner','admin'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const drafts = readJson<Draft[]>('autogen-drafts.json', []);
    return NextResponse.json({ success: true, drafts, count: drafts.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { token?: string; draft?: Draft; drafts?: Draft[] };

    // Validate via shared secret
    const secret = process.env.AUTOGEN_DRAFT_SECRET || 'saturn-autogen-drafts-2025';
    if (body.token !== secret) {
      return NextResponse.json(
        { error: 'Invalid token. Set AUTOGEN_DRAFT_SECRET in Vercel env and VITE_DRAFT_SECRET in AutoGen env.' },
        { status: 401 }
      );
    }

    const existing = readJson<Draft[]>('autogen-drafts.json', []);

    if (body.drafts && Array.isArray(body.drafts)) {
      const map = new Map(existing.map((d: Draft) => [d.id, d]));
      for (const d of body.drafts) map.set(d.id, d);
      const merged = Array.from(map.values())
        .sort((a: Draft, b: Draft) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 500);
      writeJson('autogen-drafts.json', merged);
      return NextResponse.json({ success: true, count: merged.length });
    }

    if (body.draft) {
      const draft = body.draft;
      const idx = existing.findIndex((d: Draft) => d.id === draft.id);
      if (idx >= 0) existing[idx] = { ...existing[idx], ...draft };
      else existing.unshift(draft);
      writeJson('autogen-drafts.json', existing.slice(0, 500));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'No draft data provided' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || !['owner','co-owner'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await req.json() as { id: string | null };
    const existing = readJson<Draft[]>('autogen-drafts.json', []);
    const filtered = id ? existing.filter((d: Draft) => d.id !== id) : [];
    writeJson('autogen-drafts.json', filtered);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
