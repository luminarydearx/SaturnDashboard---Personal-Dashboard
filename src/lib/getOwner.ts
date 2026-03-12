import { PublicUser } from "@/types";

/**
 * Mengambil data user dengan role 'owner' dari users.json
 * @returns Promise<PublicUser | null>
 * @note Fungsi ini sekarang async karena fetch ke API
 */
export async function getOwner(): Promise<PublicUser | null> {
  try {
    // Fetch ke API route server-side
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/owner`, { cache: 'no-store' });
    
    if (!res.ok) return null;
    
    const { data } = await res.json();
    return data || null;
  } catch (error) {
    console.error('Failed to load owner:', error);
    return null;
  }
}

/**
 * Helper untuk mendapatkan email owner dengan fallback
 */
export async function getOwnerEmail(fallback = "owner@saturndashboard.com"): Promise<string> {
  const owner = await getOwner();
  return owner?.email || fallback;
}

/**
 * Helper untuk mendapatkan phone owner dalam format internasional (+62)
 */
export async function getOwnerPhone(fallback = "Contact via admin panel"): Promise<string> {
  const owner = await getOwner();
  if (!owner?.phone) return fallback;
  
  const cleaned = owner.phone.replace(/\D/g, "");
  if (cleaned.startsWith("62")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+62${cleaned.slice(1)}`;
  return `+62${cleaned}`;
}