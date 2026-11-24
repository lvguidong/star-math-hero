import type { Settings } from '../domain/types';

/** 音效类型：与策划案 10.2 对应 */
export type SfxKind = 'correct' | 'wrong' | 'hint' | 'star' | 'combo' | 'levelClear' | 'click'
  | 'laser' | 'explosion' | 'hit' | 'boss';

/** 音色包：每种音效一组 {频率, 起始秒, 时长秒, 波形, 峰值音量} */
type Tone = { f: number; at: number; dur: number; wave: OscillatorType; gain: number };
const SFX: Record<SfxKind, Tone[]> = {
  correct: [
    { f: 523, at: 0, dur: 0.12, wave: 'sine', gain: 0.22 },
    { f: 784, at: 0.09, dur: 0.18, wave: 'sine', gain: 0.22 },
  ],
  wrong: [
    { f: 220, at: 0, dur: 0.18, wave: 'triangle', gain: 0.16 },
    { f: 196, at: 0.12, dur: 0.22, wave: 'triangle', gain: 0.14 },
  ],
  hint: [{ f: 660, at: 0, dur: 0.1, wave: 'sine', gain: 0.14 }, { f: 880, at: 0.08, dur: 0.12, wave: 'sine', gain: 0.12 }],
  star: [{ f: 1047, at: 0, dur: 0.14, wave: 'sine', gain: 0.18 }, { f: 1319, at: 0.1, dur: 0.2, wave: 'sine', gain: 0.15 }],
  combo: [{ f: 440, at: 0, dur: 0.1, wave: 'sine', gain: 0.1 }, { f: 660, at: 0.08, dur: 0.1, wave: 'sine', gain: 0.1 }, { f: 880, at: 0.16, dur: 0.18, wave: 'sine', gain: 0.1 }],
  levelClear: [523, 659, 784, 1047].map((f, i) => ({ f, at: i * 0.12, dur: 0.3, wave: 'sine' as const, gain: 0.2 })),
  click: [{ f: 600, at: 0, dur: 0.05, wave: 'sine', gain: 0.1 }],
  // 战斗音效：激光扫频、爆炸噪声感（低频方波+衰减）、受击、Boss 警报
  laser: [
    { f: 1200, at: 0, dur: 0.08, wave: 'sawtooth', gain: 0.12 },
    { f: 400, at: 0.05, dur: 0.12, wave: 'sawtooth', gain: 0.1 },
  ],
  explosion: [
    { f: 160, at: 0, dur: 0.22, wave: 'square', gain: 0.16 },
    { f: 80, at: 0.05, dur: 0.3, wave: 'triangle', gain: 0.14 },
  ],
  hit: [
    { f: 240, at: 0, dur: 0.16, wave: 'square', gain: 0.18 },
    { f: 120, at: 0.08, dur: 0.2, wave: 'sawtooth', gain: 0.14 },
  ],
  boss: [
    { f: 160, at: 0, dur: 0.3, wave: 'sawtooth', gain: 0.16 },
    { f: 140, at: 0.3, dur: 0.3, wave: 'sawtooth', gain: 0.16 },
    { f: 110, at: 0.6, dur: 0.4, wave: 'square', gain: 0.14 },
  ],
};

/** 《歌唱祖国》（王莘）主旋律简谱：0=休止，1–7=本八度，8=高音 1（附点仅影响时值，此处近似等长） */
const PATRIOTIC_SONG: number[] = [
  // (0 5 5 | 5 5 5 | 5 5 5 | 5 4 3 2 | 1) 5 5 | 前奏
  0, 5, 5, 5, 5, 5, 5, 5, 5, 4, 3, 2, 1, 5, 5,
  // 五星红旗迎风飘扬，胜利歌声多么响亮
  1, 5, 3, 1, 5, 6, 5, 5, 5, 8, 1, 6, 5, 4, 6, 5,
  // 歌唱我们亲爱的祖国，从今走向繁荣富强
  5, 5, 5, 6, 6, 2, 2, 2, 5, 4, 3, 5, 5, 5, 6, 5, 4, 3, 2, 1,
  // 歌唱我们亲爱的祖国，从今走向繁荣富强
  1, 5, 5, 8, 8, 6, 6, 5, 4, 5, 6, 2, 2, 5, 5, 6, 5, 4, 3, 2, 1,
  // 繁荣富强！
  1, 0, 7, 5, 6, 7, 8, 8,
];
/** F 大调音阶相对半音数（简谱 1–7），级数 n 映射到频率（1 = F4 ≈ 349.23Hz） */
const F_MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MELODY = PATRIOTIC_SONG.map(n => {
  if (n === 0) return 0;
  const octave = Math.floor((n - 1) / 7);
  const semis = F_MAJOR[(n - 1) % 7] + octave * 12;
  return 349.23 * Math.pow(2, semis / 12);
});
const MUSIC_STEP_SEC = 0.34;

/** 语音文案表（嘀嗒的鼓励语，朗读用） */
export const VOICE_LINES = {
  welcome: '欢迎来到星际数学小勇士，算出答案，给飞船充能吧！',
  correct: ['答对啦，飞船充能成功！', '太棒了，继续加油！', '漂亮，连击真厉害！'],
  wrong: '别着急，再想一想，嘀嗒来帮你。',
  hint: '听好啦，提示来咯。',
  levelClear: '闯关成功，你真是小小数学家！',
  combo: '连击爆发，太厉害啦！',
} as const;

type AudioContextLike = {
  createOscillator(): { type: OscillatorType; frequency: { value: number }; connect(n: unknown): void; start(t: number): void; stop(t: number): void };
  createGain(): { gain: { value: number; setValueAtTime(v: number, t: number): void; linearRampToValueAtTime(v: number, t: number): void }; connect(n: unknown): void };
  readonly currentTime: number;
  readonly destination: unknown;
  state: string;
  resume(): Promise<void>;
};

type MusicTimers = { setInterval(fn: () => void, ms: number): number; clearInterval(id: number): void };

type SpeechVoiceLike = { lang?: string; name?: string };
type SpeechLike = {
  speak(text: string): void;
  cancel(): void;
  lang?: string;
  getVoices?: () => SpeechVoiceLike[];
};

/**
 * 声音服务：Web Audio 合成音效 + SpeechSynthesis 中文朗读。
 * 所有声音受 Settings.sfx / voice 开关控制；无浏览器环境（测试/SSR）自动静默。
 */
export class SoundService {
  private ctx: AudioContextLike | null = null;
  private settings: Settings;
  private speech: SpeechLike | null;
  private readonly makeContext: () => AudioContextLike | null;
  private readonly timers: MusicTimers;
  private musicGain: ReturnType<AudioContextLike['createGain']> | null = null;
  private musicTimer: number | null = null;
  private musicPlaying = false;
  private musicStep = 0;

  constructor(
    settings: Settings,
    deps?: { speech?: SpeechLike | null; makeContext?: () => AudioContextLike | null; window?: unknown; timers?: MusicTimers },
  ) {
    this.settings = settings;
    const w = deps?.window !== undefined ? deps.window : (typeof window !== 'undefined' ? window : null);
    this.speech = deps?.speech !== undefined ? deps.speech : (w && typeof w === 'object' && 'speechSynthesis' in w ? (w as { speechSynthesis: SpeechLike }).speechSynthesis : null);
    this.makeContext = deps?.makeContext ?? (() => {
      if (!w) return null;
      const Ctor = (w as { AudioContext?: new () => AudioContextLike; webkitAudioContext?: new () => AudioContextLike }).AudioContext
        ?? (w as { webkitAudioContext?: new () => AudioContextLike }).webkitAudioContext;
      return Ctor ? new Ctor() : null;
    });
    this.timers = deps?.timers ?? {
      setInterval: (fn, ms) => (typeof window !== 'undefined' ? window.setInterval(fn, ms) : 0) as unknown as number,
      clearInterval: (id) => { if (typeof window !== 'undefined') window.clearInterval(id); },
    };
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
    if (!settings.voice) this.speech?.cancel();
    if (settings.music) this.startMusic(); else this.stopMusic();
  }

  /** 播放轻柔八音盒背景音乐（纯正弦基音 + 微弱高八度泛音，缓入缓出，无刺耳电子音色） */
  startMusic(): void {
    if (this.musicPlaying || !this.settings.music) return;
    try {
      if (!this.ctx) this.ctx = this.makeContext();
      const ctx = this.ctx;
      if (!ctx) return;
      if (ctx.state === 'suspended') void ctx.resume();
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = 0.045; // 很轻，作为背景不盖过朗读与音效
      this.musicGain.connect(ctx.destination);
      this.musicPlaying = true;
      this.musicStep = 0;
      const tick = () => {
        if (!this.ctx || !this.musicGain || !this.musicPlaying) return;
        const c = this.ctx;
        const t = c.currentTime;
        const s = this.musicStep++;
        const note = MELODY[s % MELODY.length];
        if (note > 0) {
          // 八音盒音色：纯正弦 + 高八度泛音（音量 1/4），两个独立缓入缓出包络
          const voice = (freq: number, peak: number) => {
            const osc = c.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const env = c.createGain();
            env.gain.setValueAtTime(0.0001, t);
            env.gain.linearRampToValueAtTime(peak, t + 0.02);   // 柔和起音
            env.gain.linearRampToValueAtTime(0.0001, t + 0.5);  // 自然衰减
            osc.connect(env);
            env.connect(this.musicGain!);
            osc.start(t);
            osc.stop(t + 0.55);
          };
          voice(note, 0.9);
          voice(note * 2, 0.22);
        }
      };
      tick();
      this.musicTimer = this.timers.setInterval(tick, MUSIC_STEP_SEC * 1000);
    } catch {
      // 音频不可用时静默降级
    }
  }

  /** 用户首次交互后恢复被自动播放策略挂起的音频上下文（浏览器要求手势才能出声） */
  resumeAudio(): void {
    try {
      if (!this.ctx) this.ctx = this.makeContext();
      const ctx = this.ctx;
      if (!ctx) return;
      if (ctx.state === 'suspended') void ctx.resume();
    } catch { /* 静默降级 */ }
  }

  /** 停止背景音乐 */
  stopMusic(): void {
    if (!this.musicPlaying) return;
    this.musicPlaying = false;
    if (this.musicTimer !== null) { this.timers.clearInterval(this.musicTimer); this.musicTimer = null; }
    try { this.musicGain?.gain.setValueAtTime(0, this.ctx?.currentTime ?? 0); } catch { /* 静默降级 */ }
    this.musicGain = null;
  }

  playSfx(kind: SfxKind): void {
    if (!this.settings.sfx) return;
    try {
      if (!this.ctx) this.ctx = this.makeContext();
      const ctx = this.ctx;
      if (!ctx) return;
      if (ctx.state === 'suspended') void ctx.resume();
      const now = ctx.currentTime;
      for (const tone of SFX[kind]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = tone.wave;
        osc.frequency.value = tone.f;
        gain.gain.setValueAtTime(0.0001, now + tone.at);
        gain.gain.linearRampToValueAtTime(tone.gain, now + tone.at + 0.01);
        gain.gain.linearRampToValueAtTime(0.0001, now + tone.at + tone.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + tone.at);
        osc.stop(now + tone.at + tone.dur + 0.02);
      }
    } catch {
      // 音频不可用时静默降级，不影响游戏
    }
  }

  speak(text: string): void {
    if (!this.settings.voice || !this.speech) return;
    try {
      this.speech.cancel();
      // 显式中文普通话；读取当前语音列表以挑选中文声音（弱点亮的浏览器退回默认）
      if (typeof this.speech.getVoices === 'function') {
        const voices = this.speech.getVoices();
        const zh = voices.find(v => /^zh(-|_|$)/i.test(v.lang ?? ''));
        if (zh) this.speech.lang = zh.lang;
      }
      if (!this.speech.lang) this.speech.lang = 'zh-CN';
      this.speech.speak(text);
    } catch {
      // 语音不可用时静默降级
    }
  }

  speakCorrect(combo: number): void {
    this.speak(combo >= 5 ? VOICE_LINES.combo : VOICE_LINES.correct[combo >= 2 ? 1 : 0]);
  }

  stopVoice(): void {
    this.speech?.cancel();
  }
}
