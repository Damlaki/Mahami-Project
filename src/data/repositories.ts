/**
 * Data-access layer. Screens and state never import storage directly — they use
 * these repositories. In Phase 4 a Supabase-backed TaskRepository will implement
 * the same interface, so the UI won't need to change.
 */
import { isTask } from "../domain/task";
import type { Task } from "../domain/task";
import { sanitizePreferences } from "../domain/preferences";
import type { Preferences } from "../domain/preferences";
import { readJson, writeJson } from "./storage";

export interface TaskRepository {
  load(): Promise<Task[]>;
  save(tasks: readonly Task[]): Promise<void>;
}

export interface PreferencesRepository {
  load(defaults: Preferences): Promise<Preferences>;
  save(prefs: Preferences): Promise<void>;
}

const TASKS_KEY = "mahami:tasks";
const TASKS_VERSION = 1;
const PREFS_KEY = "mahami:preferences";
const PREFS_VERSION = 1;

export const localTaskRepository: TaskRepository = {
  async load() {
    const stored = await readJson<unknown>(TASKS_KEY);
    if (stored === null) return [];
    // Future schema upgrades go here: if (stored.version === 1) { ...migrate... }
    if (!Array.isArray(stored.data)) return [];
    return stored.data.filter(isTask);
  },
  async save(tasks) {
    await writeJson(TASKS_KEY, TASKS_VERSION, tasks);
  },
};

export const localPreferencesRepository: PreferencesRepository = {
  async load(defaults) {
    const stored = await readJson<unknown>(PREFS_KEY);
    return stored === null ? defaults : sanitizePreferences(stored.data, defaults);
  },
  async save(prefs) {
    await writeJson(PREFS_KEY, PREFS_VERSION, prefs);
  },
};
