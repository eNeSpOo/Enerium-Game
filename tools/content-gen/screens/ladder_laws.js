/* Законы лестницы планок (ADR-0047) — их зовут проверки экранов: check_week.js, check_bag.js («Дары»), check_event.js, check_arena.js,
   check_contracts.js. Отдельный файл — не проверка сама по себе (имя не check*.js: tools/run-checks.js его не запускает).
   Слова автора 02.10.2026: «планок по рейтинговым режимам, у игрока они должны быть сразу и на все циклы… просчитаны планки с множеством
   лутбоксов, от слабых на 2 цикле, до самых сильных и желанных на 6 цикле… его ресурс время». Решение координатора (ADR-0047, п. 1):
   лестница — одна, сквозная, по очкам; замка «ступени следующего цикла открывает переход» нет.
   Правило: пять полос — циклы II–VI; полоса — строки слоя личных планок режима в EN_LOOTBOXES.modes[режим] (слой ladder.layer), сундуки
   ступени — своей полосы (row.cyc[полоса]). Игрок цикла c: полосы ниже своей пройдены и не платят; своя — ступени 1…n: порог — первая
   планка цикла игрока × x строки; за верхней ступенью своей полосы сразу, без перехода в новый цикл, идут ступени следующей: первая —
   × next от верхней, дальше тем же шагом строк; у Эхо за верхней ступенью полосы VI — потолок (cap); у слоя с порогами в своих единицах
   (at: загрузка мест, круги) продолжения нет.
   Законы — функции от данных, состояния режима и разметки → список нарушений; проверка мутацией ломает алгоритм прототипа
   (EnLoot.ladder — его зовут помощник Недели EN_WEEK.steps, экраны режимов и «Дары») и ждёт, что закон упадёт.
   Л1 — личные планки режима в реестре Недели — та же лестница, что даёт EnLoot.ladder для цикла игрока, и та же, что эталон правила
        по данным: сквозной номер, полоса, ступень в полосе, потолок, сундуки ступени — своей полосы;
   Л2 — пороги: в своих единицах — at строки; иначе — первая планка × множитель ступени; пороги растут;
   Л3 — замка по циклу нет: планка взята, как только набран её порог; ближайшая — первая невзятая лестницы;
   Л4 — на экране видны все пять полос: прошлые — одной строкой «пройдено», своя — строками с порогом и сундуком цвета редкости,
        будущие — с порогом первой планки и сундуками полосы (свёрнуты или раскрыты, когда игрок по ним идёт), потолок — отдельной
        строкой; в лестнице нет ни замка, ни «откроется с цикла».
   Здесь же — эталон правила (ref) и подпись выплаты планки в «Дарах» (label). Только чтение: состояние прототипа законы не меняют. */
'use strict';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const topR = pay => pay.reduce((a, g) => Math.max(a, g.r), 0);
const modeOf = (LBX, id) => { const M = LBX && LBX.modes ? LBX.modes[id] : null; return M && M.ladder ? M : null; };
const layerOf = M => M.layers.find(l => l.id === M.ladder.layer);

/* эталон: ступени игрока цикла c по правилу и данным EN_LOOTBOXES — без алгоритма прототипа.
   [{ k — сквозной номер, band — полоса, i — ступень в полосе, x — множитель первой планки или null, at — своя единица или null, pay, cap }] */
function ref(LBX, id, c) {
  const M = modeOf(LBX, id); if (!M) return [];
  const R = M.ladder, ly = layerOf(M), last = R.bands[R.bands.length - 1], top = ly.rows[ly.rows.length - 1], out = [];
  let mul = 1;
  for (let band = Math.max(c, M.from); band <= last; band++) {
    ly.rows.forEach((row, j) => { const pay = row.cyc[band] || []; if (pay.length) out.push({ k: out.length + 1, band, i: j + 1, x: row.x != null ? row.x * mul : null, at: row.at != null ? row.at : null, pay, cap: false }); });
    if (!R.next || top.x == null) break;
    mul *= top.x * R.next;
  }
  if (R.cap && R.next && top.x != null && out.length) out.push({ k: out.length + 1, band: last, i: ly.rows.length + 1, x: mul, at: null, pay: R.cap, cap: true });
  return out;
}
/* пороги лестницы по первой планке p1 (порог ступени с множителем первой строки) */
const needs = (LBX, id, c, p1) => { const L = ref(LBX, id, c); return L.map(r => r.at != null ? r.at : p1 * r.x / L[0].x); };
/* сколько ступеней в своей полосе игрока цикла c */
const ownCount = (LBX, id, c) => { const L = ref(LBX, id, c); return L.length ? L.filter(r => r.band === L[0].band && !r.cap).length : 0; };

/* Л1–Л3 по состоянию режима на этой неделе. st — { m: { id }, lock, planks: [{ k, band, i, need, pay, reached, cap }], have, next };
   lad0 — алгоритм прототипа EnLoot.ladder до мутаций: сверяется с эталоном */
function stateLaw(LBX, key, st, c, lad0) {
  const e = [], M = modeOf(LBX, st.m.id);
  if (!M || st.lock || !st.planks.length) return e;
  const L = ref(LBX, st.m.id, c), P = st.planks;
  if (typeof lad0 === 'function' && !same(L, lad0(LBX, st.m.id, c))) e.push(`${key}: Л1 — EnLoot.ladder расходится с эталоном правила`);
  if (P.length !== L.length) { e.push(`${key}: Л1 — планок у режима ${P.length}, в лестнице цикла ${ROMAN[c]} — ${L.length}`); return e; }
  P.forEach((p, j) => {
    const r = L[j];
    if (p.k !== r.k || p.band !== r.band || p.i !== r.i || !!p.cap !== r.cap) e.push(`${key}: Л1 — планка ${j + 1}: номер, полоса или потолок — ${p.k}/${p.band}/${p.i}, ждали ${r.k}/${r.band}/${r.i}`);
    if (!same(p.pay, r.pay)) e.push(`${key}: Л1 — планка ${r.k} полосы ${ROMAN[r.band]} платит не сундуки своей полосы`);
    if (r.at != null ? p.need !== r.at : p.need * L[0].x !== P[0].need * r.x) e.push(`${key}: Л2 — порог планки ${r.k} — ${p.need}: не ${r.at != null ? 'своя единица ' + r.at : 'первая планка × ' + r.x / L[0].x}`);
    if (j && p.need <= P[j - 1].need) e.push(`${key}: Л2 — пороги не растут на планке ${r.k}`);
    if (!Number.isInteger(p.need)) e.push(`${key}: Л2 — порог планки ${r.k} не целый — ${p.need}`);
    if (p.reached !== (st.have >= p.need)) e.push(`${key}: Л3 — планка ${r.k} полосы ${ROMAN[r.band]}: набрано ${st.have} при пороге ${p.need}, а «взята» — ${p.reached}`);
  });
  const nx = P.find(p => !p.reached) || null;
  if (nx ? !st.next || st.next.k !== nx.k : st.next) e.push(`${key}: Л3 — ближайшая планка — не первая невзятая лестницы`);
  return e;
}

/* Л4 по разметке, где нарисована лестница режима (EN_WEEK.ladderHtml): лист Недели или лист экрана режима.
   after — чем кончается блок лестницы в этой разметке (начала следующих блоков) */
const AFTER = ['<div class="wk-ld clan"', 'class="rs-line wk-tier"', '<div class="wk-board"', 'class="sheet-f"'];
function roadLaw(LBX, key, h, st, c, after) {
  const e = [], id = st.m.id, M = modeOf(LBX, id);
  if (!M || st.lock || !st.planks.length) return e;
  const a = h.indexOf(`<div class="wk-ld" data-mode="${id}"`);
  if (a < 0) { e.push(`${key}: Л4 — на экране нет лестницы планок`); return e; }
  const ends = (after || AFTER).map(x => h.indexOf(x, a)).filter(x => x > a), blk = h.slice(a, ends.length ? Math.min(...ends) : h.length);
  const R = M.ladder, ly = layerOf(M), own = Math.max(c, M.from), P = st.planks, of = b => P.filter(p => p.band === b && !p.cap);
  const past = blk.match(/<p class="wk-ld-past" data-bands="([\d,]*)">([\s\S]*?)<\/p>/) || [], pastB = past[1] ? past[1].split(',').map(Number) : [];
  const open = new Set([...blk.matchAll(/<div class="wk-ld-band(?: own)?" data-band="(\d+)">/g)].map(m => +m[1]));
  const rows = blk.split('<div class="wk-ld-st').slice(1).map(x => { const m = x.match(/^[^"]*" data-k="(\d+)" data-band="(\d+)" data-need="(\d+)" data-r="(\d+)">/); return m ? { k: +m[1], band: +m[2], need: +m[3], r: +m[4], chest: x.slice(0, x.indexOf('<b class="num">')).includes('wk-chest') } : null; });
  const fold = blk.split('<div class="wk-ld-fut"').slice(1).map(x => { const m = x.match(/^ data-band="(\d+)"(?: data-need="(\d+)")? data-r="(\d+)"/); return m ? { band: +m[1], need: m[2] == null ? null : +m[2], r: +m[3], chest: x.includes('wk-chest'), cr: (x.match(/class="wk-cr"/g) || []).length } : null; });
  if (rows.includes(null) || fold.includes(null)) { e.push(`${key}: Л4 — строка лестницы без номера, порога или редкости`); return e; }
  for (const b of R.bands) {
    if (b < own) { if (!pastB.includes(b) || !/пройдено/.test(past[2] || '')) e.push(`${key}: Л4 — прошлая полоса цикла ${ROMAN[b]} не названа «пройдено»`); }
    else if (b === own) { if (!blk.includes(`<div class="wk-ld-band own" data-band="${b}">`)) e.push(`${key}: Л4 — своя полоса цикла ${ROMAN[b]} не показана крупно`); }
    else if (!open.has(b) && !fold.some(f => f.band === b)) e.push(`${key}: Л4 — будущая полоса цикла ${ROMAN[b]} не видна`);
  }
  if (pastB.some(b => b >= own) || blk.split('<p class="wk-ld-past"').length > 2) e.push(`${key}: Л4 — «пройдено» — не одной строкой или не о прошлых полосах`);
  /* своя и раскрытые полосы: строка на каждую планку — порог и сундук цвета редкости */
  for (const b of open) {
    const want = of(b), got = rows.filter(r => r.band === b);
    if (want.length !== got.length) { e.push(`${key}: Л4 — в полосе цикла ${ROMAN[b]} строк ${got.length}, планок ${want.length}`); continue; }
    want.forEach((p, j) => { if (got[j].k !== p.k || got[j].need !== p.need || got[j].r !== topR(p.pay) || !got[j].chest) e.push(`${key}: Л4 — планка ${p.k}: на экране порог ${got[j].need} и редкость ${got[j].r}, в лестнице ${p.need} и ${topR(p.pay)}, сундук — ${got[j].chest}`); });
    if (b > own && !want.some(p => p.reached) && !(st.next && st.next.band === b && !st.next.cap)) e.push(`${key}: Л4 — полоса цикла ${ROMAN[b]} раскрыта, хотя игрок по ней не идёт`);
  }
  /* свёрнутые полосы: порог первой планки в единицах игрока и сундуки полосы */
  for (const f of fold) {
    const S2 = of(f.band), pay = S2.length ? S2.reduce((x, p) => x.concat(p.pay), []) : ly.rows.reduce((x, r) => x.concat(r.cyc[f.band] || []), []);
    const need = S2.length ? S2[0].need : ly.rows[0].at != null ? ly.rows[0].at : null;
    if (f.band <= own) e.push(`${key}: Л4 — свёрнута не будущая полоса — цикл ${ROMAN[f.band]}`);
    if (need == null || f.need !== need) e.push(`${key}: Л4 — у будущей полосы цикла ${ROMAN[f.band]} порог ${f.need}, в лестнице ${need}`);
    if (f.r !== topR(pay) || !f.chest || !f.cr) e.push(`${key}: Л4 — у будущей полосы цикла ${ROMAN[f.band]} нет сундука своей редкости или сундуков полосы`);
  }
  const cap = P.find(p => p.cap), cm = blk.match(/<div class="wk-ld-cap[^"]*" data-k="(\d+)" data-need="(\d+)" data-r="(\d+)"/);
  if (cap ? !cm || +cm[1] !== cap.k || +cm[2] !== cap.need || +cm[3] !== topR(cap.pay) : cm) e.push(`${key}: Л4 — потолок лестницы на экране не тот, что в данных`);
  const lock = blk.match(/.{0,30}(?:#i-lock|откро|с цикла).{0,30}/i);
  if (lock) e.push(`${key}: Л4 — в лестнице замок по циклу: «${lock[0]}»`);
  return e;
}

/* подпись выплаты личной планки в «Дарах»: своя полоса — как строка слоя («Личная планка 3»), планка следующей полосы называет её
   цикл, потолок — себя. rowLabel — lbRowLabel прототипа (index.html) */
function label(LBX, id, p, c, rowLabel) {
  const M = LBX.modes[id], ly = M.ladder ? layerOf(M) : M.layers.find(l => l.kind === 'plank' && !l.clan), own = Math.max(c, M.from);
  return p.cap ? `${ly.one} ${p.k} · потолок` : p.band == null || p.band === own ? rowLabel(ly, ly.rows[(p.i || p.k) - 1]) : `${ly.one} ${p.k} · цикл ${ROMAN[p.band]}`;
}

/* мутации алгоритма лестницы прототипа: lad0 — EnLoot.ladder до поломки. [[что сломано, сломанный алгоритм]] */
function mutations(lad0) {
  const ownOf = (L, id, c) => Math.max(c, L.modes[id].from);
  return [
    ['замок по циклу вернули — за верхней планкой своей полосы ничего нет', (L, id, c) => lad0(L, id, c).filter(s => s.band === ownOf(L, id, c) && !s.cap)],
    ['планка следующей полосы платит сундук своей полосы игрока', (L, id, c) => { const A = lad0(L, id, c), own = ownOf(L, id, c); return A.map(s => s.band > own && !s.cap ? Object.assign({}, s, { pay: (A.find(o => o.band === own && o.i === s.i) || s).pay }) : s); }],
    ['порог продолжения — не ×next от верхней планки', (L, id, c) => { const own = ownOf(L, id, c), R = L.modes[id].ladder; return lad0(L, id, c).map(s => s.band > own && s.x != null && R.next ? Object.assign({}, s, { x: s.x / R.next * (R.next + 1) }) : s); }],
  ];
}

module.exports = { ROMAN, same, topR, ref, needs, ownCount, stateLaw, roadLaw, label, mutations, AFTER };
