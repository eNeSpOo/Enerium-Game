/* screens/talk.js — разговор с проводником Убежища (§28.2 GDD). Слова автора 30.09.2026: «Окно диалога выглядит слабо, хочется
   увидеть AAA-уровень UI и графики».
   Сцена во весь экран игры. За спиной — Убежище в дымке и виньетке, камера медленно плывёт. Справа — проводник крупным планом
   в контровом свете своего тона, свет снизу; он дышит: грудь поднимается от пояса, полы плаща качаются от пояса, вес переходит
   с ноги на ногу. Слева — реплика на тёмном стекле с уголками кованого железа и старого золота; под ней ответы, как в хороших RPG:
   номер в медальоне, свет при наведении и нажатии; главный ответ — переход к заданию — светится снизу, «Вернуться» — вторичный.
   Под проводником — табличка имени с гербом роли. Пыль в луче и искры тона проводника — лёгкие.
   Реплика печатается по буквам, на знаках — паузы; нажатие на сцену или реплику, Enter и пробел — реплика целиком. Ответы доступны
   с первого кадра: пропуск рассказа не мешает перейти к заданию, чтение ничего не выдаёт (§28.2). Цифры — ответы, Esc — в Убежище.
   Время — CSS по отметкам разговора в S.overlay: at — вход, lineAt — начало печати реплики, typed — реплика, показанная целиком.
   Разметка рисуется из момента от начала, поэтому перерисовка посреди входа или печати ничего не повторяет и не рвёт.
   Уход — коротко: класс out, переход — через TK_VIEW.out мс. prefers-reduced-motion — без движения: класс still, реплика целиком,
   частицы стоят, вход и уход — сразу.
   Регистрирует: OV.npc — окно разговора; ACT.npc (открыть, снимает «новый разговор» — дело шахты), talkmore, talkgo, talkbye,
   tkskip; клавиши; раздел UI-кита «Диалог проводника» (KIT_EXTRA); сценарии презентации. Карта экранов — ready: npc-dialog
   у карточки «Убежище» (MAP в index.html).
   Данные: реплики, имя, роль, картинка и переход — NPCS в index.html (демо-реплики, не канон — §28.2; команде помечены); кадр фигуры,
   свет, герб и значок пути — TK_CAST; числа вида — TK_VIEW; тексты игрока — TK_TEXT. Арт — TK_ART: гербы ролей, медальон номера
   и уголок рамки (tools/art-gen/jobs/talk.json → tools/art-gen/round_trim.py → выгрузка export_ui.py в assets/art/talk/).
   Пока пути нет в TK_ART.ready — медальоны, гербы и уголки рисуют CSS и SVG, битых картинок нет.
   Служебное — только команде: TM из index.html. Автопроверка — tools/content-gen/screens/check_talk.js. */
'use strict';

/* ================== вид: числа анимации, не баланс ================== */
const TK_VIEW = {
  step: 26,              // печать: мс на букву
  stepMin: 12,           // длинная реплика печатается быстрее, но не быстрее стольких мс на букву
  typeMax: 2600,         // реплика печатается не дольше стольких мс, пока шаг не упрётся в stepMin
  pause: { '.': 8, '!': 8, '?': 8, '…': 10, ',': 3, ';': 4, ':': 4, '—': 4 },   // знак перед пробелом или в конце — пауза во столько букв
  glyph: 200,            // буква проявляется за столько мс
  firstLine: 420,        // первая реплика печатается через столько мс после входа: сначала сцена, потом голос
  ans: 320, ansStep: 70, // ответы входят через столько мс после входа, шаг между ними
  out: 240,              // уход, мс
  ar: [447, 820],        // пропорции фигуры проводника по умолчанию — px исходника (assets/art/shelter-*.png)
  dust: 16,              // пылинок в луче
  sparks: 7,             // искр тона проводника
};
/* свет — токены палитры, rgb без альфы: --spirit, --amber, --time (карст Энериум), --gold, --rust */
const TK_TONE = { spirit: '72,229,212', amber: '230,168,75', time: '79,220,139', gold: '221,188,122', rust: '220,106,82' };
/* проводники: герб (картинка talk/crest-*.png, запасной знак TK_SIGIL), свет сцены и искры (TK_TONE), значок пути главного ответа
   (PATH), кадр фигуры: h — высота картинки, % высоты экрана; y — насколько её низ ниже края экрана, %; x — сдвиг вбок, % ширины;
   waist — пояс, % высоты картинки: выше дышит грудь, ниже качаются полы; breath — вдох, ‰ сверх 1; sway — качание пол, десятые градуса.
   Кадр — «по колено»: голова в верхней десятой экрана, ноги уходят за нижний край */
const TK_CAST = {
  enzo: { crest: 'contracts', light: 'spirit', spark: 'rust', path: 38, fig: { h: 128, y: 27, x: 0, waist: 42, breath: 10, sway: 9 } },
  smith: { crest: 'forge', light: 'amber', spark: 'amber', path: 11, fig: { h: 130, y: 23, x: 2, waist: 46, breath: 12, sway: 4 } },
  alch: { crest: 'shop', light: 'time', spark: 'time', path: 11, fig: { h: 128, y: 19, x: 0, waist: 47, breath: 10, sway: 8 } },
  mage: { crest: 'memory', light: 'spirit', spark: 'gold', path: 29, fig: { h: 128, y: 30, x: 0, waist: 42, breath: 9, sway: 10 } },
};
/* проводник без строки в TK_CAST — кадр и свет по умолчанию, знак вместо герба */
const TK_DEF = { crest: '', light: 'spirit', spark: 'gold', path: 12, fig: { h: 128, y: 26, x: 0, waist: 45, breath: 10, sway: 7 } };
/* тексты игрока */
const TK_TEXT = { more: 'Расскажи больше', bye: 'Вернуться в Убежище', answers: 'Ответы', talk: 'Разговор', line: (i, n) => `Реплика ${i} из ${n}` };
/* арт: выгруженные пути (design/ui/assets/art/…); пути нет — CSS и SVG */
const TK_ART = {
  ready: ['talk/crest-contracts.png', 'talk/crest-forge.png', 'talk/crest-shop.png', 'talk/crest-memory.png', 'talk/medallion.png', 'talk/corner.png'],
  crest: 'talk/crest-',        // + герб + .png
  medal: 'talk/medallion.png',
  corner: 'talk/corner.png',
};
/* запасные знаки ролей — контур старым золотом в медальоне CSS, пока герба нет */
const TK_SIGIL = {
  contracts: '<path d="M7 4h9.5a2.5 2.5 0 0 1 0 5H15"/><path d="M7 4a2.5 2.5 0 0 0-2.5 2.5V17a3 3 0 0 0 3 3h7"/><path d="M8.5 9.5h5M8.5 12.5h4"/><circle cx="16" cy="16.5" r="3"/><path d="M3.5 21.5l5.5-5.5"/>',
  forge: '<path d="M4.5 13.5h11c0 2.2-1.6 3.5-3.8 3.5v2h2.8V21H7v-2h2.8v-2c-3 0-5.3-1.4-5.3-3.5z"/><path d="M13.5 4.5l6 6M16.5 7.5l-5.5 5"/>',
  shop: '<path d="M10 3.5h4M10.6 3.5v5.4L6.3 16.3A3 3 0 0 0 8.9 21h6.2a3 3 0 0 0 2.6-4.7l-4.3-7.4V3.5"/><path d="M7.6 15h8.8"/>',
  memory: '<path d="M3.5 8c3-1.4 5.8-1.3 8.5.8 2.7-2.1 5.5-2.2 8.5-.8v11c-3-1.4-5.8-1.3-8.5.8-2.7-2.1-5.5-2.2-8.5-.8z"/><path d="M12 8.8v11"/><path d="M12 1.8l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  guide: '<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.6-4 3.2-6.5 6.5-6.5s5.9 2.5 6.5 6.5"/>',
};
/* запасной уголок рамки: железная скоба с кромкой старого золота и камнем бирюзы; три других угла — отражения */
const TK_CORNER_SVG = '<svg class="tk-orn" viewBox="0 0 40 40" aria-hidden="true"><path d="M2.5 31V5.5a3 3 0 0 1 3-3H31" stroke="#b1915a" stroke-width="2.2"/>'
  + '<path d="M7 26V9a2 2 0 0 1 2-2h17" stroke="#6a5534" stroke-width="1"/><path d="M31 2.5c3 0 4.5 1.6 4.5 3.5S34 9 32.5 9M2.5 31c0 3 1.6 4.5 3.5 4.5S9 34 9 32.5" stroke="#ddbc7a" stroke-width="1.4"/>'
  + '<path d="M12 12c0-2.8 2-4.6 4.6-4.6M12 12c-2.8 0-4.6 2-4.6 4.6" stroke="#ddbc7a" stroke-width="1" opacity=".7"/><path d="M5.5 1.8l3.7 3.7-3.7 3.7-3.7-3.7z" fill="#48e5d4" stroke="#ddbc7a" stroke-width=".8"/></svg>';
const TK_ORN = ['tl', 'tr', 'bl', 'br'];

/* ================== время, «меньше движения», мелочи ================== */
const tkNow = () => { try { return Math.round(performance.now()); } catch (_) { return 0; } };
const tkReduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } };
const tkEsc = x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tkArt = p => TK_ART.ready.includes(p);
const tkRoot = () => { try { return document.querySelector('.g .tk'); } catch (_) { return null; } };
/* номер реплики — в пределах реплик проводника */
const tkIdx = o => { const n = o && NPCS[o.arg]; return n ? Math.max(0, Math.min(o.i || 0, n.say.length - 1)) : 0; };
function tkCast(k) {
  const c = TK_CAST[k] || {};
  return Object.assign({}, TK_DEF, c, { fig: Object.assign({}, TK_DEF.fig, c.fig || {}) });
}

/* ================== печать реплики ==================
   План — один на строку: у каждой буквы отметка --t, мс от начала печати; знак перед пробелом или в конце держит паузу.
   Пробелы не анимируются — строка переносится по словам как обычный текст, место под реплику занято сразу, текст не прыгает */
const TK_PLANS = new Map();
function tkPlan(line) {
  const key = String(line); if (TK_PLANS.has(key)) return TK_PLANS.get(key);
  const ch = [...key], P = TK_VIEW.pause, at = [];
  let u = 0;
  ch.forEach((c, i) => { at.push(u); u += 1 + (P[c] && (i === ch.length - 1 || ch[i + 1] === ' ') ? P[c] : 0); });
  const step = Math.max(TK_VIEW.stepMin, Math.min(TK_VIEW.step, Math.floor(TK_VIEW.typeMax / Math.max(1, u))));
  const html = ch.map((c, i) => c === ' ' ? ' ' : `<i style="--t:${at[i] * step}">${tkEsc(c)}</i>`).join('');
  const plan = { html, step, total: (ch.length ? at[ch.length - 1] * step : 0) + TK_VIEW.glyph };
  TK_PLANS.set(key, plan);
  return plan;
}
/* отметки разговора: сценарий или проверка могли открыть окно без них — первая отрисовка их ставит */
function tkClock(o) {
  const now = tkNow();
  if (o.at == null) o.at = now;
  if (o.lineAt == null) o.lineAt = o.at + TK_VIEW.firstLine;
  return { el: Math.max(0, now - o.at), lel: now - o.lineAt };
}
/* печать идёт: реплика не показана целиком и её время не вышло */
function tkTyping(o) {
  const n = o && o.t === 'npc' && NPCS[o.arg]; if (!n || tkReduced()) return false;
  const i = tkIdx(o); if (o.typed === i) return false;
  if (o.lineAt == null) return true;
  return tkNow() - o.lineAt < tkPlan(n.say[i]).total;
}

/* ================== ответы: три направления §28.2 ==================
   продолжить рассказ — пока есть реплики; сразу к заданию — главный; вернуться в Убежище — вторичный. Номер — по порядку */
function tkAnswers(k, o) {
  const n = NPCS[k]; if (!n) return [];
  const c = tkCast(k), i = tkIdx(Object.assign({}, o, { arg: k })), out = [];
  if (i < n.say.length - 1) out.push({ act: 'talkmore', v: '', t: TK_TEXT.more, cls: 'more' });
  if (n.go) out.push({ act: 'talkgo', v: n.go[0], t: n.go[1], cls: 'go', path: c.path });
  out.push({ act: 'talkbye', v: '', t: TK_TEXT.bye, cls: 'back' });
  return out.map((a, j) => Object.assign(a, { key: String(j + 1) }));
}

/* ================== части сцены ================== */
const tkMedal = key => tkArt(TK_ART.medal)
  ? `<span class="tk-k" aria-hidden="true"><img src="${AV(TK_ART.medal)}" alt="" draggable="false"><b>${key}</b></span>`
  : `<span class="tk-k css" aria-hidden="true"><b>${key}</b></span>`;
function tkCrest(c) {
  const p = c.crest ? TK_ART.crest + c.crest + '.png' : '';
  return p && tkArt(p) ? `<span class="tk-crest" aria-hidden="true"><img src="${AV(p)}" alt="" draggable="false"></span>`
    : `<span class="tk-crest css" aria-hidden="true"><svg viewBox="0 0 24 24">${TK_SIGIL[c.crest] || TK_SIGIL.guide}</svg></span>`;
}
function tkCorners() {
  if (tkArt(TK_ART.corner)) return TK_ORN.map(p => `<img class="tk-orn ${p}" src="${AV(TK_ART.corner)}" alt="" draggable="false">`).join('');
  return TK_ORN.map(p => TK_CORNER_SVG.replace('class="tk-orn"', `class="tk-orn ${p}"`)).join('');
}
/* частицы — свои у каждого проводника и одни и те же при каждой отрисовке: генератор на сиде имени, только целые */
const tkSeed = k => [...String(k)].reduce((h, ch) => (h * 31 + ch.codePointAt(0)) % 2147483647, 7) || 1;
function tkRng(seed) { let s = seed; return n => { s = (s * 48271) % 2147483647; return s % n; }; }
function tkDust(k) {
  const r = tkRng(tkSeed(k)), out = [];
  for (let j = 0; j < TK_VIEW.dust; j++) {
    const wide = j % 3 === 0, dur = 7000 + r(6000);   // каждая третья — по всему кадру, остальные — в луче за проводником
    out.push(`<i style="--x:${wide ? 4 + r(92) : 58 + r(38)}%;--s:${2 + r(3)}px;--dur:${dur}ms;--del:-${r(dur)}ms;--rise:${55 + r(40)}cqh;--dx:${r(41) - 20}px;--o:${30 + r(45)};--ph:${10 + r(80)}"></i>`);
  }
  for (let j = 0; j < TK_VIEW.sparks; j++) {
    const dur = 2400 + r(2400);
    out.push(`<i class="sp" style="--x:${62 + r(32)}%;--s:2px;--dur:${dur}ms;--del:-${r(dur)}ms;--rise:${24 + r(34)}cqh;--dx:${r(61) - 30}px;--o:${60 + r(40)};--ph:${10 + r(60)}"></i>`);
  }
  return out.join('');
}

/* ================== окно разговора ==================
   peek — показ в UI-ките: кнопки не зовут ACT игры (data-tkk), без id и без модальности; still — без движения */
function tkHtml(o, opt = {}) {
  const k = o && o.arg, n = k && NPCS[k]; if (!n) return '';
  const c = tkCast(k), i = tkIdx(o), line = n.say[i], still = !!opt.still, peek = !!opt.peek, f = c.fig, ar = c.ar || TK_VIEW.ar;
  const { el, lel } = tkClock(o), plan = tkPlan(line);
  const typed = still || o.typed === i || lel >= plan.total, left = typed ? 0 : Math.max(0, plan.total - lel);
  const vars = [`--el:${el}ms`, `--lel:${lel}ms`, `--left:${left}ms`, `--glyph:${TK_VIEW.glyph}ms`, `--tone:${TK_TONE[c.light] || TK_TONE.spirit}`,
    `--spark:${TK_TONE[c.spark] || TK_TONE.gold}`, `--fh:${f.h}cqh`, `--fy:${f.y}cqh`, `--fx:${f.x}%`, `--ar:${(ar[0] / ar[1]).toFixed(4)}`,
    `--waist:${f.waist}%`, `--breath:${(1000 + f.breath) / 1000}`, `--sway:${f.sway / 10}deg`].join(';');
  const act = (a, v) => (peek ? `data-tkk="${a}"` : `data-a="${a}"`) + (v ? ` data-v="${tkEsc(v)}"` : '');
  const answers = tkAnswers(k, o).map((a, j) => `<button class="tk-a ${a.cls}" ${act(a.act, a.v)} data-k="${a.key}" style="--d:${TK_VIEW.ans + j * TK_VIEW.ansStep}ms"${peek ? ' tabindex="-1"' : ''}>`
    + `${tkMedal(a.key)}<span class="tk-t">${tkEsc(a.t)}</span>${a.path ? `<img class="tk-p" src="${PATH(a.path)}" alt="" draggable="false">` : ''}${a.cls === 'go' && !still ? '<i class="tk-shine" aria-hidden="true"><i class="tk-sheen"></i></i>' : ''}</button>`).join('');
  const pages = n.say.length > 1 ? `<span class="tk-pg" role="img" aria-label="${TK_TEXT.line(i + 1, n.say.length)}">${n.say.map((_, j) => `<i${j === i ? ' class="on"' : j < i ? ' class="was"' : ''}></i>`).join('')}</span>` : '';
  const say = typed ? tkEsc(line) : `<span class="sr">${tkEsc(line)}</span><span class="tk-gl" aria-hidden="true">${plan.html}</span>`;
  const cls = ['tk', still ? 'still' : '', typed ? 'typed' : '', peek ? 'peek' : ''].filter(Boolean).join(' ');
  const root = peek ? `role="group" aria-label="${TK_TEXT.talk}: ${tkEsc(n.n)}" data-tkk="tkskip"` : 'role="dialog" aria-modal="true" aria-labelledby="tkName" data-a="tkskip"';
  return `<div class="${cls}" ${root} data-npc="${tkEsc(k)}" style="${vars}">
    <div class="tk-bg" aria-hidden="true"><div class="tk-cam"><img class="tk-room" src="${ART('shelter-room.jpg')}" alt="" draggable="false"></div><i class="tk-shade"></i></div>
    <i class="tk-shaft" aria-hidden="true"></i>
    <div class="tk-who" aria-hidden="true"><div class="tk-fig"><div class="tk-body"><img class="tk-up" src="${n.img}" alt="" draggable="false"><img class="tk-lo" src="${n.img}" alt="" draggable="false"></div></div></div>
    <i class="tk-haze" aria-hidden="true"></i>
    <div class="tk-dust" aria-hidden="true">${tkDust(k)}</div>
    <div class="tk-plate">${tkCrest(c)}<span class="tk-nm"><b${peek ? '' : ' id="tkName"'}>${tkEsc(n.n)}</b><small>${tkEsc(n.role)}</small><i></i></span></div>
    <section class="tk-side">
      <div class="tk-box">${tkCorners()}${TM('демо-реплика', 'span', 'chip tk-tm')}
        <div class="tk-scroll" data-keep="tk-${tkEsc(k)}-${i}"><p class="tk-say" aria-live="polite">${say}</p></div>
        <div class="tk-foot">${pages}${typed ? '' : '<i class="tk-more" aria-hidden="true"></i>'}</div>
      </div>
      <div class="tk-ans" role="group" aria-label="${TK_TEXT.answers}">${answers}</div>
    </section>
  </div>`;
}
const tkView = o => tkHtml(o, { still: tkReduced() });

/* ================== уход: коротко, потом переход ==================
   Пока идёт уход, окно не слушает ни ответов, ни пропуска: второе нажатие переход не повторяет, перерисовка не возвращает окно */
let tkGoing = null;
const tkBusy = () => !!tkGoing && tkGoing === S.overlay;
function tkLeave(fn) {
  const el = tkRoot();
  if (!el || !el.classList || tkReduced()) { fn(); return; }
  if (tkBusy()) return;
  tkGoing = S.overlay;
  el.classList.add('out');
  setTimeout(() => { tkGoing = null; fn(); }, TK_VIEW.out);
}

/* ================== регистрация: окно и действия ================== */
Object.assign(OV, { npc: o => tkView(o) });
Object.assign(ACT, {
  npc(v) {
    if (!NPCS[v]) return;
    const t = tkNow();
    S.overlay = { t: 'npc', arg: v, i: 0, at: t, lineAt: t + TK_VIEW.firstLine };
    NPCS[v].isNew = false;
    render(); focusOverlay();
  },
  talkmore() {
    const o = S.overlay, n = o && o.t === 'npc' && NPCS[o.arg];
    if (!n || tkBusy() || tkIdx(o) >= n.say.length - 1) return;
    o.i = tkIdx(o) + 1; o.lineAt = tkNow(); o.typed = null;
    render(); focusOverlay();
  },
  talkgo(v) {
    const o = S.overlay, n = o && o.t === 'npc' && NPCS[o.arg];
    if (!n || !n.go || n.go[0] !== v) return;
    tkLeave(() => { if (v === 'mem') { S.overlay = null; open('mem'); return; } ACT.go(v); });
  },
  talkbye() { if (!S.overlay || S.overlay.t !== 'npc') return; tkLeave(() => close()); },
  tkskip() {
    const o = S.overlay; if (!tkTyping(o) || tkBusy()) return;
    o.typed = tkIdx(o);
    const el = tkRoot();
    if (el && el.classList) el.classList.add('typed'); else render();
  },
});

/* ================== клавиши: цифры — ответы, Enter и пробел — реплика целиком, Esc — в Убежище ==================
   Раньше общего Esc из index.html: он закрыл бы окно без ухода */
function tkKeyAct(key, o = S.overlay) {
  if (!o || o.t !== 'npc' || !NPCS[o.arg]) return null;
  if (key === 'Escape') return { a: 'talkbye', v: '' };
  if ((key === 'Enter' || key === ' ') && tkTyping(o)) return { a: 'tkskip', v: '' };
  const x = /^[1-9]$/.test(key) ? tkAnswers(o.arg, o).find(a => a.key === key) : null;
  return x ? { a: x.act, v: x.v } : null;
}
let tkAteSpace = false;   // пробел ушёл на пропуск печати: его отпускание не нажимает кнопку в фокусе
function tkKey(e) {
  if (!e || e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
  const g = typeof $game === 'function' ? $game() : null;
  if (!g || !g.getClientRects || !g.getClientRects().length) return;   // игра на другой вкладке презентации
  const x = tkKeyAct(e.key); if (!x) return;
  e.preventDefault(); e.stopPropagation();
  tkAteSpace = e.key === ' ';
  ACT[x.a](x.v);
}
function tkKeyUp(e) { if (e && e.key === ' ' && tkAteSpace) { tkAteSpace = false; e.preventDefault(); e.stopPropagation(); } }
if (typeof window !== 'undefined' && window.addEventListener) { window.addEventListener('keydown', tkKey, true); window.addEventListener('keyup', tkKeyUp, true); }

/* ================== UI-кит: «Диалог проводника» ==================
   Живая сцена в кадре телефона: проводники, два размера экрана, вход заново, без движения; ответы в ней листают и уходят, как в игре.
   Ниже — состояния ответа, гербы ролей и устройство окна */
const TK_KIT = { npc: 'enzo', sm: false, still: false, o: null };
function tkKitFresh() { const t = tkNow(); TK_KIT.o = { t: 'npc', arg: TK_KIT.npc, i: 0, at: t, lineAt: t + TK_VIEW.firstLine }; }
function tkKitStage() {
  if (!NPCS[TK_KIT.npc]) TK_KIT.npc = Object.keys(NPCS)[0];
  if (!TK_KIT.o || TK_KIT.o.arg !== TK_KIT.npc) tkKitFresh();
  return tkHtml(TK_KIT.o, { peek: true, still: TK_KIT.still || tkReduced() });
}
function tkKitHtml() {
  const keys = Object.keys(NPCS); if (!keys.length) return '';
  const chip = (attr, v, on, t) => `<button class="p-chip" ${attr}="${v}" aria-pressed="${on}">${t}</button>`;
  const cell = (name, note, cls, key, t, path) => `<div class="tk-kit-cell"><b class="serif" style="color:var(--gold);font-size:17px">${name}</b>`
    + `<button class="tk-a ${cls}" tabindex="-1" data-k="${key}" style="--d:0ms">${tkMedal(key)}<span class="tk-t">${t}</span>${path ? `<img class="tk-p" src="${PATH(path)}" alt="">` : ''}</button><small>${note}</small></div>`;
  const go = NPCS[TK_KIT.npc] && NPCS[TK_KIT.npc].go ? NPCS[TK_KIT.npc].go[1] : 'К заданию', path = tkCast(TK_KIT.npc).path;
  const ms = x => `${x} мс`;
  const need = [...new Set(keys.map(k => tkCast(k).crest).filter(Boolean).map(c => TK_ART.crest + c + '.png').concat([TK_ART.medal, TK_ART.corner]))];
  const art = need.filter(tkArt).length;
  return `<section class="k-box" style="grid-column:1/-1" id="tkKit"><h3>Диалог проводника</h3>
    <p class="k-note">Разговор открывается во весь экран (§28.2): Убежище за спиной в дымке, проводник справа в контровом свете своего тона, свет снизу; он дышит — грудь, полы плаща, вес. Слева реплика печатается по буквам — нажатие показывает её сразу; ответы доступны с первого кадра. Нажмите ответ в сцене — «Расскажи больше» листает, переход и выход играют уход.</p>
    <div class="tk-kit-bar">${keys.map(k => chip('data-tkn', k, k === TK_KIT.npc, tkEsc(NPCS[k].n))).join('')}<span class="faint">·</span>${chip('data-tks', 'lg', !TK_KIT.sm, '932 × 430')}${chip('data-tks', 'sm', TK_KIT.sm, '844 × 390')}<span class="faint">·</span>${chip('data-tkr', '1', false, 'Вход заново')}${chip('data-tkm', '1', TK_KIT.still, 'Без движения')}</div>
    <div class="tk-kit-wrap"><div class="tk-kit-dev${TK_KIT.sm ? ' sm' : ''}" id="tkKitDev">${tkKitStage()}</div></div>
    <div class="tk-kit-row">
      ${cell('Ответ', 'Номер в медальоне — он же клавиша', 'more', '1', TK_TEXT.more)}
      ${cell('Наведение и фокус', 'Свет слева направо, медальон светится, текст шагает вперёд', 'more is-hover', '1', TK_TEXT.more)}
      ${cell('Нажатие', 'Медальон вдавливается, свет — полный', 'more is-hover is-press', '1', TK_TEXT.more)}
      ${cell('Главный — к заданию', 'Светится снизу всегда; после печати по нему проходит блик. Значок — путь, куда ведёт', 'go', '2', tkEsc(go), path)}
      ${cell('Вторичный — выход', 'Тише остальных, медальон меньше; Esc — то же', 'back', '3', TK_TEXT.bye)}
    </div>
    <div class="tk-kit-crests">${keys.map(k => { const c = tkCast(k); return `<figure style="--tone:${TK_TONE[c.light] || TK_TONE.spirit}">${tkCrest(c)}<figcaption>${tkEsc(NPCS[k].n)}<br><span class="faint">${tkEsc(NPCS[k].role)}</span></figcaption></figure>`; }).join('')}</div>
    <div class="k-air-g">
      <div class="k-air-r"><b>Сцена</b><small>Фон — комната Убежища в дымке и виньетке, камера медленно плывёт. Слева темнее — под текст. За проводником — столп света его тона, у нижнего края — лужа света, ноги уходят в темноту.</small></div>
      <div class="k-air-r"><b>Проводник</b><small>Кадр «по колено»: голова в верхней десятой экрана. Контровой свет — тонкая кромка тона по силуэту. Дыхание — грудь от пояса, полы плаща от пояса, вес — от ступней; только transform.</small></div>
      <div class="k-air-r"><b>Реплика</b><small>Тёмное стекло, кромка старого золота, уголки кованого железа. Печать: ${ms(TK_VIEW.step)} на букву, на точке — пауза в ${TK_VIEW.pause['.']} букв, реплика — не дольше ${ms(TK_VIEW.typeMax)}. Нажатие, Enter или пробел — целиком. Ромбы — реплики проводника.</small></div>
      <div class="k-air-r"><b>Ответы</b><small>Три направления (§28.2): рассказ дальше, сразу к заданию, назад в Убежище. Пропуск рассказа не мешает заданию; чтение ничего не выдаёт. Цифры — клавиши, Esc — выход. Касание — не меньше 44 px.</small></div>
      <div class="k-air-r"><b>Табличка и герб</b><small>Под проводником: герб роли в медальоне тёмного железа, имя старым золотом, роль — метка. Снизу по табличке — нить света тона.</small></div>
      <div class="k-air-r"><b>Вход и уход</b><small>Вход — сцена уходит в дымку, проводник выходит справа, реплика поднимается снизу, ответы — по очереди через ${ms(TK_VIEW.ansStep)}, печать — через ${ms(TK_VIEW.firstLine)}. Уход — ${ms(TK_VIEW.out)}. «Меньше движения» — сразу и без частиц в движении.</small></div>
    </div>
    ${TM(`<p class="k-note">Арт — ${art} из ${need.length} картинок рисунком (гербы ролей, медальон номера, уголок рамки): задание <code>tools/art-gen/jobs/talk.json</code>, круг по кромке — <code>tools/art-gen/round_trim.py</code>, пути — <code>TK_ART.ready</code>; без выгрузки — CSS и SVG. Реплики — демо (NPCS в index.html), не канон: автор даёт тексты отдельно (§28.2). Кадр фигуры и свет — <code>TK_CAST</code>, числа анимации — <code>TK_VIEW</code>.</p>`, 'div')}
  </section>`;
}
function tkKitPaint() {
  const box = document.getElementById('tkKit'); if (!box || !box.addEventListener) return;
  const dev = () => document.getElementById('tkKitDev');
  const stage = () => { const d = dev(); if (d) { d.className = 'tk-kit-dev' + (TK_KIT.sm ? ' sm' : ''); d.innerHTML = tkKitStage(); } };
  const press = (sel, on) => box.querySelectorAll(sel).forEach(b => b.setAttribute('aria-pressed', String(on(b))));
  box.addEventListener('click', e => {
    const t = e.target && e.target.closest ? e.target.closest('[data-tkn],[data-tks],[data-tkr],[data-tkm],[data-tkk]') : null; if (!t) return;
    e.preventDefault();
    const d = t.dataset;
    if (d.tkn) { TK_KIT.npc = d.tkn; tkKitFresh(); press('[data-tkn]', b => b.dataset.tkn === TK_KIT.npc); }
    else if (d.tks) { TK_KIT.sm = d.tks === 'sm'; press('[data-tks]', b => (b.dataset.tks === 'sm') === TK_KIT.sm); }
    else if (d.tkr) tkKitFresh();
    else if (d.tkm) { TK_KIT.still = !TK_KIT.still; t.setAttribute('aria-pressed', String(TK_KIT.still)); }
    else {
      const o = TK_KIT.o, root = dev() ? dev().querySelector('.tk') : null;
      if (d.tkk === 'tkskip') { if (tkTyping(o)) { o.typed = tkIdx(o); if (root) root.classList.add('typed'); } return; }
      if (d.tkk === 'talkmore') { o.i = tkIdx(o) + 1; o.lineAt = tkNow(); o.typed = null; }
      else if (root && !TK_KIT.still && !tkReduced()) { root.classList.add('out'); setTimeout(() => { tkKitFresh(); stage(); }, TK_VIEW.out + 260); return; }
      else tkKitFresh();
    }
    stage();
  });
}
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: tkKitHtml, paint: tkKitPaint });

/* ================== сценарии презентации ================== */
if (NPCS.smith) FLOWS.push(['Разговор · Кузнец', 'Тёплый свет горна и искры; реплика печатается по буквам — нажатие показывает сразу, цифры — ответы', () => { S.route = 'shelter'; S.overlay = { t: 'npc', arg: 'smith', i: 0 }; }]);
if (NPCS.mage) FLOWS.push(['Разговор · Хранитель знаний', 'Последняя реплика: «Расскажи больше» ушёл, остались «Вспомнить» и выход', () => { S.route = 'shelter'; S.overlay = { t: 'npc', arg: 'mage', i: NPCS.mage.say.length - 1 }; }]);
