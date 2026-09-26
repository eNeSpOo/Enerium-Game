/* Энериум · эффекты боя для прототипа интерфейса.
   Это показ, а не расчёт: что произошло, решает ядро (battle.js), здесь — как это выглядит.
   Случайность частиц — только для вида и на исход боя не влияет.
   KINDS — каталог видов эффектов: по нему видно, сколько работы у художника и в Unity. */
(function (root) {
'use strict';
const NS = 'http://www.w3.org/2000/svg';

/* цвета карстов из токенов интерфейса, плюс служебные */
const COL = {
  'Огонь': '#ff6a3d', 'Земля': '#eb9d40', 'Воздух': '#dff4e5', 'Вода': '#5a94f7', 'Время': '#4fdc8b', 'Свет': '#f7e8b0', 'Тьма': '#a986ee',
  'класс': '#f2e6c8', heal: '#7ef0a8', shield: '#8fdcff', aggro: '#ff5a44', gold: '#ddbc7a', spirit: '#48e5d4', dust: '#bfa77e', steel: '#f2e6c8',
};
const KINDS = [
  ['slash', 'Удар оружием', 'ближний бой: росчерк клинка по цели и искры'],
  ['arrow', 'Стрела', 'дальний бой: снаряд по дуге, укол при попадании'],
  ['bolt', 'Заклинание', 'сгусток в цвете школы летит к цели и раскрывается'],
  ['wave', 'Массовый удар', 'волна проходит по всему отряду, каждая карта вздрагивает'],
  ['heal', 'Лечение', 'зелёные искры поднимаются над картой'],
  ['hot', 'Лечение со временем', 'короткая вспышка в каждую атаку носителя'],
  ['shield', 'Щит', 'купол вокруг карты, пока щит держится'],
  ['taunt', 'Провокация', 'красная волна от танка, линии агро разворачиваются к нему'],
  ['dot', 'Урон со временем', 'своё у каждой школы: угли, яд, порезы, увядание, иней, песок'],
  ['debuff', 'Ослабление и метка', 'знак эффекта падает на карту с тёмным вихрем'],
  ['ctrl', 'Контроль', 'оглушение, безмолвие, остановка — знак над картой'],
  ['drain', 'Вампиризм', 'искры утекают от цели к тому, кто наложил'],
  ['dispel', 'Снятие щита', 'щит раскалывается на осколки'],
  ['ult', 'Ульта', 'затемнение, вспышка, имя крупно, дрожь поля'],
  ['crit', 'Критический удар', 'золотые искры и толчок'],
  ['miss', 'Промах', 'росчерк проходит мимо карты'],
  ['resist', 'Сопротивление', 'знак контроля разбивается о карту'],
  ['death', 'Гибель', 'карта тускнеет и осыпается глиной'],
  ['target', 'Под атакой', 'красная рамка на карте, в которую целятся; ×N — сколько противников'],
  ['cast', 'Применение способности', 'карта на миг вырастает и возвращается'],
  ['shake', 'Попадание способности', 'карта вздрагивает от удара'],
];
const ICON = { stun: 'chain', silence: 'lock', stop: 'hour', weak: 'down', mark: 'flag', pierce: 'minus', resist: 'shield' };
const DOT = { 'Огонь': 'ember', 'Земля': 'bubble', 'Воздух': 'cut', 'Тьма': 'wisp', 'Вода': 'frost', 'Время': 'sand', 'Свет': 'mote', 'класс': 'ember' };

const rnd = (a, b) => a + Math.random() * (b - a);
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
const sprites = {};
function glow(color) {
  if (sprites[color]) return sprites[color];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.2, rgba(color, .95)); gr.addColorStop(.5, rgba(color, .32)); gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return sprites[color] = c;
}

function create(host, opt = {}) {
  const spd = () => Math.max(.25, (opt.speed && opt.speed()) || 1);
  const T = ms => ms / spd();
  const cv = document.createElement('canvas'); cv.className = 'fx-cv';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'fx-svg');
  host.append(cv, svg);
  const ctx = cv.getContext('2d');
  let W = 0, Hh = 0, dpr = 1;
  function resize() {
    W = host.clientWidth; Hh = host.clientHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(Hh * dpr));
    svg.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
  }
  resize();
  const P = [], M = [];
  let raf = 0, last = 0, dead = false;
  const kick = () => { if (!raf && !dead) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  function center(el) {
    const hr = host.getBoundingClientRect(), r = el.getBoundingClientRect(), sc = hr.width / (host.clientWidth || 1) || 1;
    return { x: (r.left - hr.left + r.width / 2) / sc, y: (r.top - hr.top + r.height / 2) / sc, w: r.width / sc, h: r.height / sc };
  }
  function bez(m, k) {
    const u = 1 - k;
    return { x: u * u * m.x0 + 2 * u * k * m.cx + k * k * m.x1, y: u * u * m.y0 + 2 * u * k * m.cy + k * k * m.y1,
      a: Math.atan2(2 * u * (m.cy - m.y0) + 2 * k * (m.y1 - m.cy), 2 * u * (m.cx - m.x0) + 2 * k * (m.x1 - m.cx)) };
  }
  function frame(now) {
    raf = 0; if (dead) return;
    const dt = Math.min(50, now - last) * spd(); last = now;
    if (host.clientWidth !== W || host.clientHeight !== Hh) resize();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, Hh);
    for (let i = M.length - 1; i >= 0; i--) {
      const m = M[i]; m.t += dt; const k = Math.min(1, m.t / m.dur), p = bez(m, k);
      m.draw && m.draw(p, k); m.trail && m.trail(p, k);
      if (k >= 1) { M.splice(i, 1); fire(m); }
    }
    for (let i = P.length - 1; i >= 0; i--) {
      const q = P[i]; q.t += dt;
      if (q.t < 0) continue;
      if (q.t >= q.life) { P.splice(i, 1); continue; }
      const s = dt / 1000;
      q.vx += (q.ax || 0) * s; q.vy += (q.ay || 0) * s;
      if (q.swirl) q.vx += Math.sin(q.t / 90 + q.ph) * q.swirl * s;
      if (q.drag) { q.vx *= 1 - Math.min(.9, q.drag * s); q.vy *= 1 - Math.min(.9, q.drag * s); }
      q.x += q.vx * s; q.y += q.vy * s;
      const a = q.t / q.life, al = (q.fade === 'in' ? Math.sin(Math.PI * a) : 1 - a) * (q.alpha || 1);
      draw(q, al, q.size * (q.grow ? 1 + q.grow * a : 1));
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (P.length || M.length) raf = requestAnimationFrame(frame);
  }
  function draw(q, al, sz) {
    ctx.globalAlpha = Math.max(0, Math.min(1, al));
    ctx.globalCompositeOperation = q.blend === 'normal' ? 'source-over' : 'lighter';
    if (q.shape === 'streak') { ctx.strokeStyle = q.color; ctx.lineWidth = q.w || 1.5; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * .05, q.y - q.vy * .05); ctx.stroke(); }
    else if (q.shape === 'shard') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate((q.rot || 0) + q.t * (q.vr || 0) / 1000); ctx.fillStyle = q.color; ctx.fillRect(-sz / 2, -sz / 4, sz, sz / 2); ctx.restore(); }
    else if (q.shape === 'ring') { ctx.strokeStyle = q.color; ctx.lineWidth = q.w || 1.4; ctx.beginPath(); ctx.arc(q.x, q.y, sz, 0, Math.PI * 2); ctx.stroke(); }
    else if (q.shape === 'flake') { ctx.strokeStyle = q.color; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3 + q.t / 400; ctx.moveTo(q.x - Math.cos(a) * sz, q.y - Math.sin(a) * sz); ctx.lineTo(q.x + Math.cos(a) * sz, q.y + Math.sin(a) * sz); } ctx.stroke(); }
    else { const g = glow(q.color); ctx.drawImage(g, q.x - sz, q.y - sz, sz * 2, sz * 2); }
  }
  const add = q => { P.length < 900 && P.push(Object.assign({ t: 0 }, q)); };
  function burst(x, y, color, n, sp, life, size, o = {}) {
    for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), v = rnd(sp * .3, sp); add(Object.assign({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(life * .6, life), size: rnd(size * .6, size), color, drag: 3 }, o)); }
    kick();
  }
  // попадание срабатывает ровно один раз: по кадрам или по таймеру, если вкладка не рисуется
  function fire(m) { if (m.fired) return; m.fired = true; const i = M.indexOf(m); if (i >= 0) M.splice(i, 1); m.done && m.done(); }
  function fly(a, b, o) {
    const m = Object.assign({ x0: a.x, y0: a.y, x1: b.x, y1: b.y, t: 0 }, o);
    m.cx = (m.x0 + m.x1) / 2; m.cy = (m.y0 + m.y1) / 2 - (o.arc || 0);
    M.push(m); kick();
    setTimeout(() => { if (!dead) fire(m); }, T(m.dur + 80));
    return m;
  }
  function svgEl(tag, attrs, cls) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (cls) e.setAttribute('class', cls); svg.appendChild(e); return e; }
  function anim(e, frames, ms, o = {}) { const a = e.animate(frames, Object.assign({ duration: T(ms), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }, o, { delay: T(o.delay || 0) })); a.onfinish = () => e.remove(); return a; }
  function ring(x, y, color, r, ms = 520, w = 2) { const c = svgEl('circle', { cx: x, cy: y, r: 4 }, 'fx-ring'); c.style.stroke = color; c.style.strokeWidth = w; anim(c, [{ r: 4, opacity: .95 }, { r, opacity: 0 }], ms); }
  function icon(x, y, name, color, o = {}) {
    const g = svgEl('g', {}, 'fx-icon'); g.style.color = color;
    const bg = document.createElementNS(NS, 'circle'); bg.setAttribute('r', 11); bg.setAttribute('class', 'fx-icon-bg'); g.appendChild(bg);
    const u = document.createElementNS(NS, 'use'); u.setAttribute('href', '#i-' + name); u.setAttribute('x', -8); u.setAttribute('y', -8); u.setAttribute('width', 16); u.setAttribute('height', 16); g.appendChild(u);
    g.setAttribute('transform', `translate(${x} ${y})`);
    anim(g, o.frames || [{ transform: `translate(${x}px, ${y - 26}px) scale(1.5)`, opacity: 0 }, { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: 1, offset: .3 }, { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: 1, offset: .8 }, { transform: `translate(${x}px, ${y - 6}px) scale(.9)`, opacity: 0 }], o.ms || 1100);
    return g;
  }
  const later = (ms, f) => setTimeout(() => { if (!dead) f(); }, T(ms));

  /* ---------- виды эффектов ---------- */
  const fx = {
    center, burst, ring,
    slash(to, color = COL.steel, onHit, heavy) {
      const b = center(to), n = heavy ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const r = b.w * .8, s = i % 2 ? -1 : 1;
        const p = svgEl('path', { d: `M${b.x - r * s} ${b.y - b.h * .38 + i * 9} Q${b.x + 10 * s} ${b.y - 4} ${b.x + r * s} ${b.y + b.h * .3 - i * 7}` }, 'fx-slash');
        p.style.stroke = color; p.style.strokeDasharray = 220; p.style.strokeDashoffset = 220;
        anim(p, [{ strokeDashoffset: 220, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: .55 }, { strokeDashoffset: -90, opacity: 0 }], 300, { delay: i * 80 });
      }
      later(140, () => { burst(b.x, b.y, '#fff1cf', heavy ? 24 : 14, 240, 360, 3, { shape: 'streak', w: 1.3 }); burst(b.x, b.y, color, heavy ? 14 : 8, 130, 420, 5); onHit && onHit(); });
    },
    arrow(from, to, color = COL.steel, onHit) {
      const a = center(from), b = center(to);
      fly(a, b, { dur: 380, arc: 46,
        draw: p => { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.strokeStyle = '#e9dcc0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(5, 0); ctx.stroke(); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(2, -4); ctx.lineTo(2, 4); ctx.fill(); ctx.strokeStyle = rgba(color, .6); ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-23, -4); ctx.moveTo(-18, 0); ctx.lineTo(-23, 4); ctx.stroke(); ctx.restore(); },
        trail: p => { Math.random() < .6 && add({ x: p.x, y: p.y, vx: 0, vy: 0, life: 200, size: 2.2, color: '#fff3d6' }); },
        done: () => { burst(b.x, b.y, color, 12, 170, 300, 3, { shape: 'streak', w: 1.2 }); onHit && onHit(); } });
    },
    bolt(from, to, color = COL.spirit, onHit, big) {
      const a = center(from), b = center(to), r = big ? 22 : 15;
      fly(a, b, { dur: big ? 520 : 440, arc: 30,
        draw: p => { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glow(color), p.x - r, p.y - r, r * 2, r * 2); ctx.drawImage(glow('#ffffff'), p.x - 5, p.y - 5, 10, 10); },
        trail: p => { for (let k = 0; k < (big ? 3 : 2); k++) add({ x: p.x + rnd(-3, 3), y: p.y + rnd(-3, 3), vx: rnd(-25, 25), vy: rnd(-25, 25), life: 420, size: rnd(3, 6), color }); },
        done: () => { burst(b.x, b.y, color, big ? 40 : 22, 190, 560, 6); ring(b.x, b.y, color, big ? 52 : 34); onHit && onHit(); } });
    },
    wave(from, tos, color, onHit) {
      const a = center(from), ts = tos.map(center);
      if (!ts.length) return;
      const dir = ts[0].x > a.x ? 1 : -1;
      const y0 = Math.min(...ts.map(t => t.y - t.h / 2)) - 12, y1 = Math.max(...ts.map(t => t.y + t.h / 2)) + 12;
      const far = ts.reduce((m, t) => dir > 0 ? Math.max(m, t.x) : Math.min(m, t.x), a.x) + dir * 50;
      fly({ x: a.x, y: (y0 + y1) / 2 }, { x: far, y: (y0 + y1) / 2 }, { dur: 620, arc: 0,
        draw: p => { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(p.x - dir * 90, 0, p.x + dir * 10, 0); g.addColorStop(0, rgba(color, 0)); g.addColorStop(.85, rgba(color, .42)); g.addColorStop(1, rgba(color, 0)); ctx.fillStyle = g; ctx.fillRect(Math.min(p.x - dir * 90, p.x + dir * 10), y0, 100, y1 - y0); },
        trail: p => { for (let k = 0; k < 3; k++) add({ x: p.x, y: rnd(y0, y1), vx: dir * rnd(60, 160), vy: rnd(-40, 40), life: 460, size: rnd(2, 4.5), color }); } });
      const span = Math.abs(far - a.x) || 1;
      ts.forEach((t, i) => later(80 + Math.abs(t.x - a.x) / span * 560, () => { burst(t.x, t.y, color, 16, 150, 420, 5); onHit && onHit(i); }));
    },
    heal(to, onHit) {
      const b = center(to);
      for (let i = 0; i < 18; i++) add({ x: b.x + rnd(-b.w * .4, b.w * .4), y: b.y + rnd(0, b.h * .35), vx: rnd(-8, 8), vy: rnd(-80, -35), t: -rnd(0, 260), life: rnd(700, 1000), size: rnd(3, 6), color: COL.heal, fade: 'in' });
      ring(b.x, b.y, COL.heal, b.w * .8, 700, 1.6); kick();
      later(240, () => onHit && onHit());
    },
    hot(to) { const b = center(to); for (let i = 0; i < 7; i++) add({ x: b.x + rnd(-b.w * .35, b.w * .35), y: b.y + rnd(-4, b.h * .3), vx: rnd(-6, 6), vy: rnd(-50, -25), t: -rnd(0, 200), life: 700, size: rnd(2.5, 4.5), color: COL.heal, fade: 'in' }); kick(); },
    shield(to, onHit) {
      const b = center(to);
      const h = svgEl('ellipse', { cx: b.x, cy: b.y, rx: 6, ry: 8 }, 'fx-dome');
      anim(h, [{ rx: 6, ry: 8, opacity: 0 }, { rx: b.w * .72, ry: b.h * .62, opacity: .95, offset: .45 }, { rx: b.w * .66, ry: b.h * .58, opacity: 0 }], 820);
      burst(b.x, b.y, COL.shield, 12, 90, 520, 4);
      later(260, () => onHit && onHit());
    },
    taunt(from, tos) {
      const a = center(from);
      ring(a.x, a.y, COL.aggro, a.w * 1.4, 620, 3); later(160, () => ring(a.x, a.y, COL.aggro, a.w * 1.9, 700, 2));
      burst(a.x, a.y, COL.aggro, 18, 120, 600, 5);
      tos.forEach((t, i) => { const b = center(t); const l = svgEl('path', { d: `M${b.x} ${b.y} Q${(a.x + b.x) / 2} ${(a.y + b.y) / 2 - 30} ${a.x} ${a.y}` }, 'fx-taunt'); l.style.strokeDasharray = 400; l.style.strokeDashoffset = 400; anim(l, [{ strokeDashoffset: 400, opacity: .9 }, { strokeDashoffset: 0, opacity: .9, offset: .5 }, { strokeDashoffset: 0, opacity: 0 }], 900, { delay: 80 + i * 60 }); });
    },
    dot(to, school = 'Огонь') {
      const b = center(to), st = DOT[school] || 'ember', c = COL[school] || COL.aggro;
      if (st === 'ember') for (let i = 0; i < 12; i++) add({ x: b.x + rnd(-b.w * .4, b.w * .4), y: b.y + rnd(0, b.h * .35), vx: rnd(-12, 12), vy: rnd(-90, -40), t: -rnd(0, 200), life: rnd(500, 800), size: rnd(2.5, 5), color: i % 3 ? c : '#ffd08a', swirl: 60, ph: rnd(0, 6) });
      else if (st === 'bubble') for (let i = 0; i < 9; i++) add({ x: b.x + rnd(-b.w * .35, b.w * .35), y: b.y + rnd(0, b.h * .3), vx: rnd(-6, 6), vy: rnd(-45, -20), t: -rnd(0, 260), life: rnd(700, 1000), size: rnd(2.5, 5), color: i % 2 ? '#b7d35a' : c, shape: 'ring', fade: 'in' });
      else if (st === 'cut') for (let i = 0; i < 3; i++) { const y = b.y - b.h * .25 + i * b.h * .25; const l = svgEl('path', { d: `M${b.x - b.w * .45} ${y - 8} L${b.x + b.w * .45} ${y + 8}` }, 'fx-slash thin'); l.style.stroke = '#ffd9d0'; l.style.strokeDasharray = 120; l.style.strokeDashoffset = 120; anim(l, [{ strokeDashoffset: 120, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: .5 }, { strokeDashoffset: 0, opacity: 0 }], 360, { delay: i * 70 }); }
      else if (st === 'wisp') for (let i = 0; i < 12; i++) add({ x: b.x + rnd(-b.w * .3, b.w * .3), y: b.y + rnd(-b.h * .2, b.h * .3), vx: rnd(-20, 20), vy: rnd(-40, -10), t: -rnd(0, 240), life: rnd(700, 1000), size: rnd(3, 6), color: c, swirl: 140, ph: rnd(0, 6), fade: 'in' });
      else if (st === 'frost') for (let i = 0; i < 10; i++) add({ x: b.x + rnd(-b.w * .4, b.w * .4), y: b.y - b.h * .45, vx: rnd(-10, 10), vy: rnd(25, 60), t: -rnd(0, 300), life: 900, size: rnd(2.5, 4), color: c, shape: 'flake' });
      else if (st === 'sand') for (let i = 0; i < 14; i++) add({ x: b.x + rnd(-b.w * .35, b.w * .35), y: b.y - b.h * .45, vx: rnd(-6, 6), vy: rnd(40, 80), t: -rnd(0, 300), life: 800, size: rnd(1.5, 3), color: i % 2 ? '#e9d48f' : c });
      else for (let i = 0; i < 10; i++) add({ x: b.x + rnd(-b.w * .35, b.w * .35), y: b.y + rnd(0, b.h * .3), vx: rnd(-8, 8), vy: rnd(-60, -30), t: -rnd(0, 220), life: 800, size: rnd(3, 5), color: c, fade: 'in' });
      kick();
    },
    debuff(to, kind = 'weak') {
      const b = center(to);
      for (let i = 0; i < 14; i++) add({ x: b.x + rnd(-6, 6), y: b.y + rnd(-6, 6), vx: rnd(-50, 50), vy: rnd(-50, 50), life: 700, size: rnd(3, 6), color: '#6f5a9a', swirl: 160, ph: rnd(0, 6), fade: 'in' });
      icon(b.x, b.y - b.h * .15, ICON[kind] || 'down', '#ffb3a3'); kick();
    },
    ctrl(to, kind = 'stun') {
      const b = center(to), c = kind === 'silence' ? '#c7b8ff' : kind === 'stop' ? '#9ff0c0' : '#ffd08a';
      icon(b.x, b.y - b.h * .3, ICON[kind] || 'chain', c, { ms: 1300 });
      if (kind === 'stun') for (let i = 0; i < 5; i++) { const ph = i * Math.PI * 2 / 5; add({ x: b.x + Math.cos(ph) * 18, y: b.y - b.h * .3 + Math.sin(ph) * 6, vx: -Math.sin(ph) * 40, vy: Math.cos(ph) * 14, life: 1000, size: 3.5, color: '#ffe19a' }); }
      if (kind === 'stop') for (let i = 0; i < 12; i++) add({ x: b.x + rnd(-b.w * .3, b.w * .3), y: b.y - b.h * .4, vx: rnd(-5, 5), vy: rnd(40, 70), life: 900, size: rnd(1.5, 3), color: '#e9d48f' });
      kick();
    },
    drain(from, to) {
      const a = center(from), b = center(to);
      for (let i = 0; i < 6; i++) later(i * 70, () => fly({ x: a.x + rnd(-8, 8), y: a.y + rnd(-8, 8) }, b, { dur: 520, arc: rnd(-40, 40), draw: p => { ctx.globalAlpha = .9; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glow('#b98cff'), p.x - 6, p.y - 6, 12, 12); } }));
    },
    dispel(to) { const b = center(to); burst(b.x, b.y, COL.shield, 22, 200, 700, 7, { shape: 'shard', blend: 'normal', vr: 8, ay: 180, rot: 0 }); ring(b.x, b.y, COL.shield, b.w * .8, 400); },
    ult(from, color = COL.spirit) {
      const a = center(from);
      const f = document.createElement('div'); f.className = 'fx-flash'; f.style.setProperty('--c', rgba(color, .35)); host.appendChild(f);
      anim(f, [{ opacity: 0 }, { opacity: 1, offset: .25 }, { opacity: 0 }], 900);
      ring(a.x, a.y, color, 90, 800, 3); later(120, () => ring(a.x, a.y, '#ffffff', 60, 600, 2));
      burst(a.x, a.y, color, 60, 260, 900, 7);
      fx.shake(7, 420);
    },
    crit(to) { const b = center(to); burst(b.x, b.y, COL.gold, 26, 260, 520, 4, { shape: 'streak', w: 1.6 }); fx.shake(3, 180); },
    miss(to, side) { const b = center(to), d = side ? -1 : 1; fly({ x: b.x - d * 70, y: b.y - 10 }, { x: b.x + d * 70, y: b.y - 26 }, { dur: 260, arc: 10, draw: p => { ctx.globalAlpha = .8; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glow('#dcd4c0'), p.x - 5, p.y - 5, 10, 10); }, trail: p => add({ x: p.x, y: p.y, vx: 0, vy: 0, life: 200, size: 2, color: '#dcd4c0' }) }); },
    resist(to, kind) { const b = center(to); icon(b.x, b.y - b.h * .3, ICON[kind] || 'chain', '#c9c3b5', { ms: 600 }); later(300, () => burst(b.x, b.y - b.h * .3, '#c9c3b5', 16, 150, 500, 5, { shape: 'shard', blend: 'normal', vr: 6 })); },
    death(to) {
      const b = center(to);
      for (let i = 0; i < 46; i++) add({ x: b.x + rnd(-b.w * .45, b.w * .45), y: b.y + rnd(-b.h * .45, b.h * .45), vx: rnd(-20, 20), vy: rnd(-20, 30), ay: 260, life: rnd(700, 1200), size: rnd(1.5, 3.5), color: i % 3 ? COL.dust : '#6d5a40', shape: 'shard', blend: 'normal', vr: rnd(-6, 6) });
      kick();
    },
    shake(px, ms) { const t = host.parentElement || host; t.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${px}px,${-px / 2}px)` }, { transform: `translate(${-px}px,${px / 2}px)` }, { transform: 'translate(0,0)' }], { duration: T(ms), iterations: 1 }); },
    destroy() { dead = true; cancelAnimationFrame(raf); cv.remove(); svg.remove(); },
    host,
  };
  return fx;
}

root.EnFx = { create, KINDS, COL, ICON };
})(typeof window !== 'undefined' ? window : globalThis);
