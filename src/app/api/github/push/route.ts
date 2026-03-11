import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getSettings, saveSettings } from '@/lib/db';
import { pushToGithub } from '@/lib/github';

export async function POST(req: NextRequest) {
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
    
    // ── FIX: Terima format yang dikirim client ─────────────────────
    const { 
      repo,           // Format: "owner/repo" atau pisah owner & repo
      owner,          // Optional: jika repo sudah format "owner/repo"
      files,          // Array: [{ path: string, content: string }]
      message,        // Commit message
      branch,         // Branch name (main/master/dev) - AUTO DETECTED
      token           // Optional: ambil dari settings jika tidak dikirim
    } = body;

    // Parse repo jika format "owner/repo"
    let repoOwner = owner;
    let repoName = repo;
    
    if (repo && repo.includes('/') && !owner) {
      [repoOwner, repoName] = repo.split('/');
    }

    // Validasi field wajib
    if (!repoOwner || !repoName || !files || !Array.isArray(files)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: owner, repo, files' }, 
        { status: 400 }
      );
    }

    // Ambil token dari body atau settings
    const settings = getSettings();
    const githubToken = token || settings.githubToken;
    
    if (!githubToken) {
      return NextResponse.json(
        { success: false, error: 'GitHub token not configured' }, 
        { status: 400 }
      );
    }

    // ── FIX: Gunakan branch dari request atau fallback ke 'main' ───
    const targetBranch = branch || 'main';

    // ── Execute push to GitHub ─────────────────────────────────────
    const result = await pushToGithub({
      token: githubToken,
      owner: repoOwner,
      repo: repoName,
      files,                    // ── FIX: Kirim files array
      branch: targetBranch,     // ── FIX: Kirim branch name
      message: message || 'SaturnDashboard: data sync',
    });

    // Update last push timestamp
    saveSettings({ 
      ...settings, 
      githubToken, 
      githubOwner: repoOwner, 
      githubRepo: repoName, 
      lastPush: new Date().toISOString() 
    });

    return NextResponse.json({
      success: result.success,
      pushed: result.pushed,
      errors: result.errors || [],
      message: result.success ? 'Pushed successfully' : result.errors?.join(', ') || 'Unknown error',
    });

  } catch (err: any) {
    console.error('[GitHub Push API Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' }, 
      { status: 500 }
    );
  }
}