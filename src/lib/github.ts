interface FileToPush {
  path: string;
  content: string;
}

interface PushOptions {
  token: string;
  owner: string;
  repo: string;
  files: FileToPush[];
  message?: string;
  onProgress?: (percent: number, status: string) => void;
}

async function getFileSha(
  token: string,
  owner: string,
  repo: string,
  filePath: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
      return data.sha || null;
    }
    return null;
  } catch {
    return null;
  }
}

async function pushFile(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  message: string
): Promise<boolean> {
  const sha = await getFileSha(token, owner, repo, filePath);
  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content).toString('base64'),
  };
  if (sha) body.sha = sha;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  return response.ok;
}

export async function pushToGithub(options: PushOptions): Promise<{ success: boolean; pushed: number; errors: string[] }> {
  const { token, owner, repo, files, message = 'SaturnDashboard: data sync', onProgress } = options;
  const errors: string[] = [];
  let pushed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const percent = Math.round(((i) / files.length) * 100);
    onProgress?.(percent, `Pushing ${file.path}...`);

    const success = await pushFile(token, owner, repo, file.path, file.content, message);
    if (success) {
      pushed++;
    } else {
      errors.push(`Failed to push ${file.path}`);
    }

    const donePercent = Math.round(((i + 1) / files.length) * 100);
    onProgress?.(donePercent, success ? `✓ ${file.path}` : `✗ ${file.path}`);
  }

  return { success: errors.length === 0, pushed, errors };
}
