// lib/getOwner.ts
import { PublicUser } from "@/types";
import usersData from "@data/users.json";

/**
 * Mengambil data user dengan role 'owner' dari users.json
 * @returns PublicUser | null
 */
export function getOwner(): PublicUser | null {
  const owner = (usersData as PublicUser[]).find((user) => user.role === "owner");
  return owner || null;
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