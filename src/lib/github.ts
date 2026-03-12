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
  branch?: string;
  onProgress?: (percent: number, status: string) => void;
}

async function getFileSha(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
  branch: string = 'master'
): Promise<string | null> {
  try {
    // ✅ FIX: URL tanpa spasi, query param ?ref=branch
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
    
    const response = await fetch(url, {
      headers: {
        // ✅ FIX: Gunakan 'token' untuk classic PAT
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.sha || null;
    }
    
    if (response.status === 404) {
      // File belum ada, return null agar bisa dibuat baru
      return null;
    }
    
    const errText = await response.text();
    console.error(`[getFileSha] ${filePath}: HTTP ${response.status} - ${errText}`);
    return null;
  } catch (err: any) {
    console.error(`[getFileSha] Exception ${filePath}:`, err);
    return null;
  }
}

async function pushFile(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  message: string,
  branch: string = 'master'
): Promise<boolean> {
  try {
    const sha = await getFileSha(token, owner, repo, filePath, branch);
    
    const body: Record<string, any> = {
      message,
      content: Buffer.from(content).toString('base64'),
      branch, // GitHub API butuh branch di body
    };
    
    if (sha) body.sha = sha;

    // ✅ FIX: URL tanpa spasi
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    console.log(`[pushFile] ${filePath} -> ${url} (branch: ${branch}, hasSha: ${!!sha})`);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[pushFile] FAILED ${filePath}: HTTP ${response.status} - ${err}`);
      return false;
    }
    
    console.log(`[pushFile] SUCCESS ${filePath}`);
    return true;
  } catch (err: any) {
    console.error(`[pushFile] EXCEPTION ${filePath}:`, err);
    return false;
  }
}

export async function pushToGithub(options: PushOptions): Promise<{ success: boolean; pushed: number; errors: string[] }> {
  const { 
    token, 
    owner, 
    repo, 
    files, 
    message = 'SaturnDashboard: data sync', 
    branch = 'master',
    onProgress 
  } = options;
  
  console.log(`[pushToGithub] Start: ${owner}/${repo}#${branch} (${files.length} files)`);
  
  const errors: string[] = [];
  let pushed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const percent = Math.round(((i) / files.length) * 100);
    onProgress?.(percent, `Pushing ${file.path}...`);

    const success = await pushFile(token, owner, repo, file.path, file.content, message, branch);
    
    if (success) {
      pushed++;
    } else {
      errors.push(`Failed to push ${file.path}`);
    }

    const donePercent = Math.round(((i + 1) / files.length) * 100);
    onProgress?.(donePercent, success ? `✓ ${file.path}` : `✗ ${file.path}`);
  }

  const result = { success: errors.length === 0, pushed, errors };
  console.log('[pushToGithub] Done:', result);
  return result;
}