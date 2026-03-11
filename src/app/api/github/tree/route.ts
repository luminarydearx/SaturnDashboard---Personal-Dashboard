import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get('branch');
    
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER;
    const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;

    if (!token || !owner || !repo) {
      return NextResponse.json({ error: 'Missing configuration', tree: [] }, { status: 500 });
    }

    // Jika branch tidak dikirim, gunakan 'master' sebagai default
    const targetBranch = branch || 'master';

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${token}`,
        },
        cache: 'no-store'
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error('[GitHub Tree Error]:', data);
      // Return empty tree instead of error, so UI can fallback
      return NextResponse.json({ tree: [], error: data.message });
    }

    return NextResponse.json({ 
      tree: data.tree || [],
      truncated: data.truncated 
    });

  } catch (err: any) {
    console.error('[GitHub Tree Error]:', err);
    return NextResponse.json({ tree: [], error: 'Internal server error' }, { status: 500 });
  }
}