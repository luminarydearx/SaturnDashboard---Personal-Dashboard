import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';

/**
 * POST /api/server/restart
 *
 * Triggers a Vercel redeploy of the AutoGen project using the Vercel API.
 * Required env vars (set in Vercel dashboard):
 *   VERCEL_TOKEN              — Personal token from vercel.com/account/tokens
 *   VERCEL_AUTOGEN_PROJECT_ID — Project ID for auto-generator-app
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = getUserById(session.userId);
    if (!user || (user.role !== 'owner' && user.role !== 'co-owner')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const vercelToken = process.env.VERCEL_TOKEN;
    const autoGenProjectId = process.env.VERCEL_AUTOGEN_PROJECT_ID;

    if (!vercelToken || !autoGenProjectId) {
      return NextResponse.json({
        success: false,
        message: 'VERCEL_TOKEN dan VERCEL_AUTOGEN_PROJECT_ID belum diset.',
        missingVars: [
          !vercelToken ? 'VERCEL_TOKEN' : null,
          !autoGenProjectId ? 'VERCEL_AUTOGEN_PROJECT_ID' : null,
        ].filter(Boolean),
      }, { status: 400 });
    }

    // ── FIX: Hapus spasi di URL ──────────────────────────────────────────
    // 1. Get the latest deployment of AutoGen project
    const listUrl = `https://api.vercel.com/v6/deployments?projectId=${autoGenProjectId}&limit=1&state=READY`;
    
    console.log('[AutoGen Restart] Fetching deployments:', listUrl);
    
    const listRes = await fetch(listUrl, {
      headers: { 
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!listRes.ok) {
      const err = await listRes.json().catch(() => ({}));
      console.error('[AutoGen Restart] Failed to list deployments:', {
        status: listRes.status,
        error: err
      });
      
      // Handle specific Vercel API errors
      if (listRes.status === 401 || err?.invalidToken) {
        return NextResponse.json({
          success: false,
          message: 'VERCEL_TOKEN tidak valid. Buat token baru di vercel.com/account/tokens',
        }, { status: 401 });
      }
      if (listRes.status === 403) {
        return NextResponse.json({
          success: false,
          message: 'Token tidak punya akses ke project ini. Pastikan token scope mencakup project AutoGen.',
        }, { status: 403 });
      }
      
      return NextResponse.json({
        success: false,
        message: `Vercel API error: ${err.error?.message || listRes.status}`,
      }, { status: 502 });
    }

    const listData = await listRes.json();
    const latestDeploy = listData.deployments?.[0];

    if (!latestDeploy?.uid) {
      return NextResponse.json({
        success: false,
        message: 'Tidak ada deployment AutoGen yang ditemukan. Deploy manual dulu dari Vercel.',
      }, { status: 404 });
    }

    // 2. Trigger redeploy of that deployment
    // ── FIX: Hapus spasi di akhir URL ────────────────────────────────────
    const redeployUrl = 'https://api.vercel.com/v13/deployments?forceNew=1';
    
    console.log('[AutoGen Restart] Triggering redeploy for:', latestDeploy.uid);

    const redeployRes = await fetch(redeployUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deploymentId: latestDeploy.uid,
        name: latestDeploy.name,
        target: latestDeploy.target || 'production',
      }),
    });

    const redeployData = await redeployRes.json().catch(() => ({}));

    if (!redeployRes.ok) {
      console.error('[AutoGen Restart] Redeploy failed:', {
        status: redeployRes.status,
        error: redeployData
      });
      return NextResponse.json({
        success: false,
        message: `Redeploy gagal: ${redeployData.error?.message || redeployRes.status}`,
      }, { status: 502 });
    }

    console.log('[AutoGen Restart] Redeploy triggered:', redeployData.id || redeployData.uid);

    return NextResponse.json({
      success: true,
      message: 'AutoGen sedang di-redeploy ke Vercel. Selesai dalam ±30 detik.',
      deploymentId: redeployData.id || redeployData.uid,
      url: redeployData.url ? `https://${redeployData.url}` : null,
    });

  } catch (err: any) {
    console.error('[AutoGen Restart] Error:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Internal server error' 
    }, { status: 500 });
  }
}