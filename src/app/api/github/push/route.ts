import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getSettings, saveSettings } from '@/lib/db';
import { pushToGithub } from '@/lib/github';

export async function POST(req: NextRequest) {
  console.log('[GitHub Push API] Request received');
  
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = getUserById(session.userId);
    if (!user || (user.role !== 'owner' && user.role !== 'co-owner')) {
      return NextResponse.json({ success: false, error: 'Owner only' }, { status: 403 });
    }

    const body = await req.json();
    const { repo, owner, files, message, branch } = body;

    let repoOwner = owner;
    let repoName = repo;
    
    if (repo && repo.includes('/') && !owner) {
      [repoOwner, repoName] = repo.split('/');
    }

    if (!repoOwner || !repoName || !files || !Array.isArray(files)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    // ── CRITICAL: Ambil token HANYA dari Env Var ────────────────────────
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      console.error('[GitHub Push API] GITHUB_TOKEN is NOT set in Environment Variables!');
      return NextResponse.json(
        { 
          success: false, 
          error: 'GITHUB_TOKEN not configured in Vercel Environment Variables.',
          hint: 'Go to Vercel Dashboard > Settings > Environment Variables > Add GITHUB_TOKEN'
        }, 
        { status: 500 }
      );
    }

    const targetBranch = branch || 'master';
    console.log(`[GitHub Push API] Pushing to ${repoOwner}/${repoName}#${targetBranch}`);

    const result = await pushToGithub({
      token: githubToken,
      owner: repoOwner,
      repo: repoName,
      files,
      branch: targetBranch,
      message: message || 'SaturnDashboard: data sync',
    });

    if (result.success) {
      const currentSettings = getSettings();
      saveSettings({
        ...currentSettings,
        githubOwner: repoOwner,
        githubRepo: repoName,
        lastPush: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, pushed: result.pushed, errors: [] });
    } else {
      return NextResponse.json({
        success: false,
        pushed: result.pushed,
        errors: result.errors,
        message: result.errors.join(', '),
      }, { status: 500 });
    }

  } catch (err: any) {
    console.error('[GitHub Push API] Unhandled error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}