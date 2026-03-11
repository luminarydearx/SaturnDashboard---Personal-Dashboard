import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER;
    const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;

    console.log('[GitHub API] Config check:', {
      hasToken: !!token,
      tokenLength: token?.length,
      owner,
      repo
    });

    if (!token || !owner || !repo) {
      console.error('[GitHub Config Error]: Missing environment variables');
      return NextResponse.json(
        { error: 'GitHub configuration missing', details: { hasToken: !!token, owner, repo } }, 
        { status: 500 }
      );
    }

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`, // Gunakan 'token' bukan 'Bearer' untuk classic tokens
      },
      cache: 'no-store'
    });

    const responseData = await res.json();
    console.log('[GitHub API] Response status:', res.status, responseData);

    if (!res.ok) {
      return NextResponse.json(
        { error: responseData.message || 'Failed to fetch repository info', status: res.status }, 
        { status: res.status }
      );
    }

    return NextResponse.json({
      default_branch: responseData.default_branch,
      name: responseData.name,
      full_name: responseData.full_name,
      private: responseData.private,
    });

  } catch (err: any) {
    console.error('[GitHub Repo Info Error]:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message }, 
      { status: 500 }
    );
  }
}