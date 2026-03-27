import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/auth';
import { getUserById, getAutogenAnnounce, saveAutogenAnnounce, AutogenAnnounce } from '@/lib/db';
import { pushToGithub } from '@/lib/github';

const AUTOGEN_OWNER = process.env.NEXT_PUBLIC_AUTOGEN_GITHUB_OWNER || 'luminarydearx';
const AUTOGEN_REPO  = process.env.NEXT_PUBLIC_AUTOGEN_GITHUB_REPO  || 'AutoGenerator-App';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || !['owner','co-owner','admin'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(getAutogenAnnounce());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || !['owner','co-owner','admin'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // All data comes from POST body — never from URL params
    const body = await req.json() as Partial<AutogenAnnounce> & { branch?: string };
    const announceId = (body.active ?? false) ? randomUUID() : '';
    const branch = body.branch || 'master';
    const ann: AutogenAnnounce = {
      active:    body.active    ?? false,
      message:   body.message   ?? '',
      type:      body.type      ?? 'info',
      link:      body.link      ?? '',
      linkText:  body.linkText  ?? '',
      updatedAt: new Date().toISOString(),
    };

    const token = process.env.GITHUB_TOKEN || '';
    if (!token) return NextResponse.json({ error: 'GITHUB_TOKEN tidak ditemukan' }, { status: 500 });

    const payload = JSON.stringify(ann, null, 2);
    await pushToGithub({
      token, owner: AUTOGEN_OWNER, repo: AUTOGEN_REPO,
      files: [{ path: 'public/announce.json', content: payload }],
      message: `📢 AutoGen: ${ann.active ? 'Set' : 'Clear'} announcement [${branch}] via Saturn Dashboard`,
      branch,
    });

    if (branch === 'master') saveAutogenAnnounce(ann);
    return NextResponse.json({ success: true, branch });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
