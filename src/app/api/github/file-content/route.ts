import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');
    const branch = searchParams.get('branch');
    
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER;
    const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;

    if (!token || !owner || !repo || !filePath) {
      return NextResponse.json({ error: 'Missing parameters', content: '' }, { status: 400 });
    }

    // Default ke 'master' jika branch tidak ada
    const targetBranch = branch || 'master';

    const res = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${targetBranch}/${filePath}`,
      {
        headers: {
          'Authorization': `token ${token}`,
        },
        cache: 'no-store'
      }
    );

    if (!res.ok) {
      console.error('[GitHub File Error]: HTTP', res.status, filePath);
      return NextResponse.json({ error: 'Failed to fetch file', content: '' }, { status: res.status });
    }

    const content = await res.text();
    return NextResponse.json({ content });

  } catch (err: any) {
    console.error('[GitHub File Content Error]:', err);
    return NextResponse.json({ error: 'Internal server error', content: '' }, { status: 500 });
  }
}