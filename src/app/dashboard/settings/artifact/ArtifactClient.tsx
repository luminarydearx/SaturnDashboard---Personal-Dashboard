"use client";

import { PublicUser } from "@/types";
import { MdApps, MdCode, MdAdd } from "react-icons/md";
import { useToast } from "@/components/ui/Toast";

interface Props {
  user: PublicUser;
}

/**
 * Artifact — placeholder component.
 * Customize this file to add your own artifact/widget features.
 * The UI shell is set up; just add your content below.
 */
export default function ArtifactClient({ user }: Props) {
  const { success, error } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      success("Copied to clipboard!");
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600/30 to-cyan-600/30 border border-violet-500/20 flex items-center justify-center">
          <MdApps size={24} className="text-violet-400" />
        </div>
        <div>
          <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">
            Artifact
          </h1>
          <p className="text-[var(--c-muted)] text-sm">
            Custom widgets &amp; components
          </p>
        </div>
      </div>

      {/* Placeholder content area */}
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: "var(--c-surface)",
          border: "2px dashed var(--c-border)",
        }}
      >
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
          <MdCode size={32} className="text-violet-400/60" />
        </div>
        <h2 className="font-orbitron text-lg font-bold text-[var(--c-text)] mb-2">
          Ready to build
        </h2>
        <p className="text-[var(--c-muted)] text-sm mb-6 max-w-md mx-auto">
          This is your blank canvas. Open{" "}
          <code
            onClick={() => copyToClipboard("src/app/dashboard/settings/artifact/ArtifactClient.tsx")}
           className="text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded text-xs cursor-pointer"
           title="Click to copy file path!"
           >
            src/app/dashboard/settings/artifact/ArtifactClient.tsx
          </code>{" "}
          and start adding your custom components here.
        </p>
        <div className="flex flex-wrap gap-3 justify-center text-xs text-[var(--c-muted)]">
          <span
            className="px-3 py-1.5 rounded-full"
            style={{
              background: "var(--c-surface2)",
              border: "1px solid var(--c-border)",
            }}
          >
            Logged in as @{user.username}
          </span>
          <span
            className="px-3 py-1.5 rounded-full"
            style={{
              background: "var(--c-surface2)",
              border: "1px solid var(--c-border)",
            }}
          >
            Role: {user.role}
          </span>
        </div>
      </div>

      {/* How to add content hint */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
        }}
      >
        <p className="text-[var(--c-muted)] text-xs font-semibold uppercase tracking-widest mb-3">
          How to add your own content
        </p>
        <div className="space-y-2 text-sm text-[var(--c-muted)]">
          <p>
            1. Open{" "}
            <code
              onClick={() => copyToClipboard("src/app/dashboard/settings/artifact/ArtifactClient.tsx")}
              className="text-cyan-400 text-xs cursor-pointer"
              title="Click to copy file path!"
            >
              ArtifactClient.tsx
            </code>{" "}
            in this directory
          </p>
          <p>2. Replace the placeholder with your React components</p>
          <p>
            3. The <code
              onClick={() => copyToClipboard("src/app/dashboard/settings/artifact/ArtifactClient.tsx")}
              className="text-cyan-400 text-xs cursor-pointer"
              title="Click to copy file path!"
            >
              user
            </code>{" "}
            prop gives you access to the current user&apos;s data
          </p>
          <p>
            4. Use <code
              onClick={() => copyToClipboard("src/app/dashboard/settings/artifact/ArtifactClient.tsx")}
              className="text-cyan-400 text-xs cursor-pointer"
              title="Click to copy file path!"
            >
              fetch()
            </code>{" "}
            to call any <code
              onClick={() => copyToClipboard("src/app/dashboard/settings/artifact/ArtifactClient.tsx")}
              className="text-cyan-400 text-xs cursor-pointer"
              title="Click to copy this text!"
            >
              /api/*
            </code>{" "}
            route
          </p>
        </div>
      </div>
    </div>
  );
}
