'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface SavingOverlayProps {
  visible: boolean;
  message?: string;
  submessage?: string;
}

export default function SavingOverlay({
  visible,
  message = 'Saving…',
  submessage,
}: SavingOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="flex flex-col items-center gap-5 px-10 py-8 rounded-2xl shadow-2xl"
            style={{
              background: 'var(--dropdown-bg)',
              border: '1px solid var(--c-border)',
              minWidth: 220,
            }}
          >
            {/* Saturn-rings spinner */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute w-16 h-16 rounded-full border-2 border-violet-500/15" />
              <div className="absolute w-16 h-16 rounded-full border-t-2 border-r-2 border-violet-500 animate-spin" />
              <div
                className="absolute w-10 h-10 rounded-full border-t-2 border-cyan-400 animate-spin"
                style={{ animationDirection: 'reverse', animationDuration: '0.65s' }}
              />
              <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg shadow-violet-500/50" />
            </div>

            {/* Text */}
            <div className="text-center">
              <p className="font-orbitron font-bold text-sm tracking-wider text-[var(--c-text)]">
                {message}
              </p>
              {submessage && (
                <p className="text-[var(--c-muted)] text-xs mt-1.5 font-nunito leading-snug">
                  {submessage}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
