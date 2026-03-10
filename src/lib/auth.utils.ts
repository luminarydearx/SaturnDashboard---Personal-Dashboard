import type { Role } from '@/types';

const HIERARCHY: Record<Role, number> = {
  owner: 5,
  'co-owner': 4,
  admin: 3,
  developer: 2,
  user: 1,
};

export function canManage(actorRole: Role, targetRole: Role): boolean {
  return (HIERARCHY[actorRole] ?? 0) > (HIERARCHY[targetRole] ?? 0);
}

export function roleColor(role: Role): string {
  switch (role) {
    case 'owner':    return '#f59e0b';
    case 'co-owner': return '#f97316';
    case 'admin':    return '#06b6d4';
    case 'developer':return '#8b5cf6';
    case 'user':     return '#64748b';
    default:         return '#64748b';
  }
}

export function roleBadgeClass(role: Role): string {
  switch (role) {
    case 'owner':    return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'co-owner': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'admin':    return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'developer':return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
    case 'user':     return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    default:         return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

export function roleLabel(role: Role): string {
  switch (role) {
    case 'owner':    return 'Owner';
    case 'co-owner': return 'Co-Owner';
    case 'admin':    return 'Admin';
    case 'developer':return 'Developer';
    case 'user':     return 'User';
    default:         return role;
  }
}
