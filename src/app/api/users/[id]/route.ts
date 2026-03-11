import { autoSyncToGithub } from '@/lib/github-auto';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManage } from '@/lib/auth';
import { getUserById, updateUser, getUsers, saveUsers } from '@/lib/db';
import type { Role } from '@/types';

// ── Next.js 15/16: params is a Promise ────────────────────────────────────
type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const actor = getUserById(session.userId);
  if (!actor) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const target = getUserById(id);
  if (!target) return NextResponse.json({ success: false, error: 'Target user not found' }, { status: 404 });

  const body = await req.json();
  const { action, reason, ...profileData } = body;

  // Profile update (no action key)
  if (!action) {
    if (id === actor.id || canManage(actor.role, target.role)) {
      const allowed = ['displayName','firstName','lastName','email','phone','bio','avatar','username'];
      const updates: Record<string, unknown> = {};
      for (const key of allowed) { if (profileData[key] !== undefined) updates[key] = profileData[key]; }
      const updated = updateUser(id, updates);
      if (!updated) return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
      const { password: _p, ...pub } = updated;
      await autoSyncToGithub('Update user profile');
      return NextResponse.json({ success: true, data: pub });
    }
    return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
  }

  // Permission check for admin actions
  if (!canManage(actor.role, target.role)) {
    return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
  }

  if (action === 'ban') {
    const updated = updateUser(id, {
      banned: true, bannedBy: actor.id,
      bannedAt: new Date().toISOString(),
      bannedReason: reason || `Banned by ${actor.username}`,
      bannedByDisplayName: actor.displayName || actor.username,
      bannedByRole: actor.role,
    });
    if (!updated) return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    const { password: _p, ...pub } = updated;
    await autoSyncToGithub('User ban');
    return NextResponse.json({ success: true, data: pub });
  }

  if (action === 'updateBanReason') {
    const updated = updateUser(id, { bannedReason: reason || '' });
    if (!updated) return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    const { password: _p, ...pub } = updated;
    return NextResponse.json({ success: true, data: pub });
  }

  if (action === 'unban') {
    const updated = updateUser(id, {
      banned: false, bannedBy: undefined, bannedAt: undefined, bannedReason: undefined,
    });
    if (!updated) return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    const { password: _p, ...pub } = updated;
    await autoSyncToGithub('User unban');
    return NextResponse.json({ success: true, data: pub });
  }

  if (action === 'promote') {
    if (actor.role !== 'owner' && actor.role !== 'co-owner') {
      return NextResponse.json({ success: false, error: 'Only owner/co-owner can promote' }, { status: 403 });
    }
    const roleMap: Record<Role, Role> = {
      user: 'developer', developer: 'admin', admin: 'co-owner',
      'co-owner': 'co-owner', owner: 'owner',
    };
    const newRole = roleMap[target.role] ?? target.role;
    if (newRole === 'co-owner' && actor.role !== 'owner') {
      return NextResponse.json({ success: false, error: 'Only owner can promote to co-owner' }, { status: 403 });
    }
    const updated = updateUser(id, { role: newRole });
    if (!updated) return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    const { password: _p, ...pub } = updated;
    await autoSyncToGithub('Promote user');
    return NextResponse.json({ success: true, data: pub });
  }

  if (action === 'demote') {
    if (actor.role !== 'owner' && actor.role !== 'co-owner') {
      return NextResponse.json({ success: false, error: 'Only owner/co-owner can demote' }, { status: 403 });
    }
    const roleMap: Record<Role, Role> = {
      'co-owner': 'admin', admin: 'developer', developer: 'user', user: 'user', owner: 'owner',
    };
    const newRole = roleMap[target.role] ?? target.role;
    const updated = updateUser(id, { role: newRole });
    if (!updated) return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    const { password: _p, ...pub } = updated;
    await autoSyncToGithub('Demote user');
    return NextResponse.json({ success: true, data: pub });
  }

  if (action === 'setRole') {
    if (actor.role !== 'owner') {
      return NextResponse.json({ success: false, error: 'Only owner can set role directly' }, { status: 403 });
    }
    const validRoles: Role[] = ['user', 'developer', 'admin', 'co-owner'];
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }
    const updated = updateUser(id, { role: body.role });
    if (!updated) return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    const { password: _p, ...pub } = updated;
    await autoSyncToGithub('Set user role');
    return NextResponse.json({ success: true, data: pub });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const actor = getUserById(session.userId);
  if (!actor || (actor.role !== 'owner' && actor.role !== 'co-owner')) {
    return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
  }

  const target = getUserById(id);
  if (!target) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  if (target.role === 'owner') return NextResponse.json({ success: false, error: 'Cannot delete owner' }, { status: 403 });

  const users = getUsers().filter(u => u.id !== id);
  saveUsers(users);
  await autoSyncToGithub('Delete user');
  return NextResponse.json({ success: true, message: 'User deleted' });
}
