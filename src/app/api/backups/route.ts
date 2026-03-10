import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getBackups, addBackupEntry, deleteBackupEntry, renameBackupEntry } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: getBackups() });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user || (user.role !== 'owner' && user.role !== 'co-owner')) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }
  const body = await req.json();
  const entry = {
    id: uuidv4(), name: body.name || `manual-backup-${Date.now()}.zip`,
    createdAt: new Date().toISOString(), type: 'manual' as const, createdBy: user.username,
    size: body.size,
  };
  addBackupEntry(entry);
  return NextResponse.json({ success: true, data: entry });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user || (user.role !== 'owner' && user.role !== 'co-owner')) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }
  const { id, name } = await req.json();
  const ok = renameBackupEntry(id, name);
  return NextResponse.json({ success: ok });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user || (user.role !== 'owner' && user.role !== 'co-owner')) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }
  const { id } = await req.json();
  const ok = deleteBackupEntry(id);
  return NextResponse.json({ success: ok });
}
