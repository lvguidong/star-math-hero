import { describe, it, expect } from 'vitest';
import {
  createDefaultProfile, migrate, isValidProfile, loadProfile, saveProfile,
  exportSaveCode, importSaveCode, createMemoryStorage, SAVE_KEY, SCHEMA_VERSION,
} from './saveRepository';

describe('存档仓库', () => {
  it('默认档案结构正确', () => {
    const p = createDefaultProfile(1000);
    expect(p.schemaVersion).toBe(SCHEMA_VERSION);
    expect(p.unlockedLevels).toEqual(['1-1']);
    expect(p.settings.voice).toBe(true);
    expect(p.settings.answerMode).toBe('choices');
    expect(p.daily.date).toBe('1970-01-01');
  });

  it('作答方式设置：旧存档迁移补默认值，输入模式导入往返保留', () => {
    // 旧存档（无 answerMode）迁移后默认四选一
    const legacy = migrate({ totalStars: 3, settings: { sfx: false } });
    expect(legacy.settings.answerMode).toBe('choices');
    expect(legacy.settings.sfx).toBe(false);
    // 显式输入模式通过导出/导入往返保留
    const p = createDefaultProfile();
    p.settings.answerMode = 'input';
    const loaded = importSaveCode(exportSaveCode(p));
    expect(loaded?.settings.answerMode).toBe('input');
  });

  it('内存存档读写往返', () => {
    const s = createMemoryStorage();
    const p = createDefaultProfile();
    p.totalStars = 42;
    expect(saveProfile(s, p)).toBe(true);
    expect(loadProfile(s).totalStars).toBe(42);
    expect(s.getItem(SAVE_KEY)).toContain('42');
  });

  it('坏数据/缺键时降级为默认档案', () => {
    const s = createMemoryStorage();
    s.setItem(SAVE_KEY, '{bad json');
    expect(loadProfile(s).schemaVersion).toBe(SCHEMA_VERSION);
    expect(loadProfile(null).totalStars).toBe(0);
  });

  it('导出/导入存档码（含中文成就名）往返', () => {
    const p = createDefaultProfile();
    p.totalStars = 15;
    p.achievements.push('三星小勇士');
    const code = exportSaveCode(p);
    const loaded = importSaveCode(code);
    expect(loaded?.totalStars).toBe(15);
    expect(loaded?.achievements).toContain('三星小勇士');
  });

  it('非法存档码返回 null', () => {
    expect(importSaveCode('!!!not-base64!!!')).toBeNull();
    expect(importSaveCode(btoa('{"foo":1}'))).toBeNull();
  });

  it('迁移补全缺失字段', () => {
    const m = migrate({ totalStars: 7 });
    expect(m.totalStars).toBe(7);
    expect(m.schemaVersion).toBe(SCHEMA_VERSION);
    expect(m.settings.sfx).toBe(true);
    expect(isValidProfile(m)).toBe(true);
  });
});
