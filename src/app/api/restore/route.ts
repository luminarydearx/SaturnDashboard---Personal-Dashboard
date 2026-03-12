import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, saveUsers, saveNotes, saveSettings, getSettings } from '@/lib/db';

// POST /api/restore — upload a backup zip and restore data
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden — only owner can restore' }, { status: 403 });
    }

    const body = await req.json() as {
      users?:    unknown[];
      notes?:    unknown[];
      settings?: Record<string, unknown>;
    };

    const results: string[] = [];

    if (Array.isArray(body.users) && body.users.length > 0) {
      saveUsers(body.users as any);
      results.push(`✓ ${body.users.length} users restored`);
    }
    if (Array.isArray(body.notes) && body.notes.length > 0) {
      saveNotes(body.notes as any);
      results.push(`✓ ${body.notes.length} notes restored`);
    }
    if (body.settings && typeof body.settings === 'object') {
      // Merge settings — never overwrite github token
      const current = getSettings();
      const merged = { ...current, ...body.settings };
      delete (merged as any).githubToken; // safety
      saveSettings(merged as any);
      results.push('✓ settings restored');
    }

    if (results.length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada data valid ditemukan di file backup' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: results.join(', ') });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 });
  }
}
