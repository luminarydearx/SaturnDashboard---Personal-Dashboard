export type Role = 'owner' | 'co-owner' | 'admin' | 'developer' | 'user';

export interface User {
  id: string;
  username: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  avatar: string;
  role: Role;
  password: string;
  banned: boolean;
  bannedBy?: string;
  bannedAt?: string;
  bannedReason?: string;
  bannedByDisplayName?: string;
  bannedByRole?: Role;
  createdAt: string;
  updatedAt: string;
}

export type PublicUser = Omit<User, 'password'>;

export interface Note {
  id: string;
  title: string;
  content: string;
  images: string[];
  authorId: string;
  authorName: string;
  authorRole: Role;
  hidden: boolean;
  hiddenBy?: string;
  pinned?: boolean;
  done?: boolean;
  doneAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  color: string;
}

export interface BackupEntry {
  id: string;
  name: string;
  createdAt: string;
  size?: number;
  type: 'local' | 'github' | 'manual';
  createdBy: string;
}

export interface AppData {
  users: User[];
  notes: Note[];
  settings: {
    // githubToken removed — use process.env.GITHUB_TOKEN only
    githubRepo: string;
    githubOwner: string;
    lastPush: string;
  };
}

export interface AuthSession {
  userId: string;
  role: Role;
  username: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
}

export interface GithubPushPayload {
  token: string;
  owner: string;
  repo: string;
  files: {
    path: string;
    content: string;
  }[];
  message: string;
}
