// DebugPanel — realtime sound-event display (docs/architecture.md §5).
// Aggregated per-event rows: `name ×total (+last-1s)`, newest firing on top,
// ~14 rows, rows fired within 300ms are highlighted, plus a "latest" ticker.
// No game-logic dependency: fed purely by audio.onEvent.

const MAX_ROWS = 14;
const HIGHLIGHT_MS = 300;
const RECENT_WINDOW_MS = 1000;

/**
 * @param {HTMLElement} containerEl - the game's #frame div (positioning parent)
 * @param {{ onEvent(fn: (e:{t:number,name:string}) => void): void }} audio
 */
export function initDebugPanel(containerEl, audio) {
  if (typeof document === 'undefined' || !containerEl) return null;

  // Ensure the container can anchor an absolutely-positioned child.
  const cs = getComputedStyle(containerEl);
  if (cs.position === 'static') containerEl.style.position = 'relative';

  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:absolute',
    'top:8px',
    'right:4px',
    'width:148px',
    'max-height:80%',
    'overflow:hidden',
    'background:rgba(8,10,18,0.62)',
    'border:1px solid rgba(255,255,255,0.14)',
    'border-radius:6px',
    'padding:5px 6px',
    'z-index:1000',
    'pointer-events:none',
    'font:10.5px/1.5 "SFMono-Regular",Menlo,Consolas,"Liberation Mono",monospace',
    'color:#cfe3ff',
    'text-align:left',
    'user-select:none',
  ].join(';');

  const title = document.createElement('div');
  title.textContent = 'SFX EVENTS';
  title.style.cssText = 'font-size:9px;letter-spacing:1px;color:#7f92b8;margin-bottom:3px;';
  panel.appendChild(title);

  const list = document.createElement('div');
  panel.appendChild(list);

  const ticker = document.createElement('div');
  ticker.style.cssText =
    'margin-top:4px;padding-top:3px;border-top:1px solid rgba(255,255,255,0.14);' +
    'color:#ffd23c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  ticker.textContent = 'latest: -';
  panel.appendChild(ticker);

  containerEl.appendChild(panel);

  // name -> { total, lastT, times:[recent fire times], rowEl, nameEl, countEl }
  const stats = new Map();
  let latestName = '-';
  let dirty = true;
  let lastRender = 0;

  function makeRow(name) {
    const rowEl = document.createElement('div');
    rowEl.style.cssText =
      'display:flex;justify-content:space-between;gap:4px;padding:0 3px;' +
      'border-radius:3px;white-space:nowrap;transition:background 120ms linear;';
    const nameEl = document.createElement('span');
    nameEl.textContent = name;
    nameEl.style.cssText = 'overflow:hidden;text-overflow:ellipsis;';
    const countEl = document.createElement('span');
    countEl.style.cssText = 'color:#9fd08f;flex-shrink:0;';
    rowEl.appendChild(nameEl);
    rowEl.appendChild(countEl);
    return { rowEl, nameEl, countEl };
  }

  audio.onEvent((e) => {
    let s = stats.get(e.name);
    if (!s) {
      s = { total: 0, lastT: 0, times: [], ...makeRow(e.name) };
      if (e.unknown) s.nameEl.style.color = '#ff6d60';
      stats.set(e.name, s);
    }
    s.total++;
    s.lastT = e.t;
    s.times.push(e.t);
    latestName = e.name;
    dirty = true;
  });

  function render() {
    const now = performance.now();

    // 100ms スロットル: 高頻度イベント時に毎フレームのDOM再構築を避ける (SwiftShader対策)
    if (now - lastRender < 100) { requestAnimationFrame(render); return; }
    lastRender = now;

    // Prune the recent-1s windows; count changes force a redraw of counts.
    for (const s of stats.values()) {
      while (s.times.length && now - s.times[0] > RECENT_WINDOW_MS) {
        s.times.shift();
        dirty = true;
      }
    }

    // Highlight state changes continuously — cheap, just style writes.
    for (const s of stats.values()) {
      const hot = now - s.lastT <= HIGHLIGHT_MS && s.total > 0;
      const bg = hot ? 'rgba(255,210,60,0.28)' : 'transparent';
      if (s.rowEl.style.background !== bg) s.rowEl.style.background = bg;
    }

    if (dirty) {
      dirty = false;
      // Newest firing first, cap at MAX_ROWS.
      const sorted = [...stats.values()].sort((a, b) => b.lastT - a.lastT).slice(0, MAX_ROWS);
      // Rebuild order only (row elements are reused).
      list.textContent = '';
      for (const s of sorted) {
        const recent = s.times.length;
        s.countEl.textContent = `×${s.total} (+${recent})`;
        list.appendChild(s.rowEl);
      }
      ticker.textContent = `latest: ${latestName}`;
    }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  return panel;
}
