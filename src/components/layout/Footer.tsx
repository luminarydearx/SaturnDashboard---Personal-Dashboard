import Image from 'next/image';
import { IoRocketSharp } from 'react-icons/io5';

export default function Footer() {
  return (
    <footer className="border-t py-4 px-6 mt-auto" style={{ background:'var(--navbar-bg)', borderColor:'var(--c-border)' }}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Saturn" width={16} height={16} />
          <span className="font-orbitron text-xs text-[var(--c-muted)] tracking-wider">SATURN DASHBOARD</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--c-muted)] text-xs font-nunito">
          <IoRocketSharp size={11} />
          <span>Built with ✨ by Dearly Febriano Irwansyah &copy; {new Date().getFullYear()}</span>
        </div>
        <span className="text-[var(--c-muted)] text-xs font-mono opacity-50">v1.0.0</span>
      </div>
    </footer>
  );
}
