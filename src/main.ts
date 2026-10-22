import { mount } from 'svelte'
import './app.css'
import './app-kassete.css'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app

// A tiny layout probe, only when the page is opened with ?debug.
// It answers "why is the window wider than the viewport" in one screenshot.
if (typeof location !== 'undefined' && location.search.includes('debug')) {
  const run = () => {
    const vw = document.documentElement.clientWidth;
    const rows: string[] = [];
    document.querySelectorAll<HTMLElement>('*').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > vw + 1 || rect.width > vw + 1) {
        const name = `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`;
        rows.push(`${name.slice(0, 40)} w=${Math.round(rect.width)} r=${Math.round(rect.right)}`);
      }
    });
    const name = (sel: string) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) return `${sel}=none`;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return `${sel} w=${Math.round(r.width)} sw=${el.scrollWidth} minw=${cs.minWidth} ovx=${cs.overflowX}`;
    };
    const diag =
      `DIAG inner=${window.innerWidth} client=${vw} dpr=${window.devicePixelRatio} docSW=${document.documentElement.scrollWidth}\n` +
      `${name('html')}\n${name('body')}\n${name('#app')}\n${name('.app-shell')}\n${name('.main')}\n${name('.deck-stage')}\n${name('.deck')}\n` +
      (rows.slice(0, 10).join('\n') || 'no offenders');
    console.log(diag);
    const box = document.createElement('pre');
    box.id = 'diag';
    box.style.cssText =
      'position:fixed;left:0;top:0;z-index:9999;background:#000;color:#5f5;font:10px/1.35 monospace;padding:6px;margin:0;white-space:pre-wrap;max-width:100vw';
    box.textContent = diag;
    document.body.appendChild(box);
  };
  requestAnimationFrame(() => setTimeout(run, 400));
}

// Dev helper: ?probe=eject pops the tape out so the empty-slot drawer can be
// inspected without a mouse.
if (typeof location !== 'undefined' && location.search.includes('probe=eject')) {
  void import('./lib/store.svelte').then(({ foldman }) => {
    setTimeout(() => foldman.eject(), 700);
  });
}

// Dev helper: ?sheet=now|insights|skins opens a sheet on load, and ?shell=D
// swaps the current tape to a clear shell so the X-ray layer can be checked.
// ?skin=fj88-boombox&finish=1 previews a deck material without the picker.
if (typeof location !== 'undefined' && /[?&](sheet|shell|grime|skin|finish)=/.test(location.search)) {
  const params = new URLSearchParams(location.search);
  const sheet = params.get('sheet');
  const shell = params.get('shell');
  const grime = params.get('grime');
  const skin = params.get('skin');
  const finish = params.get('finish');
  void import('./lib/store.svelte').then(({ foldman }) => {
    setTimeout(() => {
      const tape = foldman.tape;
      if (shell && tape) tape.shell = shell;
      if (grime && tape) {
        const value = Number(grime);
        if (Number.isFinite(value)) {
          tape.dirt = Math.min(1, Math.max(0, value));
          tape.wear = Math.min(1, Math.max(0, value * 0.8));
        }
      }
      const finishIndex = finish === null ? undefined : Number(finish);
      if (skin) {
        void foldman.patchSettings({
          current_skin: skin,
          ...(finishIndex !== undefined && Number.isFinite(finishIndex)
            ? { current_finish: Math.max(0, Math.floor(finishIndex)) }
            : {}),
        });
      } else if (finishIndex !== undefined && Number.isFinite(finishIndex)) {
        void foldman.patchSettings({ current_finish: Math.max(0, Math.floor(finishIndex)) });
      }
      if (sheet) foldman.openSheet(sheet as never);
    }, 500);
  });
}

// Dev helper: ?probe=service opens the bench and starts a pencil re-tension so
// the service animation can be caught mid-turn in a screenshot.
if (typeof location !== 'undefined' && location.search.includes('probe=service')) {
  void import('./lib/store.svelte').then(({ foldman }) => {
    setTimeout(() => foldman.openSheet('bench'), 600);
    setTimeout(() => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.sheet button'));
      buttons.find((button) => button.textContent?.includes('Re-tension'))?.click();
    }, 1300);
  });
}

// Dev helper: ?probe=mini reports why the bottom bar is or is not showing.
if (typeof location !== 'undefined' && location.search.includes('probe=mini')) {
  setTimeout(() => {
    void import('./lib/store.svelte').then(({ foldman }) => {
      const shell = document.querySelector('.app-shell') as HTMLElement | null;
      const pre = document.createElement('pre');
      pre.style.cssText =
        'position:fixed;left:0;top:0;z-index:99999;background:#000;color:#0f0;font:12px/1.4 monospace;padding:8px;white-space:pre-wrap';
      pre.textContent = [
        `tapes=${foldman.tapes.length}`,
        `show_mini=${foldman.settings.show_mini_player}`,
        `tape=${!!foldman.tape}`,
        `mode=${foldman.mode}`,
        `mini=${!!document.querySelector('.mini')}`,
        `shellH=${shell?.getBoundingClientRect().height} innerH=${window.innerHeight}`,
      ].join('\n');
      document.body.appendChild(pre);
    });
  }, 1200);
}

// Dev helper: ?probe=xray prints the geometry of the clear-shell X-ray layer.
if (typeof location !== 'undefined' && location.search.includes('probe=xray')) {
  setTimeout(() => {
    const look = (el: Element | null) => {
      if (!el) return 'null';
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return `x=${Math.round(r.x)} y=${Math.round(r.y)} w=${Math.round(r.width)} h=${Math.round(r.height)} op=${cs.opacity} z=${cs.zIndex} pos=${cs.position} disp=${cs.display} bg=${cs.backgroundColor}`;
    };
    const pre = document.createElement('pre');
    pre.style.cssText =
      'position:fixed;right:0;top:0;z-index:99999;background:#000;color:#0f0;font:11px/1.4 monospace;padding:8px;white-space:pre-wrap;max-width:620px';
    pre.textContent = [
      `cassette ${look(document.querySelector('.cassette'))}`,
      `xray ${look(document.querySelector('.cassette-xray'))}`,
      `shield ${look(document.querySelector('.x-shield'))}`,
      `label ${look(document.querySelector('.cassette-label'))}`,
      `reels ${look(document.querySelector('.cassette-reels'))}`,
    ].join('\n');
    document.body.appendChild(pre);
  }, 2000);
}
