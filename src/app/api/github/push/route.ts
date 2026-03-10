import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getRawDataFiles, getSettings, saveSettings } from '@/lib/db';
import { pushToGithub } from '@/lib/github';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const user = getUserById(session.userId);
  if (!user || user.role !== 'owner') {
    return new Response('Owner only', { status: 403 });
  }

  const body = await req.json();
  const { token, owner, repo, message } = body;

  if (!token || !owner || !repo) {
    return new Response('Missing fields', { status: 400 });
  }

  // Save settings
  const settings = getSettings();
  saveSettings({ ...settings, githubToken: token, githubOwner: owner, githubRepo: repo, lastPush: '' });

  const files = getRawDataFiles();

  // SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const result = await pushToGithub({
          token,
          owner,
          repo,
          files,
          message: message || 'SaturnDashboard: data sync',
          onProgress: (percent, log) => {
            send({ progress: percent, log });
          },
        });

        // Update last push timestamp
        saveSettings({ ...getSettings(), lastPush: new Date().toISOString() });

        send({
          done: true,
          success: result.success,
          pushed: result.pushed,
          errors: result.errors,
          error: result.errors.join(', '),
          progress: 100,
        });
      } catch (err) {
        send({ done: true, success: false, error: String(err), progress: 100 });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
