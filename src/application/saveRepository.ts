import type { PlayerProfile } from '../domain/types';

export const SAVE_KEY = 'sms_save_v1';
export const SCHEMA_VERSION = 1;

/** 创建全新档案 */
export function createDefaultProfile(now = Date.now()): PlayerProfile {
  return {
    schemaVersion: SCHEMA_VERSION,
    totalStars: 0,
    unlockedLevels: ['1-1'],
    starsByLevel: {},
    pets: [],
    collectedCards: [],
    achievements: [],
    errorBook: {},
    statsByType: {},
    settings: {
      voice: true, sfx: true, music: true, fontSize: 'normal', dailyMinutes: 0, answerMode: 'choices',
    },
    daily: { date: new Date(now).toISOString().slice(0, 10), answered: 0 },
  };
}

/** 旧版本存档迁移（链式升级）；当前只有 v1 */
export function migrate(raw: unknown): PlayerProfile {
  const base = createDefaultProfile();
  if (typeof raw !== 'object' || raw === null) return base;
  const data = raw as Partial<PlayerProfile>;
  const version = typeof data.schemaVersion === 'number' ? data.schemaVersion : 0;
  // 未来版本在此逐级升级：if (version < 2) { ...; version = 2; }
  void version;
  return {
    ...base,
    ...data,
    schemaVersion: SCHEMA_VERSION,
    settings: { ...base.settings, ...(data.settings ?? {}) },
    daily: { ...base.daily, ...(data.daily ?? {}) },
    errorBook: data.errorBook ?? {},
    statsByType: data.statsByType ?? {},
    unlockedLevels: data.unlockedLevels?.length ? data.unlockedLevels : base.unlockedLevels,
  };
}

/** 结构校验：拒绝明显非法的导入码 */
export function isValidProfile(data: unknown): data is PlayerProfile {
  if (typeof data !== 'object' || data === null) return false;
  const p = data as Partial<PlayerProfile>;
  return (
    typeof p.totalStars === 'number' && p.totalStars >= 0 &&
    Array.isArray(p.unlockedLevels) &&
    typeof p.starsByLevel === 'object' && p.starsByLevel !== null &&
    typeof p.errorBook === 'object' && p.errorBook !== null &&
    typeof p.settings === 'object' && p.settings !== null
  );
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** 加载存档；失败时返回默认档案（降级，不崩） */
export function loadProfile(storage: StorageLike | null): PlayerProfile {
  if (!storage) return createDefaultProfile();
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return createDefaultProfile();
    return migrate(JSON.parse(raw));
  } catch {
    return createDefaultProfile();
  }
}

/** 保存存档；返回是否成功（配额满/隐私模式时降级） */
export function saveProfile(storage: StorageLike | null, profile: PlayerProfile): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

/** 导出为存档码（Base64，Unicode 安全） */
export function exportSaveCode(profile: PlayerProfile): string {
  const json = JSON.stringify(profile);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** 从存档码导入；非法返回 null */
export function importSaveCode(code: string): PlayerProfile | null {
  try {
    const binary = atob(code.trim());
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    return isValidProfile(data) ? migrate(data) : null;
  } catch {
    return null;
  }
}

/** 内存存档实现（localStorage 不可用时的兜底） */
export function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: k => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
  };
}
