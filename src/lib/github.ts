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
  branch?: string;  // ← TAMBAHKAN: optional branch parameter
  onProgress?: (percent: number, status: string) => void;
}

// ── FIX: Tambahkan parameter branch ───────────────────────────────
async function getFileSha(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
  branch: string = 'main'  // Default ke 'main'
): Promise<string | null> {
  try {
    // ── FIX: Hapus spasi di URL & tambahkan ?ref=branch ─────────
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.sha || null;
    }
    // Jika file belum ada (404), return null agar bisa dibuat baru
    if (response.status === 404) return null;
    
    return null;
  } catch {
    return null;
  }
}

// ── FIX: Tambahkan parameter branch ───────────────────────────────
async function pushFile(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  message: string,
  branch: string = 'main'  // Default ke 'main'
): Promise<boolean> {
  // Dapatkan SHA file yang ada di branch tersebut (untuk update)
  const sha = await getFileSha(token, owner, repo, filePath, branch);
  
  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch,  // ── FIX: Tambahkan branch ke body request GitHub API
  };
  
  // Jika file sudah ada (punya SHA), sertakan untuk update
  if (sha) body.sha = sha;

  // ── FIX: Hapus spasi di URL ────────────────────────────────────
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[GitHub Push Error] ${filePath}:`, err);
    return false;
  }
  return true;
}

export async function pushToGithub(options: PushOptions): Promise<{ success: boolean; pushed: number; errors: string[] }> {
  const { 
    token, 
    owner, 
    repo, 
    files, 
    message = 'SaturnDashboard: data sync', 
    branch = 'main',  // ── FIX: Default branch ke 'main'
    onProgress 
  } = options;
  
  const errors: string[] = [];
  let pushed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const percent = Math.round(((i) / files.length) * 100);
    onProgress?.(percent, `Pushing ${file.path}...`);

    // ── FIX: Kirimkan parameter branch ke pushFile ───────────────
    const success = await pushFile(token, owner, repo, file.path, file.content, message, branch);
    
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