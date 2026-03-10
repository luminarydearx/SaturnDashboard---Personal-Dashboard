'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PublicUser, Note } from '@/types';
import { roleBadgeClass } from '@/lib/auth.utils';
import { MdNotes, MdPeople, MdVisibilityOff, MdArrowForward, MdTask } from 'react-icons/md';
import { IoRocketSharp, IoStar } from 'react-icons/io5';
import { formatDistanceToNow } from 'date-fns';

interface DashboardHomeProps {
  user: PublicUser;
  stats: {
    totalNotes: number;
    myNotes: number;
    totalUsers: number;
    activeUsers: number;
    hiddenNotes: number;
  };
  recentNotes: Note[];
}

const STAT_CARDS = [
  { label: 'Total Notes', key: 'totalNotes' as const, icon: MdNotes, color: 'from-violet-600/20 to-violet-500/5', iconColor: 'text-violet-400', border: 'border-violet-500/20' },
  { label: 'All Notes', key: 'myNotes' as const, icon: MdTask, color: 'from-cyan-600/20 to-cyan-500/5', iconColor: 'text-cyan-400', border: 'border-cyan-500/20' },
  { label: 'Total Users', key: 'totalUsers' as const, icon: MdPeople, color: 'from-pink-600/20 to-pink-500/5', iconColor: 'text-pink-400', border: 'border-pink-500/20' },
  { label: 'Hidden Notes', key: 'hiddenNotes' as const, icon: MdVisibilityOff, color: 'from-amber-600/20 to-amber-500/5', iconColor: 'text-amber-400', border: 'border-amber-500/20' },
];

export default function DashboardHome({ user, stats, recentNotes }: DashboardHomeProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome banner */}
      <div className="relative glass-strong border border-white/10 rounded-3xl p-6 md:p-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-cyan-600/10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-20 w-40 h-40 bg-cyan-600/5 rounded-full blur-2xl" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 to-cyan-600">
              {user.avatar ? (
                <Image src={user.avatar} alt={user.displayName} width={64} height={64} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                  {(user.displayName || user.username)[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-space-900" />
          </div>
          <div className="flex-1">
            <p className="text-slate-400 text-sm font-nunito">{greeting} 👋</p>
            <h2 className="font-orbitron text-2xl md:text-3xl font-bold text-white mt-1">
              {user.displayName || user.username}
            </h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-slate-500 text-sm font-mono">@{user.username}</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${roleBadgeClass(user.role)}`}>
                {user.role}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IoRocketSharp className="text-violet-400" size={20} />
            <span className="text-slate-400 text-sm font-nunito">Ready to launch?</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = stats[card.key];
          return (
            <div key={card.key}
              className={`glass border ${card.border} rounded-2xl p-5 bg-gradient-to-br ${card.color} transition-all hover:scale-[1.02] hover:shadow-lg`}>
              <div className="flex items-start justify-between mb-3">
                <Icon size={24} className={card.iconColor} />
                <IoStar size={14} className="text-slate-700" />
              </div>
              <p className="font-orbitron text-3xl font-bold text-white">{value}</p>
              <p className="text-slate-500 text-xs mt-1 font-nunito">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Notes */}
      <div className="glass border border-white/8 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h3 className="font-orbitron text-sm font-semibold text-white">Recent Notes</h3>
          <Link href="/dashboard/notes"
            className="flex items-center gap-1 text-violet-400 hover:text-violet-300 text-xs font-semibold transition-colors">
            View all <MdArrowForward size={14} />
          </Link>
        </div>
        {recentNotes.length === 0 ? (
          <div className="text-center py-12">
            <MdNotes size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-nunito">No notes yet. Create your first note!</p>
            <Link href="/dashboard/notes" className="btn-primary mt-4 inline-flex">
              Create Note
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentNotes.map((note) => (
              <div key={note.id} className="flex items-center gap-4 p-4 hover:bg-white/3 transition-colors">
                <div className={`w-1 h-10 rounded-full flex-shrink-0 ${
                  note.color === 'violet' ? 'bg-violet-500' :
                  note.color === 'cyan' ? 'bg-cyan-500' :
                  note.color === 'pink' ? 'bg-pink-500' :
                  note.color === 'amber' ? 'bg-amber-500' :
                  note.color === 'teal' ? 'bg-teal-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{note.title}</p>
                  <p className="text-slate-500 text-xs">@{note.authorName} · {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize hidden sm:block ${roleBadgeClass(note.authorRole)}`}>
                  {note.authorRole}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
