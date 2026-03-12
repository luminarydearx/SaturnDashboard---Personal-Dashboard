import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getSettings, saveSettings } from '@/lib/db';
import { pushToGithub } from '@/lib/github';

export async function POST(req: NextRequest) {
  console.log('[GitHub Push API] Request received');
  
  try {
    const session = await getSession();
    if (!session) {
      console.warn('[GitHub Push API] Unauthorized');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = getUserById(session.userId);
    if (!user || (user.role !== 'owner' && user.role !== 'co-owner')) {
      console.warn('[GitHub Push API] Forbidden:', user?.role);
      return NextResponse.json({ success: false, error: 'Owner only' }, { status: 403 });
    }

    const body = await req.json();
    console.log('[GitHub Push API] Request body:', {
      repo: body.repo,
      branch: body.branch,
      filesCount: body.files?.length,
      message: body.message
    });
    
    const { 
      repo,
      owner,
      files,
      message,
      branch,
      // token dari body diabaikan karena kita paksa pakai ENV
    } = body;

    // Parse repo
    let repoOwner = owner;
    let repoName = repo;
    
    if (repo && repo.includes('/') && !owner) {
      [repoOwner, repoName] = repo.split('/');
    }

    // Validasi
    if (!repoOwner || !repoName || !files || !Array.isArray(files)) {
      console.error('[GitHub Push API] Missing fields:', { repoOwner, repoName, files: !!files, isArray: Array.isArray(files) });
      return NextResponse.json(
        { success: false, error: 'Missing required fields: owner, repo, files' }, 
        { status: 400 }
      );
    }

    // ── FIX: PAKSA AMBIL TOKEN DARI ENVIRONMENT VARIABLE SAJA ────────────
    // Token dari UI/Settings (settings.githubToken) TIDAK AKAN DIPAKAI di sini.
    // Ini menjamin production selalu pakai token yang aman di Vercel Dashboard.
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      console.error('[GitHub Push API] CRITICAL: GITHUB_TOKEN environment variable is missing!');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Server configuration error: GITHUB_TOKEN not set in Environment Variables.',
          hint: 'Please add GITHUB_TOKEN to your Vercel Project Settings > Environment Variables.'
        }, 
        { status: 500 }
      );
    }

    const targetBranch = branch || 'master';
    console.log(`[GitHub Push API] Pushing to ${repoOwner}/${repoName}#${targetBranch} (Token source: ENV)`);

    // Execute push
    const result = await pushToGithub({
      token: githubToken,
      owner: repoOwner,
      repo: repoName,
      files,
      branch: targetBranch,
      message: message || 'SaturnDashboard: data sync',
    });

    console.log('[GitHub Push API] Result:', result);

    // Update metadata only — saveSettings will strip githubToken automatically
    const currentSettings = getSettings();
    saveSettings({
      ...currentSettings,
      githubOwner: repoOwner,
      githubRepo:  repoName,
      lastPush:    new Date().toISOString(),
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        pushed: result.pushed,
        errors: [],
        message: 'Pushed successfully',
      });
    } else {
      return NextResponse.json({
        success: false,
        pushed: result.pushed,
        errors: result.errors,
        message: result.errors?.join(', ') || 'Push failed',
      }, { status: 500 });
    }

  } catch (err: any) {
    console.error('[GitHub Push API] Unhandled error:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: err.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      }, 
      { status: 500 }
    );
  }
}