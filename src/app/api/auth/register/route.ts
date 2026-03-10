import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getUsers, saveUsers, getUserByUsername, getUserByEmail } from '@/lib/db';
import { createToken, setSessionCookie } from '@/lib/auth';
import type { User } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, firstName, lastName, email, phone } = body;

    if (!username || !password || !firstName || !lastName || !email) {
      return NextResponse.json({ success: false, error: 'Required fields missing' }, { status: 400 });
    }

    if (username.length < 3) {
      return NextResponse.json({ success: false, error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (getUserByUsername(username)) {
      return NextResponse.json({ success: false, error: 'Username already taken' }, { status: 409 });
    }

    if (getUserByEmail(email)) {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const newUser: User = {
      id: uuidv4(),
      username: username.trim().toLowerCase(),
      displayName: `${firstName} ${lastName}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || '',
      bio: '',
      avatar: '',
      role: 'user',
      password: hashed,
      banned: false,
      createdAt: now,
      updatedAt: now,
    };

    const users = getUsers();
    users.push(newUser);
    saveUsers(users);

    const token = await createToken({ userId: newUser.id, role: newUser.role, username: newUser.username });
    await setSessionCookie(token);

    const { password: _p, ...publicUser } = newUser;
    return NextResponse.json({ success: true, data: publicUser });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
