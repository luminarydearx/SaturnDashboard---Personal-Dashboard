import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getUsers, getNotes, getSettings, addBackupEntry, extractRepoName } from '@/lib/db';
import { createZipBuffer } from '@/lib/zipCreator';
import { pushToGithub } from '@/lib/github';
import { v4 as uuidv4 } from 'uuid';

const pad = (n: number) => String(n).padStart(2, '0');

function timestamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

function buildBackupEntries() {
  const settings = getSettings();
  const users = getUsers();
  const notes = getNotes();

  const manifest = {
    createdAt: new Date().toISOString(),
    version: 'saturn-v4.4.2',
    counts: { users: users.length, notes: notes.length },
    important: 'Restore by replacing the /data/ folder. Passwords are bcrypt hashes.',
  };

  const safeSettings = { ...settings, githubToken: '[REDACTED - re-enter in Settings]' };

  return [
    { name: 'data/users.json', content: JSON.stringify(users, null, 2) },
    { name: 'data/notes.json', content: JSON.stringify(notes, null, 2) },
    { name: 'data/settings.json', content: JSON.stringify(safeSettings, null, 2) },
    { name: 'manifest.json', content: JSON.stringify(manifest, null, 2) },
    {
      name: 'RESTORE.md',
      content: [
        '# Saturn Dashboard v4.4.2 — Data Backup',
        '',
        `Backup created: ${new Date().toISOString()}`,
        '',
        '## How to restore',
        '1. Stop the Saturn Dashboard server',
        '2. Replace the `data/` folder with the `data/` folder from this zip',
        '3. Restart: `npm run dev`',
        '',
        '## Notes',
        '- GitHub token NOT included for security — re-enter in Settings',
        '- Images stored on Cloudinary; this backup contains URLs only',
      ].join('\n'),
    },
  ];
}

// ── GET — download zip to browser ──────────────────────────────────────────
export async function GET() {
  const session = await getSession();

  if (!session)
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const user = getUserById(session.userId);

  if (!user || (user.role !== 'owner' && user.role !== 'co-owner')) {
    return NextResponse.json({ success: false, error: 'Owner/Co-Owner only' }, { status: 403 });
  }

  const entries = buildBackupEntries();
  const zipBuf = createZipBuffer(entries);
  const ts = timestamp();
  const fname = `saturn-backup-${ts}.zip`;

  // FIX: Buffer → Blob agar kompatibel dengan NextResponse BodyInit
  const body = new Blob([zipBuf]);

  // Register backup entry
  addBackupEntry({
    id: uuidv4(),
    name: fname,
    createdAt: new Date().toISOString(),
    size: zipBuf.length,
    type: 'local',
    createdBy: user.username,
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fname}"`,
      'Content-Length': String(zipBuf.length),
      'Cache-Control': 'no-store',
    },
  });
}

// ── POST — push to GitHub ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session)
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const user = getUserById(session.userId);

  if (!user || (user.role !== 'owner' && user.role !== 'co-owner')) {
    return NextResponse.json({ success: false, error: 'Owner/Co-Owner only' }, { status: 403 });
  }

  const settings = getSettings();

  if (!settings.githubToken || !settings.githubOwner || !settings.githubRepo) {
    return NextResponse.json({ success: false, error: 'GitHub not configured in Settings' });
  }

  const entries = buildBackupEntries();
  const zipBuf = createZipBuffer(entries);
  const ts = timestamp();

  const repoName = extractRepoName(settings.githubRepo);

  const result = await pushToGithub({
    token: settings.githubToken,
    owner: settings.githubOwner,
    repo: repoName,
    files: [
      {
        path: `backups/saturn-backup-${ts}.zip`,
        content: zipBuf.toString('base64'),
      },
      {
        path: 'backups/latest.json',
        content: JSON.stringify(
          {
            lastBackup: new Date().toISOString(),
            file: `saturn-backup-${ts}.zip`,
          },
          null,
          2
        ),
      },
    ],
    message: `🔒 Auto-backup ${ts}`,
    onProgress: () => {},
  });

  const fname = `saturn-backup-${ts}.zip`;

  if (result.success) {
    addBackupEntry({
      id: uuidv4(),
      name: fname,
      createdAt: new Date().toISOString(),
      size: zipBuf.length,
      type: 'github',
      createdBy: user.username,
    });

    return NextResponse.json({
      success: true,
      file: `backups/${fname}`,
    });
  } else {
    return NextResponse.json({
      success: false,
      error: result.errors.join(', '),
    });
  }
}