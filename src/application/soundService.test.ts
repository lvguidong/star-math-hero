import { describe, it, expect, vi } from 'vitest';
import { SoundService, VOICE_LINES } from './soundService';
import { createDefaultProfile } from './saveRepository';

function fakeWindow(withAudio = true) {
  const started: number[] = [];
  const ctx = {
    state: 'running', currentTime: 0, destination: {},
    resume: vi.fn(async () => {}),
    createOscillator: () => ({
      type: 'sine', frequency: { value: 0 }, connect: vi.fn(),
      start: (t: number) => started.push(t), stop: vi.fn(),
    }),
    createGain: () => ({
      gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    }),
  };
  const speech = { speak: vi.fn(), cancel: vi.fn() };
  const w = withAudio ? { AudioContext: function () { return ctx; } } : {};
  return { w, ctx, speech, started };
}

describe('声音服务', () => {
  it('音效开关：关闭时不产生振荡器', () => {
    const { w, started } = fakeWindow();
    const s = createDefaultProfile().settings;
    const svc = new SoundService({ ...s, sfx: false }, { window: w });
    svc.playSfx('correct');
    expect(started.length).toBe(0);
  });

  it('开启音效时创建振荡器并调度包络', () => {
    const { w, started } = fakeWindow();
    const svc = new SoundService(createDefaultProfile().settings, { window: w });
    svc.playSfx('correct');
    expect(started.length).toBe(2); // correct 由 2 个 tone 组成
  });

  it('无 AudioContext 环境静默降级不抛错', () => {
    const { w } = fakeWindow(false);
    const svc = new SoundService(createDefaultProfile().settings, { window: w });
    expect(() => svc.playSfx('star')).not.toThrow();
  });

  it('语音朗读受 voice 开关控制，朗读中文鼓励语', () => {
    const { w, speech } = fakeWindow();
    const s = createDefaultProfile().settings;
    const svc = new SoundService({ ...s, voice: false }, { window: w, speech });
    svc.speak('你好');
    expect(speech.speak).not.toHaveBeenCalled();
    svc.updateSettings({ ...s, voice: true });
    svc.speak(VOICE_LINES.welcome);
    expect(speech.speak).toHaveBeenCalledWith(VOICE_LINES.welcome);
    svc.stopVoice();
    expect(speech.cancel).toHaveBeenCalled();
  });

  it('连击≥5 使用夸张欢呼语音', () => {
    const { w, speech } = fakeWindow();
    const svc = new SoundService(createDefaultProfile().settings, { window: w, speech });
    svc.speakCorrect(6);
    expect(speech.speak).toHaveBeenCalledWith(VOICE_LINES.combo);
  });

  it('背景音乐：开启时循环播放旋律，关闭后停止定时器', () => {
    const { w, started } = fakeWindow();
    let tick: (() => void) | null = null;
    let cleared = 0;
    const timers = {
      setInterval: (fn: () => void) => { tick = fn; return 1; },
      clearInterval: () => { cleared++; },
    };
    const svc = new SoundService(createDefaultProfile().settings, { window: w, timers });
    svc.startMusic();
    // 旋律首拍是休止符（0），不发声；第二拍起八音盒基音+泛音
    expect(started.length).toBe(0);
    tick!();
    expect(started.length).toBe(2); // 基音 + 高八度泛音
    tick!();
    expect(started.length).toBeGreaterThan(2);
    svc.stopMusic();
    expect(cleared).toBe(1);
    const after = started.length;
    (tick as (() => void) | null)!();
    expect(started.length).toBe(after); // 停止后残留定时器也不再发声（musicPlaying=false guard）
  });

  it('背景音乐受 music 开关控制：关闭时不播放', () => {
    const { w, started } = fakeWindow();
    const s = createDefaultProfile().settings;
    let tick: (() => void) | null = null;
    const timers = { setInterval: (fn: () => void) => { tick = fn; return 1; }, clearInterval: () => {} };
    const svc2 = new SoundService({ ...s, music: false }, { window: w, timers });
    svc2.startMusic();
    expect(started.length).toBe(0);
    svc2.updateSettings({ ...s, music: true }); // 开启后立即启动（首拍休止，推进一拍出声）
    tick!();
    expect(started.length).toBeGreaterThan(0);
  });
});
