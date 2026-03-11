import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getSession } from '@/lib/auth';
import { getUserById, getUsers, getUserByUsername, getUserByEmail, saveUsers } from '@/lib/db';
import { autoSyncToGithub } from '@/lib/github-auto';
import type { User, Role } from '@/types';

/** GET /api/users */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const currentUser = getUserById(session.userId);
    if (!currentUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    // Allow owner, co-owner and admin to list users
    const allowed = ['owner', 'co-owner', 'admin'];
    if (!allowed.includes(currentUser.role)) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const safeUsers = getUsers().map(({ password: _pw, ...rest }) => rest);
    return NextResponse.json({ success: true, data: safeUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/users — owner/co-owner creates a new user */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const actor = getUserById(session.userId);
    if (!actor || (actor.role !== 'owner' && actor.role !== 'co-owner')) {
      return NextResponse.json({ success: false, error: 'Only owner/co-owner can create accounts' }, { status: 403 });
    }

    const body = await req.json();
    const { username, password, firstName, lastName, email, phone, role, bio, avatar, displayName } = body;

    if (!username || !password || !email)
      return NextResponse.json({ success: false, error: 'Username, password and email are required' }, { status: 400 });
    if (username.length < 3)
      return NextResponse.json({ success: false, error: 'Username min 3 chars' }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ success: false, error: 'Password min 6 chars' }, { status: 400 });
    if (getUserByUsername(username))
      return NextResponse.json({ success: false, error: 'Username already taken' }, { status: 409 });
    if (getUserByEmail(email))
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 409 });

    // ── Role whitelist ─────────────────────────────────────────────────
    // Only owner can create co-owner; co-owner can create up to admin
    const baseAllowed: Role[] = ['user', 'developer', 'admin'];
    const ownerAllowed: Role[] = ['user', 'developer', 'admin', 'co-owner'];
    const allowed = actor.role === 'owner' ? ownerAllowed : baseAllowed;
    const assignedRole: Role = allowed.includes(role as Role) ? (role as Role) : 'user';

    const hashed = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const newUser: User = {
      id: uuidv4(),
      username: username.trim().toLowerCase(),
      displayName: displayName?.trim() || `${firstName || ''} ${lastName || ''}`.trim() || username,
      firstName: (firstName || '').trim(),
      lastName: (lastName || '').trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || '').trim(),
      bio: (bio || '').trim(),
      avatar: avatar || '',
      role: assignedRole,
      password: hashed,
      banned: false,
      createdAt: now,
      updatedAt: now,
    };

    const users = getUsers();
    users.push(newUser);
    saveUsers(users);

    await autoSyncToGithub(`Add user: ${newUser.username}`);

    const { password: _p, ...pub } = newUser;
    return NextResponse.json({ success: true, data: pub });
  } catch (err) {
    console.error('Create user error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
