/**
 * Dismissed In-App Messages Storage
 *
 * Tracks which message IDs the user has dismissed.
 * Uses AsyncStorage with FIFO eviction at 50 entries.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@bundlenudge:dismissed_messages";
const MAX_DISMISSED = 50;

export async function isDismissed(messageId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ids = JSON.parse(raw) as string[];
    return ids.includes(messageId);
  } catch {
    return false;
  }
}

export async function addDismissedMessage(messageId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (ids.includes(messageId)) return;
    ids.push(messageId);
    // FIFO eviction
    while (ids.length > MAX_DISMISSED) {
      ids.shift();
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage failure is non-critical
  }
}

export async function clearDismissedMessages(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
