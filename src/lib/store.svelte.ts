import { listen } from '@tauri-apps/api/event';
import { api, isTauri, mediaUrl } from './api';
import { pickAudioFiles, pickFolder } from './dialogs';
import { applySkin } from './skins';
import { clamp, tapeCondition } from './format';
import type { DeckMode, Library, Side, Tape, Track } from './types';
import { DEMO_LIBRARY } from './demo';

export type Sheet = 'settings' | 'jcard' | 'bench' | 'skins' | 'import' | 'now' | 'insights' | null;

interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'err';
}

function blankLibrary(): Library {
  return {
    version: 1,
    tapes: [],
    scan_paths: [],
    settings: {
      hinge_breakpoint: 800,
      auto_reverse: true,
      tape_wear_enabled: true,
      tape_stretch_enabled: true,
      key_sounds: false,
      volume: 0.72,
      current_skin: 'fm8-classic',
      current_finish: 0,
      show_mini_player: true,
      mode_lock: 'auto',
      theme: 'auto',
      reduce_motion: false,
      recent: [],
    },
    updated_at: Math.floor(Date.now() / 1000),
  };
}

class KASSETEState {
  // ------------------------------------------------------------ core state --
  library = $state<Library>(blankLibrary());
  ready = $state(false);
  bootError = $state<string | null>(null);

  tapeId = $state<string | null>(null);
  side = $state<Side>('A');
  trackIndex = $state(0);
  playing = $state(false);
  ended = $state(false);
  positionMs = $state(0);
  trackDurationMs = $state(0);
  volume = $state(0.72);
  muted = $state(false);
  ejected = $state(false);
  busy = $state(false);
  /** Milliseconds of tape actually heard since the app was opened. */
  sessionPlayMs = $state(0);

  viewportWidth = $state(typeof window === 'undefined' ? 1180 : window.innerWidth);
  aspect = $state(typeof window === 'undefined' ? 1.6 : window.innerWidth / window.innerHeight);

  toasts = $state<Toast[]>([]);
  sheet = $state<Sheet>(null);
  skinPickerOpen = $state(false);

  vu = $state({ l: 0.06, r: 0.08 });
  unsupported = $state<string | null>(null);

  private audio: HTMLAudioElement | null = null;
  private ticker: number | null = null;
  private saveTimer: number | null = null;
  private toastSeed = 0;
  private blobUrl: string | null = null;
  private loadedPath = '';
  private loadedTrackId = '';
  private triedBlob = false;
  private probed = new Set<string>();
  private countedPlay = false;
  private lastTickAt = 0;
  private lastBand = -1;

  // ---------------------------------------------------------------- getters --
  get settings() {
    return this.library.settings;
  }

  get tapes(): Tape[] {
    return this.library.tapes;
  }

  get visibleTapes(): Tape[] {
    return this.library.tapes.filter((t) => !t.hidden);
  }

  get tape(): Tape | null {
    if (!this.tapeId) return null;
    return this.library.tapes.find((t) => t.id === this.tapeId) ?? null;
  }

  get mode(): DeckMode {
    if (this.settings.mode_lock === 'cover') return 'cover';
    if (this.settings.mode_lock === 'inner') return 'inner';
    return this.viewportWidth < (this.settings.hinge_breakpoint || 800) ? 'cover' : 'inner';
  }

  get sideTracks(): Track[] {
    const tape = this.tape;
    if (!tape) return [];
    return tape.tracks
      .filter((t) => t.side === this.side)
      .sort((a, b) => a.side_index - b.side_index || a.track_no - b.track_no);
  }

  get otherSideTracks(): Track[] {
    const tape = this.tape;
    if (!tape) return [];
    const other = this.side === 'A' ? 'B' : 'A';
    return tape.tracks
      .filter((t) => t.side === other)
      .sort((a, b) => a.side_index - b.side_index || a.track_no - b.track_no);
  }

  get track(): Track | null {
    const list = this.sideTracks;
    if (!list.length) return null;
    return list[clamp(this.trackIndex, 0, list.length - 1)] ?? null;
  }

  get trackTitle(): string {
    return this.track?.title ?? 'No tape in the deck';
  }

  get trackSubtitle(): string {
    const tape = this.tape;
    if (!tape) return 'Choose a tape from the rack';
    if (!this.track) return `${tape.artist} — ${tape.album}`;
    return `${tape.artist} — ${tape.album}`;
  }

  private sideDuration(side: Side): number {
    const tape = this.tape;
    if (!tape) return 0;
    return tape.tracks.filter((t) => t.side === side).reduce((sum, t) => sum + t.duration_ms, 0);
  }

  get sideOffsetMs(): number {
    const list = this.sideTracks;
    let sum = 0;
    for (let i = 0; i < this.trackIndex && i < list.length; i += 1) sum += list[i].duration_ms;
    return sum;
  }

  get sideDurationMs(): number {
    return this.sideTracks.reduce((sum, t) => sum + t.duration_ms, 0);
  }

  get totalDurationMs(): number {
    return this.sideDuration('A') + this.sideDuration('B');
  }

  /** 0 → start of side A, 1 → end of side B. Drives the tape fill and counter. */
  get tapeProgress(): number {
    const tape = this.tape;
    if (!tape) return 0;
    const a = this.sideDuration('A');
    const b = this.sideDuration('B');
    const total = a + b;
    if (total > 0) {
      const base = this.side === 'A' ? 0 : a;
      return clamp((base + this.sideOffsetMs + this.positionMs) / total, 0, 1);
    }
    const list = tape.tracks;
    if (!list.length) return 0;
    const index = this.track ? list.findIndex((t) => t.id === this.track?.id) : 0;
    const within = this.trackDurationMs ? this.positionMs / this.trackDurationMs : 0;
    return clamp((Math.max(0, index) + within) / list.length, 0, 1);
  }

  get sideProgress(): number {
    const total = this.sideDurationMs;
    if (total > 0) return clamp((this.sideOffsetMs + this.positionMs) / total, 0, 1);
    const list = this.sideTracks;
    if (!list.length) return 0;
    return clamp((this.trackIndex + (this.trackDurationMs ? this.positionMs / this.trackDurationMs : 0)) / list.length, 0, 1);
  }

  get leftFill(): number {
    // At the start of side A the left spool is full.
    return 0.34 + 0.6 * (1 - this.tapeProgress);
  }

  get rightFill(): number {
    return 0.34 + 0.6 * this.tapeProgress;
  }

  get reeling(): boolean {
    return this.playing;
  }

  get trackCountLabel(): string {
    const list = this.sideTracks;
    if (!list.length) return '—';
    return `${clamp(this.trackIndex + 1, 1, list.length)} of ${list.length}`;
  }

  // ------------------------------------------------------------------- boot --
  async init() {
    const onResize = () => {
      this.viewportWidth = window.innerWidth;
      this.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    onResize();

    this.ensureAudio();

    if (!isTauri()) {
      this.library = DEMO_LIBRARY;
      this.volume = this.library.settings.volume;
      applySkin(this.library.settings.current_skin);
      this.ready = true;
      this.toast('Demo mode — open KASSETE to play your own collection');
      this.selectFirstTape();
      return;
    }

    try {
      const library = await api.getLibrary();
      this.library = library;
      this.volume = library.settings.volume;
      this.muted = false;
      applySkin(library.settings.current_skin);
      this.ready = true;
      this.selectFirstTape();
      this.applyMotionPreference();

      // Fill in any missing track lengths in the background.
      void this.probeCurrentTape();

      const resume = library.settings.recent?.[0];
      if (resume) {
        const found = library.tapes.find((t) => t.id === resume);
        if (found) this.openTape(found.id, { autoplay: false });
      }
    } catch (error) {
      this.bootError = String(error);
      this.library = DEMO_LIBRARY;
      applySkin('fm8-classic');
      this.ready = true;
      this.selectFirstTape();
    }

    this.bindGlobalKeys();
    void this.bindTray();
  }

  private selectFirstTape() {
    const first = this.visibleTapes.find((t) => t.tracks.length) ?? this.visibleTapes[0];
    if (first) this.openTape(first.id, { autoplay: false, restore: true });
  }

  private applyMotionPreference() {
    document.documentElement.classList.toggle('reduce-motion', this.settings.reduce_motion);
  }

  // ------------------------------------------------------------------ audio --
  private ensureAudio(): HTMLAudioElement {
    if (this.audio) return this.audio;
    const el = new Audio();
    el.preload = 'metadata';
    el.volume = this.volume;
    el.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(el.duration)) {
        this.trackDurationMs = el.duration * 1000;
        this.recordDuration(el.duration * 1000);
      }
    });
    el.addEventListener('ended', () => void this.handleEnded());
    el.addEventListener('playing', () => {
      this.playing = true;
      this.unsupported = null;
    });
    el.addEventListener('pause', () => {
      this.playing = false;
      this.scheduleSave();
    });
    el.addEventListener('error', () => void this.handleAudioError());
    this.audio = el;
    return el;
  }

  private recordDuration(ms: number) {
    const tape = this.tape;
    const track = this.track;
    if (!tape || !track || !ms || ms <= 0) return;
    if (Math.abs((track.duration_ms || 0) - ms) < 800) return;
    const local = tape.tracks.find((t) => t.id === track.id);
    if (local) local.duration_ms = Math.round(ms);
    if (isTauri()) {
      void api.setTrackDurations(tape.id, [[track.id, Math.round(ms)]]).catch(() => {});
    }
  }

  private async handleAudioError() {
    const el = this.audio;
    const track = this.track;
    if (!el || !track) return;

    // First failure on an asset:// URL is almost always the asset protocol
    // refusing a path — retry once by pushing the bytes over IPC instead.
    if (!this.triedBlob && isTauri()) {
      this.triedBlob = true;
      try {
        const buffer = await api.readAudioBytes(track.path);
        if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
        this.blobUrl = URL.createObjectURL(new Blob([buffer]));
        const wasPlaying = this.playing;
        el.src = this.blobUrl;
        el.load();
        if (wasPlaying) await el.play().catch(() => {});
        return;
      } catch {
        // fall through to the message below
      }
    }

    this.playing = false;
    this.unsupported = 'That file could not be played.';
    this.toast(`Cannot play “${track.title}” — the file may be missing or in an unsupported format.`, 'err');
  }

  private audioSrcFor(path: string): string {
    return mediaUrl(path);
  }

  private loadCurrent(autoplay: boolean) {
    const track = this.track;

    // Browser demo: no real files, so run the transport on a timer instead.
    if (!isTauri()) {
      if (this.loadedTrackId !== (track?.id ?? '')) {
        this.loadedTrackId = track?.id ?? '';
        this.positionMs = 0;
      }
      this.trackDurationMs = track?.duration_ms ?? 0;
      if (autoplay) {
        this.playing = true;
        this.startTicker();
      }
      return;
    }

    const el = this.ensureAudio();
    if (!track) {
      el.pause();
      el.removeAttribute('src');
      this.positionMs = 0;
      this.trackDurationMs = 0;
      return;
    }
    if (this.loadedPath !== track.path) {
      this.loadedPath = track.path;
      this.triedBlob = false;
      const src = this.audioSrcFor(track.path);
      el.src = src;
      el.load();
      this.positionMs = 0;
    }
    this.trackDurationMs = (track.duration_ms || 0) > 0 ? track.duration_ms : 0;
    el.volume = this.muted ? 0 : this.volume;
    if (autoplay) {
      void el.play().catch((err) => {
        // Autoplay rejection is not fatal; the user can press play.
        if (String(err).includes('NotSupportedError')) return;
      });
    }
    this.startTicker();
  }

  private startTicker() {
    if (this.ticker !== null) return;
    this.ticker = window.setInterval(() => this.tick(), 80);
  }

  private stopTicker() {
    if (this.ticker !== null) {
      window.clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  /**
   * A tape ages while it is actually running over the heads. The counter is
   * deliberately generous: a well-loved tape should visibly collect fingerprints
   * and label foxing after an evening of listening, not after a year.
   */
  private ageTape(seconds: number) {
    const tape = this.tape;
    if (!tape || seconds <= 0) return;
    this.sessionPlayMs += seconds * 1000;
    if (!this.settings.tape_wear_enabled) return;

    tape.wear = clamp(tape.wear + seconds / 10800, 0, 1);
    tape.dirt = clamp(tape.dirt + seconds / 2700, 0, 1);

    const condition = tapeCondition(tape.wear, tape.dirt);
    if (condition.band > this.lastBand && condition.band >= 2) {
      this.toast(condition.comment);
    }
    this.lastBand = condition.band;
  }

  private tick() {
    if (!isTauri()) {
      this.demoTick();
      return;
    }
    const now = performance.now();
    const elapsed = this.lastTickAt ? Math.min(0.5, (now - this.lastTickAt) / 1000) : 0;
    this.lastTickAt = now;
    const el = this.audio;
    if (!el) return;
    if (!el.paused) {
      this.positionMs = el.currentTime * 1000;
      if (!this.trackDurationMs && Number.isFinite(el.duration)) {
        this.trackDurationMs = el.duration * 1000;
      }
      const target = 0.34 + 0.42 * Math.abs(Math.sin(el.currentTime * 0.8 + 1.3)) + Math.random() * 0.16;
      const targetR = 0.3 + 0.44 * Math.abs(Math.sin(el.currentTime * 0.63 + 0.4)) + Math.random() * 0.16;
      this.vu.l += (Math.min(1, target) - this.vu.l) * 0.35;
      this.vu.r += (Math.min(1, targetR) - this.vu.r) * 0.35;
      this.ageTape(elapsed);
      this.maybeSaveWhilePlaying();
    } else {
      this.vu.l += (0.05 - this.vu.l) * 0.12;
      this.vu.r += (0.05 - this.vu.r) * 0.12;
    }
    if (el.ended && !this.ended) void this.handleEnded();
  }

  private demoTick() {
    if (!this.playing) {
      this.vu.l += (0.05 - this.vu.l) * 0.12;
      this.vu.r += (0.05 - this.vu.r) * 0.12;
      return;
    }
    this.positionMs += 80;
    this.ageTape(0.08);
    const duration = this.trackDurationMs || 200_000;
    if (this.positionMs >= duration) {
      this.positionMs = duration;
      this.playing = false;
      void this.handleEnded();
      return;
    }
    const t = this.positionMs / 1000;
    const target = 0.34 + 0.42 * Math.abs(Math.sin(t * 0.8 + 1.3)) + Math.random() * 0.16;
    const targetR = 0.3 + 0.44 * Math.abs(Math.sin(t * 0.63 + 0.4)) + Math.random() * 0.16;
    this.vu.l += (Math.min(1, target) - this.vu.l) * 0.35;
    this.vu.r += (Math.min(1, targetR) - this.vu.r) * 0.35;
  }

  private maybeSaveWhilePlaying() {
    const now = Date.now();
    if (now - (this.lastSave ?? 0) < 6000) return;
    this.lastSave = now;
    this.scheduleSave();
  }

  private lastSave = 0;

  // --------------------------------------------------------------- lifecycle --
  openTape(id: string, options: { autoplay?: boolean; restore?: boolean } = {}) {
    const tape = this.library.tapes.find((t) => t.id === id);
    if (!tape) return;
    const { autoplay = true, restore = false } = options;

    const changed = this.tapeId !== id;
    this.tapeId = id;
    this.ended = false;
    this.ejected = false;
    if (changed) {
      this.countedPlay = false;
      this.lastBand = tapeCondition(tape.wear, tape.dirt).band;
    }

    if (changed || !restore) {
      const side: Side = restore ? tape.current_side : 'A';
      this.side = side;
      const list = tape.tracks
        .filter((t) => t.side === side)
        .sort((a, b) => a.side_index - b.side_index);
      let index = 0;
      if (restore && changed === false) index = 0;
      this.trackIndex = index;
      this.loadedPath = '';
      this.positionMs = 0;
      if (restore && list.length) {
        // Resume from the reel position stored with the tape.
        const total = this.sideDuration(side) || 0;
        if (total > 0 && tape.reel_position > 0) {
          const target = tape.reel_position * this.totalDurationMs;
          let running = 0;
          for (let i = 0; i < list.length; i += 1) {
            const d = list[i].duration_ms;
            if (target < running + d) {
              this.trackIndex = i;
              this.positionMs = Math.max(0, target - running);
              this.loadedPath = '';
              break;
            }
            running += d;
          }
        }
      }
    }

    this.loadCurrent(autoplay);
    if (autoplay) {
      this.markPlayed();
    } else {
      this.scheduleSave();
    }

    // Remember the tape so the next launch can put it back in the deck.
    const recent = [id, ...(this.settings.recent ?? []).filter((r) => r !== id)].slice(0, 8);
    if (recent.join('|') !== (this.settings.recent ?? []).join('|')) {
      this.settings.recent = recent;
      this.queueSettingsSave();
    }

    void this.probeCurrentTape();
  }

  private markPlayed() {
    const tape = this.tape;
    if (!tape) return;
    if (!this.countedPlay) {
      this.countedPlay = true;
      tape.play_count += 1;
      tape.last_played_at = Math.floor(Date.now() / 1000);
      if (this.settings.tape_wear_enabled) {
        tape.wear = clamp(tape.wear + 0.003, 0, 1);
        tape.dirt = clamp(tape.dirt + 0.004, 0, 1);
      }
    }
    this.scheduleSave();
  }

  play() {
    if (!this.track) {
      const first = this.visibleTapes.find((t) => t.tracks.length);
      if (first) this.openTape(first.id, { autoplay: true });
      else this.toast('Add a music folder first — Settings → Music folders');
      return;
    }
    this.ended = false;
    this.ejected = false;
    if (!isTauri()) {
      this.playing = true;
      this.markPlayed();
      this.startTicker();
      return;
    }
    const el = this.ensureAudio();
    if (this.loadedPath !== this.track.path) this.loadCurrent(true);
    else void el.play().catch(() => this.handleAudioError());
    this.markPlayed();
    this.startTicker();
  }

  pause() {
    if (isTauri()) this.audio?.pause();
    this.playing = false;
    this.scheduleSave();
  }

  /**
   * The Pause key doubles as the eject key: once the tape is already stopped,
   * pressing it again pops the cassette out so another one can be loaded.
   */
  pauseOrEject() {
    if (!this.tape) {
      this.toast('The deck is empty — pick a tape from the rack');
      return;
    }
    if (this.playing) {
      this.pause();
      return;
    }
    if (!this.ejected) {
      this.eject();
      return;
    }
    this.play();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  stop() {
    const el = this.ensureAudio();
    if (isTauri()) {
      el.pause();
      el.currentTime = 0;
    }
    this.positionMs = 0;
    this.playing = false;
    this.ended = false;
    this.scheduleSave();
  }

  /** Move the head by a number of milliseconds — deck REW / F.FWD. */
  seekBy(ms: number) {
    this.seekTo(this.positionMs + ms);
  }

  /** Scrub to an absolute position inside the current track. */
  seekTo(ms: number, durationOverride?: number) {
    const el = this.ensureAudio();
    const duration =
      durationOverride ||
      this.trackDurationMs ||
      (Number.isFinite(el.duration) ? el.duration * 1000 : 0);
    const target = clamp(ms, 0, duration > 0 ? duration : Math.max(0, ms));
    this.positionMs = target;
    if (isTauri()) {
      try {
        el.currentTime = target / 1000;
      } catch {
        /* the media element is not seekable yet */
      }
    }
    this.scheduleSave();
  }

  eject() {
    const el = this.ensureAudio();
    if (isTauri()) el.pause();
    this.playing = false;
    this.ejected = true;
    this.scheduleSave();
    this.toast('Tape ejected');
  }

  async handleEnded() {
    this.ended = true;
    const list = this.sideTracks;
    if (this.trackIndex + 1 < list.length) {
      this.trackIndex += 1;
      this.loadCurrent(true);
      this.scheduleSave();
      return;
    }
    // End of side — auto-reverse if the other side has anything on it.
    if (this.settings.auto_reverse && this.otherSideTracks.length) {
      this.flipSide(true);
      return;
    }
    this.playing = false;
    this.positionMs = 0;
    this.scheduleSave();
  }

  next() {
    const list = this.sideTracks;
    if (!list.length) return;
    if (this.trackIndex + 1 < list.length) {
      this.trackIndex += 1;
      this.loadCurrent(this.playing);
      this.scheduleSave();
    } else if (this.otherSideTracks.length) {
      this.flipSide(this.playing);
    } else {
      this.trackIndex = 0;
      this.loadCurrent(this.playing);
    }
  }

  prev() {
    const el = this.ensureAudio();
    if (this.positionMs > 3000) {
      el.currentTime = 0;
      this.positionMs = 0;
      return;
    }
    if (this.trackIndex > 0) {
      this.trackIndex -= 1;
      this.loadCurrent(this.playing);
      this.scheduleSave();
    } else if (this.otherSideTracks.length) {
      const other = this.side === 'A' ? 'B' : 'A';
      const list = this.otherSideTracks;
      this.side = other;
      this.trackIndex = Math.max(0, list.length - 1);
      this.loadCurrent(this.playing);
      this.scheduleSave();
    } else {
      el.currentTime = 0;
      this.positionMs = 0;
    }
  }

  flipSide(keepPlaying = this.playing) {
    const other: Side = this.side === 'A' ? 'B' : 'A';
    const list = this.otherSideTracks;
    if (!list.length) {
      this.toast('The other side of this tape is blank');
      return;
    }
    this.side = other;
    this.trackIndex = 0;
    this.loadedPath = '';
    this.positionMs = 0;
    this.ended = false;
    this.loadCurrent(keepPlaying);
    this.scheduleSave();
    this.toast(`Flipped to side ${other}`);
  }

  playTrack(trackId: string) {
    const tape = this.tape;
    if (!tape) return;
    const found = tape.tracks.find((t) => t.id === trackId);
    if (!found) return;
    this.side = found.side;
    const list = this.sideTracks;
    this.trackIndex = Math.max(0, list.findIndex((t) => t.id === trackId));
    this.loadedPath = '';
    this.positionMs = 0;
    this.loadCurrent(true);
    this.markPlayed();
    this.sheet = null;
  }

  seekToFraction(fraction: number) {
    const total = this.sideDurationMs;
    const el = this.ensureAudio();
    if (!total || !this.track) return;
    const target = clamp(fraction, 0, 0.999) * total;
    const list = this.sideTracks;
    let running = 0;
    for (let i = 0; i < list.length; i += 1) {
      const d = list[i].duration_ms;
      if (target < running + d) {
        if (i !== this.trackIndex) {
          this.trackIndex = i;
          this.loadedPath = '';
          this.loadCurrent(false);
        }
        const within = Math.max(0, target - running);
        el.currentTime = within / 1000;
        this.positionMs = within;
        if (this.playing) void el.play().catch(() => {});
        return;
      }
      running += d;
    }
  }

  seekToMs(ms: number) {
    const el = this.ensureAudio();
    el.currentTime = Math.max(0, ms / 1000);
    this.positionMs = Math.max(0, ms);
  }

  setVolume(value: number) {
    this.volume = clamp(value, 0, 1);
    this.muted = false;
    if (this.audio) this.audio.volume = this.volume;
    this.queueSettingsSave();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.audio) this.audio.volume = this.muted ? 0 : this.volume;
  }

  // ------------------------------------------------------------ persistence --
  private scheduleSave() {
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      void this.flushTapeState();
    }, 700);
  }

  async flushTapeState() {
    const tape = this.tape;
    if (!tape || !isTauri()) return;
    try {
      await api.patchTapeState({
        id: tape.id,
        currentSide: this.side,
        reelPosition: this.tapeProgress,
        playCount: tape.play_count,
        wear: tape.wear,
        dirt: tape.dirt,
        stretch: tape.stretch,
        lastPlayedAt: tape.last_played_at ?? undefined,
      });
    } catch {
      // Saving state is best-effort — never interrupt playback for it.
    }
  }

  private settingsTimer: number | null = null;
  queueSettingsSave() {
    if (this.settingsTimer !== null) window.clearTimeout(this.settingsTimer);
    this.settingsTimer = window.setTimeout(() => {
      this.settingsTimer = null;
      void this.saveSettings();
    }, 500);
  }

  async saveSettings() {
    if (!isTauri()) return;
    try {
      await api.updateSettings($state.snapshot(this.settings) as any);
    } catch (error) {
      console.warn('foldman: settings not saved', error);
    }
  }

  async patchSettings(patch: Partial<Library['settings']>) {
    Object.assign(this.library.settings, patch);
    this.applyMotionPreference();
    if (patch.current_skin) applySkin(patch.current_skin);
    if (patch.volume !== undefined) {
      this.volume = patch.volume;
      if (this.audio) this.audio.volume = this.muted ? 0 : this.volume;
    }
    await this.saveSettings();
  }

  async setSkin(id: string, finish?: number) {
    this.library.settings.current_skin = id;
    applySkin(id);
    if (finish !== undefined) this.library.settings.current_finish = finish;
    this.toast(`Skin: ${this.skinName(id)}`);
    if (!isTauri()) return;
    try {
      await api.setSkin(id, finish);
    } catch {
      /* non-fatal */
    }
  }

  private skinName(id: string): string {
    return id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  async revealFolder(id: string) {
    if (!isTauri()) {
      this.toast('Demo mode — no files on disk');
      return;
    }
    try {
      await api.revealTapeFolder(id);
    } catch (error) {
      this.toast(String(error), 'err');
    }
  }

  async saveTape(tape: Tape) {
    const index = this.library.tapes.findIndex((t) => t.id === tape.id);
    if (index >= 0) this.library.tapes[index] = tape;
    if (!isTauri()) return;
    try {
      const saved = await api.updateTape($state.snapshot(tape) as any);
      if (index >= 0) this.library.tapes[index] = saved;
    } catch (error) {
      this.toast(`Could not save tape: ${error}`, 'err');
    }
  }

  // ---------------------------------------------------------------- actions --
  async rescan(silent = false) {
    if (!isTauri()) {
      this.toast('Demo mode — scanning is disabled');
      return;
    }
    if (!this.library.scan_paths.length) {
      this.sheet = 'settings';
      this.toast('Add a music folder first');
      return;
    }
    this.busy = true;
    try {
      const report = await api.scanLibrary();
      this.library = await api.getLibrary();
      if (!this.tapeId) this.selectFirstTape();
      if (!silent) {
        this.toast(
          `Scanned ${report.tapes} tapes · ${report.tracks} tracks in ${(report.duration_ms / 1000).toFixed(1)}s`
        );
      }
    } catch (error) {
      this.toast(`Scan failed: ${error}`, 'err');
    } finally {
      this.busy = false;
    }
  }

  async addFolder(path: string) {
    this.busy = true;
    try {
      this.library = await api.addScanPath(path, true);
      this.toast('Folder added — scanning…');
      await this.rescan(true);
      const report = this.library.tapes.length;
      this.toast(report ? `${report} tapes in the rack` : 'No audio files found in that folder');
    } catch (error) {
      this.toast(String(error), 'err');
    } finally {
      this.busy = false;
    }
  }

  async pickAndAddFolder() {
    try {
      const path = await pickFolder();
      if (path) await this.addFolder(path);
    } catch (error) {
      this.toast(String(error), 'err');
    }
  }

  // ------------------------------------------------------------ file import --
  /** Turn any audio (or video) file into a tape, one tape per file. */
  async importFiles(paths: string[]) {
    if (!paths.length) return;
    this.busy = true;
    try {
      const report = await api.importAudioFiles(paths);
      this.library = report.library;
      this.toast(report.message, report.added.length ? 'info' : 'err');

      const first = report.added[0];
      if (first) {
        // Load the new tape straight away: "eject, pick a song, hear it".
        this.probed.delete(first);
        this.sheet = null;
        this.openTape(first, { autoplay: true });
      }
    } catch (error) {
      this.toast(`Could not add those files: ${error}`, 'err');
    } finally {
      this.busy = false;
    }
  }

  async pickAndImportFiles() {
    if (!isTauri()) {
      this.toast('Demo mode — add files in the desktop app');
      return;
    }
    try {
      const paths = await pickAudioFiles();
      if (paths.length) await this.importFiles(paths);
    } catch (error) {
      this.toast(String(error), 'err');
    }
  }

  async removeFolder(path: string) {
    try {
      this.library = await api.removeScanPath(path);
      this.toast('Folder removed from the scan list');
    } catch (error) {
      this.toast(String(error), 'err');
    }
  }

  async toggleTrackDurations() {
    void this.probeCurrentTape();
  }

  private async probeCurrentTape() {
    const tape = this.tape;
    if (!tape || !isTauri()) return;
    if (this.probed.has(tape.id)) return;
    const missing = tape.tracks.filter((t) => !t.duration_ms);
    if (!missing.length) {
      this.probed.add(tape.id);
      return;
    }
    this.probed.add(tape.id);
    const results: [string, number][] = [];
    for (const track of missing.slice(0, 30)) {
      const ms = await probeDuration(track.path);
      if (ms) {
        results.push([track.id, ms]);
        const local = tape.tracks.find((t) => t.id === track.id);
        if (local) local.duration_ms = ms;
      }
    }
    if (!results.length) return;
    try {
      await api.setTrackDurations(tape.id, results);
    } catch {
      /* non-fatal */
    }
  }

  // ------------------------------------------------------------------ sheets --
  openSheet(sheet: Sheet) {
    this.sheet = sheet;
  }

  closeSheet() {
    this.sheet = null;
  }

  // ------------------------------------------------------------------ toasts --
  toast(text: string, kind: 'info' | 'err' = 'info') {
    const id = ++this.toastSeed;
    this.toasts.push({ id, text, kind });
    if (this.toasts.length > 4) this.toasts.shift();
    window.setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    }, kind === 'err' ? 5200 : 3200);
  }

  // ------------------------------------------------------------------ wiring --
  private bindGlobalKeys() {
    window.addEventListener('keydown', (event) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (event.key === 'Escape') {
        if (this.sheet) {
          this.sheet = null;
          event.preventDefault();
        }
        return;
      }
      if (typing) return;

      if (event.code === 'Space') {
        event.preventDefault();
        this.toggle();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (event.shiftKey) this.next();
        else this.seekBy(10_000);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (event.shiftKey) this.prev();
        else this.seekBy(-10_000);
      } else if (event.key.toLowerCase() === 'n') {
        this.next();
      } else if (event.key.toLowerCase() === 'i') {
        this.openSheet('insights');
      } else if (event.key.toLowerCase() === 'f') {
        this.flipSide();
      } else if (event.key.toLowerCase() === 'e') {
        this.eject();
      } else if (event.key.toLowerCase() === 's') {
        this.sheet = this.sheet === 'settings' ? null : 'settings';
      } else if (event.key === ',' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        this.sheet = 'settings';
      } else if (event.key.toLowerCase() === 'o' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        void this.pickAndImportFiles();
      } else if (event.key.toLowerCase() === 'r' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        void this.rescan();
      }
    });
  }

  private async bindTray() {
    if (!isTauri()) return;
    await listen('tray://play-pause', () => this.toggle());
    await listen('tray://next', () => this.next());
    await listen('tray://prev', () => this.prev());
    await listen('tray://flip', () => this.flipSide());
    await listen('tray://rescan', () => void this.rescan());
  }
}

/** Read a track's length without disturbing whatever is playing. */
function probeDuration(path: string): Promise<number> {
  return new Promise((resolve) => {
    const probe = new Audio();
    probe.preload = 'metadata';
    let settled = false;
    const finish = (ms: number) => {
      if (settled) return;
      settled = true;
      probe.removeAttribute('src');
      probe.load();
      resolve(ms);
    };
    const timer = window.setTimeout(() => finish(0), 7000);
    probe.addEventListener('loadedmetadata', () => {
      window.clearTimeout(timer);
      finish(Number.isFinite(probe.duration) ? Math.round(probe.duration * 1000) : 0);
    });
    probe.addEventListener('error', () => {
      window.clearTimeout(timer);
      finish(0);
    });
    probe.src = mediaUrl(path);
  });
}

export const foldman = new KASSETEState();
