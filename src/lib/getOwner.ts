import { PublicUser } from "@/types";

/**
 * Mengambil data user dengan role 'owner' dari users.json
 * @returns PublicUser | null
 */
export function getOwner(): PublicUser | null {
  try {
    // ✅ FIX: Gunakan require() untuk dynamic import JSON
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const usersData = require('@/data/users.json');
    
    const owner = (usersData as PublicUser[]).find((user: PublicUser) => user.role === "owner");
    return owner || null;
  } catch (error) {
    console.error('Failed to load owner from users.json:', error);
    return null;
  }
}

/**
 * Helper untuk mendapatkan email owner dengan fallback
 */
export function getOwnerEmail(fallback = "owner@saturndashboard.com"): string {
  const owner = getOwner();
  return owner?.email || fallback;
}

/**
 * Helper untuk mendapatkan phone owner dalam format internasional (+62)
 */
export function getOwnerPhone(fallback = "Contact via admin panel"): string {
  const owner = getOwner();
  if (!owner?.phone) return fallback;
  
  const cleaned = owner.phone.replace(/\D/g, "");
  if (cleaned.startsWith("62")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+62${cleaned.slice(1)}`;
  return `+62${cleaned}`;
}