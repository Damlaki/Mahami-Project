/**
 * The only file that talks to the device's key-value storage.
 * Swap the implementation here (e.g. to expo-sqlite/kv-store) without touching the rest of the app.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Envelope<T> {
  version: number;
  data: T;
}

export async function readJson<T>(key: string): Promise<Envelope<T> | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== "object" || parsed === null || !("version" in parsed) || !("data" in parsed)) {
    throw new Error(`Storage key "${key}" has an unexpected shape`);
  }
  return parsed as Envelope<T>;
}

export async function writeJson<T>(key: string, version: number, data: T): Promise<void> {
  const envelope: Envelope<T> = { version, data };
  await AsyncStorage.setItem(key, JSON.stringify(envelope));
}
