'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PublicUser } from '@/types';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  MdCode, MdOpenInNew, MdFolderOpen, MdLock, MdLockOpen,
  MdPlayArrow, MdStop, MdRefresh, MdChevronRight, MdExpandMore,
  MdInsertDriveFile, MdFolder, MdSave, MdClose, MdWarning,
  MdCheckCircle, MdVisibility, MdVisibilityOff,
} from 'react-icons/md';
import { SiGithub } from 'react-icons/si';
import { motion, AnimatePresence } from 'framer-motion';

// ── Constants ─────────────────────────────────────────────────────────────
const AUTOGEN_URL = 'https://saturn-dashboard-yourname.vercel.app'; // Ganti dengan URL Anda
const AUTOGEN_GITHUB = 'https://github.com/luminarydearx/SaturnDashboard---Personal-Dashboard';
const AUTOGEN_REPO_OWNER = 'luminarydearx';
const AUTOGEN_REPO_NAME  = 'SaturnDashboard---Personal-Dashboard';
const GITHUB_TOKEN       = process.env.NEXT_PUBLIC_GITHUB_TOKEN || '';
const FALLBACK_BRANCH    = 'main';

// ── AutoGen Project Path ──────────────────────────────────────────────────
const AUTOGEN_PROJECT_PATH = 'project/AutoGen';

// ── Types ─────────────────────────────────────────────────────────────────
interface FileNode {
  name: string;
  path: string;
  relativePath: string;
  type: 'file' | 'dir';
  content?: string;
  children?: FileNode[];
}

// ── Language detection ────────────────────────────────────────────────────
function getLang(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts:'typescript', tsx:'tsx', js:'javascript', jsx:'jsx',
    css:'css', html:'html', json:'json', md:'markdown',
    yml:'yaml', yaml:'yaml', sh:'bash', env:'bash',
  };
  return map[ext] || 'text';
}

// ── Syntax highlighter ────────────────────────────────────────────────────
function highlight(code: string, lang: string): string {
  let c = code;
  
  if (lang === 'json') {
    c = c
      .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span class="hl-key">$1</span>$2')
      .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="hl-str">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="hl-kw">$1</span>')
      .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="hl-num">$1</span>');
  } else if (['js','javascript','ts','typescript','jsx','tsx'].includes(lang)) {
    c = c
      .replace(/(\/\/.*$)/gm, '<span class="hl-comment">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>')
      .replace(/\b(import|export|from|const|let|var|function|class|return|if|else|for|while|async|await|new|this|typeof|default|extends|interface|type|enum)\b/g, '<span class="hl-kw">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span class="hl-str">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-num">$1</span>');
  } else if (lang === 'css') {
    c = c
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>')
      .replace(/([.#][\w-]+|:[\w-]+|\*|\w+(?=\s*\{))/g, '<span class="hl-sel">$1</span>')
      .replace(/([\w-]+)(\s*:)/g, '<span class="hl-prop">$1</span>$2')
      .replace(/:\s*([^;{]+)/g, ': <span class="hl-str">$1</span>');
  } else if (lang === 'html') {
    c = c
      .replace(/(<!--[\s\S]*?-->)/g, '<span class="hl-comment">$1</span>')
      .replace(/(<\/?)([\w-]+)/g, '$1<span class="hl-kw">$2</span>')
      .replace(/([\w-]+)(=)("(?:[^"\\]|\\.)*")/g, '<span class="hl-prop">$1</span>$2<span class="hl-str">$3</span>');
  }
  
  c = c.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  
  return c;
}

// ── File tree node ────────────────────────────────────────────────────────
function TreeNode({ node, onSelect, selected, depth = 0 }: {
  node: FileNode; onSelect: (n: FileNode) => void;
  selected: string; depth?: number;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isDir = node.type === 'dir';
  const isActive = selected === node.path;

  if (isDir) {
    return (
      <div>
        <button onClick={() => setOpen(p => !p)}
          className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-left hover:bg-white/5 transition-colors text-xs group"
          style={{ paddingLeft: `${8 + depth * 12}px` }}>
          {open ? <MdExpandMore size={12} className="text-[var(--c-muted)] flex-shrink-0" />
                : <MdChevronRight size={12} className="text-[var(--c-muted)] flex-shrink-0" />}
          <MdFolder size={13} className="text-amber-400 flex-shrink-0" />
          <span className="text-[var(--c-text)] truncate font-medium">{node.name}</span>
        </button>
        {open && node.children?.map(ch => (
          <TreeNode key={ch.path} node={ch} onSelect={onSelect} selected={selected} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <button onClick={() => onSelect(node)}
      className="w-full flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-left transition-colors text-xs"
      style={{
        paddingLeft: `${8 + depth * 12}px`,
        background: isActive ? 'rgba(var(--c-accent-rgb),0.15)' : 'transparent',
        color: isActive ? 'var(--c-accent)' : 'var(--c-muted)',
      }}>
      <MdInsertDriveFile size={12} className="flex-shrink-0" />
      <span className="truncate" title={node.relativePath}>{node.name}</span>
    </button>
  );
}

// ── Code editor / viewer ──────────────────────────────────────────────────
function CodePane({ file, onChange, readOnly }: {
  file: FileNode | null;
  onChange: (content: string) => void;
  readOnly?: boolean;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (file?.content !== undefined) setCode(file.content);
  }, [file]);

  const syncScroll = () => {
    if (taRef.current && preRef.current) {
      preRef.current.scrollTop  = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  };

  if (!file) return (
    <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--c-bg)' }}>
      <div className="text-center">
        <MdCode size={40} className="text-[var(--c-muted)] opacity-20 mx-auto mb-3" />
        <p className="text-[var(--c-muted)] text-sm">Select a file to view its code</p>
      </div>
    </div>
  );

  const lang = getLang(file.name);
  const highlighted = highlight(code, lang);
  const lines = code.split('\n');

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0d0d1a' }}>
      {/* File header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b flex-shrink-0"
        style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>
        <MdInsertDriveFile size={14} style={{ color: 'var(--c-accent)' }} />
        <span className="text-[var(--c-text)] text-xs font-mono flex-1 truncate" title={file.relativePath}>
          {file.relativePath}
        </span>
        <span className="text-[var(--c-muted)] text-[10px] font-mono uppercase">{lang}</span>
        <span className="text-[var(--c-muted)] text-[10px]">{lines.length} lines</span>
      </div>
      {/* Editor */}
      <div className="flex-1 overflow-hidden relative font-mono text-xs" style={{ lineHeight: '1.6' }}>
        {/* Line numbers */}
        <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col overflow-hidden pointer-events-none"
          style={{ background: '#080812', borderRight: '1px solid rgba(255,255,255,0.05)', zIndex: 1 }}>
          <div className="overflow-hidden h-full">
            {lines.map((_, i) => (
              <div key={i} className="text-right pr-2 select-none leading-6"
                style={{ color: 'rgba(100,116,139,0.5)', fontSize: 11 }}>{i + 1}</div>
            ))}
          </div>
        </div>
        {/* Highlighted overlay */}
        <pre ref={preRef}
          className="absolute inset-0 overflow-auto"
          style={{
            margin: 0, padding: '0 16px', paddingLeft: '52px', background: 'transparent',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 12, lineHeight: '1.6',
            pointerEvents: 'none', whiteSpace: 'pre', color: '#c9d1d9', zIndex: 2,
          }}
          dangerouslySetInnerHTML={{ __html: highlighted }} />
        {/* Textarea (editing) */}
        {!readOnly && (
          <textarea ref={taRef}
            value={code}
            onChange={e => { setCode(e.target.value); onChange(e.target.value); }}
            onScroll={syncScroll}
            spellCheck={false}
            className="absolute inset-0 overflow-auto resize-none focus:outline-none"
            style={{
              margin: 0, padding: '0 16px', paddingLeft: '52px', background: 'transparent',
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 12, lineHeight: '1.6',
              color: 'transparent', caretColor: '#7c3aed', border: 'none', zIndex: 3,
              whiteSpace: 'pre',
            }} />
        )}
      </div>
      <style>{`
        .hl-kw      { color: #ff7b72; }
        .hl-str     { color: #a5d6ff; }
        .hl-comment { color: #8b949e; font-style: italic; }
        .hl-num     { color: #79c0ff; }
        .hl-key     { color: #e3b341; }
        .hl-prop    { color: #79c0ff; }
        .hl-sel     { color: #f0883e; }
      `}</style>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
interface Props { user: PublicUser }

export default function AutoGenClient({ user }: Props) {
  const [tab,             setTab]             = useState<'preview'|'source'|'editor'>('preview');
  const [iframeKey,       setIframeKey]       = useState(0);
  const [showIframe,      setShowIframe]      = useState(false);
  const [lockdownActive,  setLockdownActive]  = useState(false);
  const [lockdownReason,  setLockdownReason]  = useState('');
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [lockdownLoading, setLockdownLoading] = useState(false);
  const [fileTree,        setFileTree]        = useState<FileNode[]>([]);
  const [selectedFile,    setSelectedFile]    = useState<FileNode | null>(null);
  const [editedContent,   setEditedContent]   = useState<string>('');
  const [saveLoading,     setSaveLoading]     = useState(false);
  const [treeLoading,     setTreeLoading]     = useState(false);
  const [pushing,         setPushing]         = useState(false);
  const [pushStatus,      setPushStatus]      = useState<string>('');
  const [defaultBranch,   setDefaultBranch]   = useState<string>('');
  const [branchLoading,   setBranchLoading]   = useState(true);
  
  const { success, error: toastErr, info } = useToast();

  // Fetch default branch from GitHub API
  const fetchDefaultBranch = useCallback(async () => {
    try {
      const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
      if (GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
      }

      const res = await fetch(`https://api.github.com/repos/${AUTOGEN_REPO_OWNER}/${AUTOGEN_REPO_NAME}`, {
        headers
      });
      
      if (!res.ok) {
        const errData = await res.json();
        console.error('Failed to fetch repo info:', errData);
        throw new Error(errData.message || 'Repo not found');
      }

      const data = await res.json();
      if (data?.default_branch) {
        setDefaultBranch(data.default_branch);
        console.log('✅ Detected default branch:', data.default_branch);
      } else {
        setDefaultBranch(FALLBACK_BRANCH);
      }
    } catch (err: any) {
      console.error('Error detecting branch:', err);
      toastErr(`Failed to detect branch: ${err.message}`);
      setDefaultBranch(FALLBACK_BRANCH);
    } finally {
      setBranchLoading(false);
    }
  }, []);

  // Check lockdown status on mount
  useEffect(() => {
    fetch(`${AUTOGEN_URL}/lockdown.json`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d?.active) { setLockdownActive(true); setLockdownReason(d.reason || ''); } })
      .catch(() => {});
    fetchDefaultBranch();
  }, [fetchDefaultBranch]);

  // Load file tree from GitHub API
  const loadTree = useCallback(async () => {
    if (branchLoading || !defaultBranch) return;
    
    setTreeLoading(true);
    try {
      const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
      if (GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
      }

      const res = await fetch(
        `https://api.github.com/repos/${AUTOGEN_REPO_OWNER}/${AUTOGEN_REPO_NAME}/git/trees/${defaultBranch}?recursive=1`,
        { headers }
      );
      
      const data = await res.json();
      
      if (!res.ok) {
        console.error('GitHub API Error:', data);
        toastErr(`Failed to load tree: ${data.message || 'Unknown error'}`);
        return;
      }

      if (!data.tree) { 
        toastErr('Invalid response from GitHub'); 
        return; 
      }

      // ── DEBUG: Log semua path yang ada ───────────────────────────────
      console.log('📁 Total items from GitHub:', data.tree.length);
      console.log('🔍 Looking for path:', AUTOGEN_PROJECT_PATH);
      
      // Cari path yang mengandung "AutoGen" atau "project"
      const autoGenPaths = data.tree
        .filter((item: any) => 
          item.path.includes('AutoGen') || item.path.includes('project')
        )
        .map((item: any) => item.path)
        .slice(0, 20);
      
      console.log('🎯 Paths yang mengandung AutoGen/project:', autoGenPaths);
      // ─────────────────────────────────────────────────────────────────

      const root: Record<string, FileNode> = {};
      const tree: FileNode[] = [];

      for (const item of data.tree) {
        const parts = item.path.split('/');
        
        // Skip folder yang tidak relevan
        if (parts.some((p: string) => 
          p === 'node_modules' || p === '.git' || p === '.vercel' || 
          p === '.next' || p === 'dist' || p === 'build' || p === '.vscode'
        )) continue;
        
        if (item.type === 'blob') {
          const node: FileNode = { 
            name: parts[parts.length - 1], 
            path: item.path, 
            relativePath: item.path,
            type: 'file', 
            content: '' 
          };
          root[item.path] = node;
        } else if (item.type === 'tree') {
          const node: FileNode = { 
            name: parts[parts.length - 1], 
            path: item.path, 
            relativePath: item.path,
            type: 'dir', 
            children: [] 
          };
          root[item.path] = node;
        }
      }

      // Build parent-child relationships
      for (const [path, node] of Object.entries(root)) {
        const parts = path.split('/');
        if (parts.length === 1) { tree.push(node); continue; }
        const parentPath = parts.slice(0, -1).join('/');
        if (root[parentPath]) {
          root[parentPath].children = root[parentPath].children || [];
          root[parentPath].children!.push(node);
        } else {
          tree.push(node);
        }
      }

      // ── IMPROVED FILTER: Lebih fleksibel ─────────────────────────────
      const possiblePaths = [
        AUTOGEN_PROJECT_PATH,
        'project/AutoGen',
        'project/autogen',
        'AutoGen',
        'autogen',
        'src',
        'app'
      ];
      
      let filteredTree: FileNode[] = [];
      
      for (const targetPath of possiblePaths) {
        const found = tree.filter(node => {
          if (node.path === targetPath) return true;
          if (node.path.startsWith(targetPath + '/')) return true;
          return false;
        });
        
        if (found.length > 0) {
          console.log(`✅ Found files in path: "${targetPath}" (${found.length} items)`);
          
          // Buat relative path
          filteredTree = found.map(node => {
            const relativePath = node.path.replace(targetPath + '/', '');
            return {
              ...node,
              relativePath: relativePath || node.name,
              children: node.children ? node.children.map(child => ({
                ...child,
                relativePath: child.path.replace(targetPath + '/', '')
              })) : undefined
            };
          });
          
          setFileTree(filteredTree.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'dir' ? -1 : 1;
          }));
          
          console.log('✅ AutoGen file tree loaded:', filteredTree.length, 'items');
          info(`Loaded ${filteredTree.length} files from ${targetPath}`);
          setTreeLoading(false);
          return;
        }
      }
      
      // ── FALLBACK: Jika tidak ada yang cocok, tampilkan root ──────────
      console.warn('⚠️ No matching path found. Showing root directory.');
      setFileTree(tree.slice(0, 50).sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
      }));
      info('Showing root directory (AutoGen path not found)');
    } catch (err) { 
      console.error('Failed to fetch file tree:', err);
      toastErr('Failed to fetch file tree'); 
    } finally { 
      setTreeLoading(false); 
    }
  }, [defaultBranch, branchLoading]);

  useEffect(() => {
    if ((tab === 'source' || tab === 'editor') && !branchLoading && defaultBranch) {
      loadTree();
    }
  }, [tab, loadTree, branchLoading, defaultBranch]);

  const loadFileContent = async (node: FileNode) => {
    if (!defaultBranch || node.type === 'dir') return;
    
    if (node.content !== '' && node.content !== undefined) {
      setSelectedFile(node);
      setEditedContent(node.content || '');
      return;
    }
    try {
      const headers: HeadersInit = {};
      if (GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
      }

      const res = await fetch(
        `https://raw.githubusercontent.com/${AUTOGEN_REPO_OWNER}/${AUTOGEN_REPO_NAME}/${defaultBranch}/${node.path}`,
        { headers }
      );
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const text = await res.text();
      const updated = { ...node, content: text };
      setSelectedFile(updated);
      setEditedContent(text);
      setFileTree(prev => updateNodeContent(prev, node.path, text));
    } catch (err) { 
      console.error('Failed to load file:', err);
      toastErr('Failed to load file'); 
    }
  };

  function updateNodeContent(nodes: FileNode[], path: string, content: string): FileNode[] {
    return nodes.map(n => {
      if (n.path === path) return { ...n, content };
      if (n.children) return { ...n, children: updateNodeContent(n.children, path, content) };
      return n;
    });
  }

  // Push to GitHub via API route
  const pushToGitHub = async (files: { path: string; content: string }[], message: string) => {
    if (!defaultBranch) {
      toastErr('Branch not detected yet. Please wait...');
      return;
    }
    
    setPushing(true);
    setPushStatus('Pushing to GitHub…');
    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: `${AUTOGEN_REPO_OWNER}/${AUTOGEN_REPO_NAME}`,
          files,
          message,
          branch: defaultBranch,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setPushStatus('✓ Pushed successfully');
        success('Pushed to GitHub! Vercel will deploy in ~30s');
      } else {
        throw new Error(d.error || 'Push failed');
      }
    } catch (err: any) {
      console.error('Push error:', err);
      toastErr(err.message);
      setPushStatus('Push failed');
    } finally { 
      setPushing(false); 
      setTimeout(() => setPushStatus(''), 4000); 
    }
  };

  const handleLockdown = async () => {
    if (!defaultBranch) {
      toastErr('Branch not detected yet. Please wait...');
      return;
    }
    
    setShowLockConfirm(false);
    setLockdownLoading(true);
    try {
      const lockdownData = JSON.stringify({ 
        active: true, 
        reason: lockdownReason, 
        timestamp: new Date().toISOString() 
      }, null, 2);

      await pushToGitHub([
        { path: 'public/lockdown.json', content: lockdownData },
      ], `🔒 Saturn Dashboard: Lockdown Mode activated — ${lockdownReason || 'No reason given'}`);
      setLockdownActive(true);
    } catch (err: any) {
      toastErr(err.message);
    } finally { 
      setLockdownLoading(false); 
    }
  };

  const handleUnlockdown = async () => {
    if (!defaultBranch) {
      toastErr('Branch not detected yet. Please wait...');
      return;
    }
    
    setShowUnlockConfirm(false);
    setLockdownLoading(true);
    try {
      const unlockData = JSON.stringify({ 
        active: false, 
        reason: '', 
        timestamp: new Date().toISOString() 
      }, null, 2);
      
      await pushToGitHub([
        { path: 'public/lockdown.json', content: unlockData },
      ], `🔓 Saturn Dashboard: Lockdown Mode deactivated`);
      setLockdownActive(false);
      setLockdownReason('');
    } catch (err: any) {
      toastErr(err.message);
    } finally { 
      setLockdownLoading(false); 
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile || !defaultBranch) return;
    setSaveLoading(true);
    try {
      await pushToGitHub([
        { path: selectedFile.path, content: editedContent }
      ], `✏️ AutoGen: Edit ${selectedFile.relativePath}`);
      setFileTree(prev => updateNodeContent(prev, selectedFile.path, editedContent));
      setSelectedFile({ ...selectedFile, content: editedContent });
    } finally { 
      setSaveLoading(false); 
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ minHeight: '80vh' }}>
      {/* ── Header ─ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(var(--c-accent-rgb),0.3), rgba(var(--c-accent2-rgb),0.2))', border: '1px solid rgba(var(--c-accent-rgb),0.2)' }}>
            <MdCode size={24} style={{ color: 'var(--c-accent)' }} />
          </div>
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">AutoGen Editor</h1>
            <p className="text-[var(--c-muted)] text-sm">
              <span className="text-[var(--c-accent)]">project/AutoGen</span>
              <span className="mx-2">•</span>
              <a href={AUTOGEN_URL} target="_blank" rel="noreferrer" className="hover:underline">
                {AUTOGEN_URL.replace('https://', '')}
              </a>
            </p>
          </div>
        </div>

        {/* Status + Lockdown */}
        <div className="flex items-center gap-3 flex-wrap">
          {pushStatus && (
            <span className="text-xs px-3 py-1.5 rounded-full font-mono" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}>
              {pushStatus}
            </span>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: lockdownActive ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
              border: lockdownActive ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(34,197,94,0.3)',
              color: lockdownActive ? '#f87171' : '#4ade80',
            }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: lockdownActive ? '#f87171' : '#4ade80' }} />
            {lockdownActive ? 'LOCKDOWN ACTIVE' : 'ONLINE'}
          </div>

          {lockdownActive ? (
            <button onClick={() => setShowUnlockConfirm(true)} disabled={lockdownLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
              <MdLockOpen size={16} />
              {lockdownLoading ? 'Processing…' : 'Unlock Site'}
            </button>
          ) : (
            <button onClick={() => setShowLockConfirm(true)} disabled={lockdownLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
              <MdLock size={16} />
              {lockdownLoading ? 'Processing…' : 'Lockdown Mode'}
            </button>
          )}

          <a href={AUTOGEN_GITHUB} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
            <SiGithub size={15} />
          </a>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 mb-4 flex-shrink-0 flex-wrap"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', padding: 5, borderRadius: 14 }}>
        {([
          { id: 'preview', label: 'Preview', icon: MdVisibility },
          { id: 'source',  label: 'Source',  icon: MdFolderOpen },
          { id: 'editor',  label: 'Editor',  icon: MdCode },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === id ? 'var(--c-gradient-r)' : 'transparent',
              color: tab === id ? '#fff' : 'var(--c-muted)',
              boxShadow: tab === id ? `0 4px 14px rgba(var(--c-accent-rgb),0.35)` : 'none',
            }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        {/* ── Preview tab ── */}
        {tab === 'preview' && (
          <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex-1 rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', minHeight: 600 }}>
            <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
              style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface2)' }}>
              <div className="flex items-center gap-1.5 flex-1 px-3 py-1.5 rounded-lg text-xs font-mono text-[var(--c-muted)]"
                style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
                <MdOpenInNew size={12} /> {AUTOGEN_URL.replace('https://', '')}
              </div>
              <button onClick={() => { setShowIframe(true); setIframeKey(p => p+1); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all btn-primary">
                <MdPlayArrow size={14} /> Preview
              </button>
              {showIframe && (
                <>
                  <button onClick={() => setIframeKey(p => p+1)}
                    className="p-2 rounded-xl text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors"
                    style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                    <MdRefresh size={15} />
                  </button>
                  <button onClick={() => setShowIframe(false)}
                    className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                    style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
                    <MdStop size={15} />
                  </button>
                </>
              )}
            </div>
            {showIframe ? (
              <iframe
                key={iframeKey}
                src={AUTOGEN_URL}
                className="flex-1 w-full border-0"
                style={{ minHeight: 550 }}
                title="AutoGen Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 py-20">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(var(--c-accent-rgb),0.2), rgba(var(--c-accent2-rgb),0.1))', border: '1px solid rgba(var(--c-accent-rgb),0.2)' }}>
                  <MdVisibility size={36} style={{ color: 'var(--c-accent)' }} />
                </div>
                <div className="text-center">
                  <p className="font-orbitron text-lg font-bold text-[var(--c-text)] mb-2">Live Preview</p>
                  <p className="text-[var(--c-muted)] text-sm">Preview your AutoGen project in realtime</p>
                  <p className="text-[var(--c-muted)] text-xs mt-1 font-mono">{AUTOGEN_URL.replace('https://', '')}</p>
                </div>
                <button onClick={() => { setShowIframe(true); setIframeKey(p => p+1); }} className="btn-primary">
                  <MdPlayArrow size={18} /> Load Preview
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Source / Editor tabs ── */}
        {(tab === 'source' || tab === 'editor') && (
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex-1 rounded-2xl overflow-hidden flex flex-col sm:flex-row"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', minHeight: 600 }}>
            
            {/* File tree sidebar */}
            <div className="w-full sm:w-56 border-b sm:border-b-0 sm:border-r flex flex-col flex-shrink-0"
              style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface2)', height: '100%', maxHeight: 'none' }}>
              <div className="flex items-center gap-2 px-3 py-2.5 border-b flex-shrink-0" style={{ borderColor: 'var(--c-border)' }}>
                <MdFolderOpen size={14} style={{ color: 'var(--c-accent)' }} />
                <span className="text-[var(--c-text)] text-xs font-semibold flex-1 truncate" title="project/AutoGen">
                  AutoGen
                </span>
                <button onClick={loadTree} disabled={treeLoading || branchLoading} className="p-1 rounded hover:bg-white/5 transition-colors">
                  <MdRefresh size={13} className={`text-[var(--c-muted)] ${treeLoading || branchLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 py-1 px-1">
                {branchLoading ? (
                  <p className="text-[var(--c-muted)] text-xs text-center py-6">Detecting branch...</p>
                ) : treeLoading ? (
                  [...Array(8)].map((_, i) => (
                    <div key={i} className="h-5 rounded mb-1 animate-pulse" style={{ background: 'var(--c-border)', margin: '4px 8px' }} />
                  ))
                ) : fileTree.length === 0 ? (
                  <p className="text-[var(--c-muted)] text-xs text-center py-6">No files in project/AutoGen</p>
                ) : fileTree.map(n => (
                  <TreeNode key={n.path} node={n} onSelect={loadFileContent} selected={selectedFile?.path || ''} />
                ))}
              </div>
            </div>

            {/* Code pane */}
            <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 400 }}>
              {tab === 'editor' && selectedFile && (
                <div className="flex items-center justify-end gap-2 px-4 py-2 border-b flex-shrink-0"
                  style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>
                  <span className="text-[var(--c-muted)] text-xs flex-1 truncate" title={selectedFile.relativePath}>
                    Edit & push to GitHub
                  </span>
                  <button onClick={handleSaveFile} disabled={saveLoading || pushing || !defaultBranch}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold btn-primary">
                    {saveLoading || pushing
                      ? <><MdRefresh size={13} className="animate-spin" /> Pushing…</>
                      : <><MdSave size={13} /> Save & Push</>}
                  </button>
                </div>
              )}
              <CodePane file={selectedFile} onChange={setEditedContent} readOnly={tab === 'source'} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lockdown confirm modals ── */}
      {showLockConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--c-surface)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="p-6">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <MdLock className="text-red-500" size={28} />
              </div>
              <h3 className="text-xl font-bold text-[var(--c-text)] text-center mb-2">Activate Lockdown Mode?</h3>
              <p className="text-sm text-[var(--c-muted)] text-center mb-4 font-nunito">
                Your AutoGen website will show a lockdown screen to all visitors. This will push to GitHub and trigger a Vercel deployment.
              </p>
              <div>
                <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-2">Lockdown Reason (shown to visitors)</label>
                <textarea value={lockdownReason} onChange={e => setLockdownReason(e.target.value)}
                  placeholder="e.g. Scheduled maintenance, temporarily unavailable…"
                  rows={3} className="saturn-input resize-none w-full focus:outline-none"
                  style={{ paddingLeft: 16 }} />
              </div>
            </div>
            <div className="flex gap-3 p-4" style={{ background: 'rgba(0,0,0,0.1)' }}>
              <button onClick={() => setShowLockConfirm(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-[var(--c-text)] hover:opacity-80 transition btn-secondary">
                Cancel
              </button>
              <button onClick={handleLockdown} disabled={lockdownLoading || !defaultBranch}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-500 transition flex items-center justify-center gap-2">
                <MdLock size={16} /> {lockdownLoading ? 'Processing…' : !defaultBranch ? 'Detecting...' : 'Activate Lockdown'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <ConfirmModal isOpen={showUnlockConfirm}
        title="Deactivate Lockdown Mode?"
        message="Your AutoGen website will become accessible again for all visitors. This will push to GitHub."
        type="success" confirmText="Unlock Site" cancelText="Cancel"
        onConfirm={handleUnlockdown} onCancel={() => setShowUnlockConfirm(false)} isLoading={lockdownLoading} />
    </div>
  );
}