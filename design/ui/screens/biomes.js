/* Энериум · прототип «Свет снизу» — биомы 2–4 на «Спуске» (screens/biomes.js).
   Подключается после основного скрипта index.html и screens/model.js, до boot().
   Данные — EN_BIOME_FOES (biome-foes.js, сборщик tools/content-gen/biomes/build.js): враги, колоды, стражи и тексты зала.
   Ядро боя биомы уже знает: biome-foes.js сам регистрирует их в EnBattle (addLib, addFoes, addBiome). Здесь — только показ:
   - BIOME_UI — шапка зала, подписи полок, метки пути вниз, итог забега; ARENAS — арена биома: выгруженная или заглушка;
   - карточки бестиария биомов в S.foes: поле biome, art — выгруженный портрет или заглушка без битой картинки.
     Числа карточек — ядро на этаже первой встречи; Мастерская получает те же числа ядра (EN_BIOME_FOES.workshop);
   - демо-аккаунт: биомы 1–2 пройдены, 3 — рубеж спуска, 4 закрыт для игрока — команда может начать (режим «Команда»);
   - сценарии презентации: быстрый бой и рунный страж каждого нового биома;
   - раздел UI-кита «Биомы спуска» (KIT_EXTRA).
   Правила: §7, §8, §11 GDD, ADR-0010, ADR-0011, ADR-0016, ADR-0018, ADR-0020. Все числа — демонстрация. */
(function () {
'use strict';
const X = window.EN_BIOME_FOES;
if (!X || !EB.BIOMES.b2) return;   // без данных биомов «Спуск» остаётся на Мастерской

/* ================== данные экрана ================== */
const BV = {
  done: ['b2'],                    // пройденные биомы с данными: босс и рунный страж повержены, забеги — ради добычи
  frontWall: { b3: 25 },           // рубеж спуска: игрок знает тех, кого встречал до своей стены — в первую неделю цикла II это 25-й этаж (pace.py, Б4)
  seals: ['Повержен', 'Пройден'],  // метки «Пути вниз» пройденного биома: босс, рунный страж
  rankMark: { e: 'elite', b: 'boss', rune: 'rune' },   // знак ранга на заглушке портрета
};
const READY = new Set(X.art || []);
const artUrl = p => READY.has(p) ? AV(p) : null;   // выгруженный арт — с версией выгрузки, как остальной
const svgUri = s => 'data:image/svg+xml,' + encodeURIComponent(s);

/* ================== заглушки арта ==================
   Пока портрет или арена не выгружены — рисунок в свете карста биома: свет идёт снизу, силуэт по пояс, знак ранга.
   Размеры — как у выгрузки: портрет 464×576, арена 1688×716. Картинки нет — битой ссылки тоже нет */
const stubs = {};
function stubFoe(biome, rank) {
  const k = biome + rank; if (stubs[k]) return stubs[k];
  const t = X.biomes[biome].ui.tone, mark = BV.rankMark[rank];
  const sign = mark === 'elite' ? `<path d="M232 70l18 22-18 22-18-22z" fill="${t.glow}" fill-opacity=".8"/>`
    : mark === 'boss' ? `<path d="M196 104l10-34 26 22 26-22 10 34z" fill="${t.glow}" fill-opacity=".85"/>`
    : mark === 'rune' ? `<circle cx="232" cy="88" r="22" fill="none" stroke="${t.glow}" stroke-width="5" stroke-opacity=".85"/><path d="M232 70v36M218 80l28 16" stroke="${t.glow}" stroke-width="4" stroke-opacity=".7"/>` : '';
  return (stubs[k] = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 464 576"><defs>`
    + `<radialGradient id="l" cx="50%" cy="100%" r="80%"><stop offset="0" stop-color="${t.glow}" stop-opacity=".5"/><stop offset=".5" stop-color="${t.mid}" stop-opacity=".16"/><stop offset="1" stop-color="${t.deep}" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#20262b"/><stop offset="1" stop-color="#0c0f12"/></linearGradient></defs>`
    + `<rect width="464" height="576" fill="${t.deep}"/><rect width="464" height="576" fill="url(#l)"/>`
    + `<path d="M232 150c-44 0-76 34-76 80 0 32 15 58 38 71-62 16-110 60-122 130l-10 145h340l-10-145c-12-70-60-114-122-130 23-13 38-39 38-71 0-46-32-80-76-80z" fill="url(#s)" stroke="${t.glow}" stroke-opacity=".3" stroke-width="3"/>`
    + sign + `</svg>`));
}
function stubArena(biome) {
  const k = 'arena' + biome; if (stubs[k]) return stubs[k];
  const t = X.biomes[biome].ui.tone;
  // простые силуэты зала у стен: колонны — стволы, стеллажи или ярусы города; середина — пол для карт
  const cols = Array.from({ length: 9 }, (_, i) => { const x = 60 + i * 196, w = 36 + (i * 37) % 30; return `<rect x="${x}" y="0" width="${w}" height="${150 + (i * 53) % 90}" rx="8" fill="#0a0d10" opacity=".85"/><rect x="${x}" y="${566 - (i * 41) % 60}" width="${w}" height="${150 + (i * 41) % 60}" rx="8" fill="#0a0d10" opacity=".85"/>`; }).join('');
  return (stubs[k] = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1688 716" preserveAspectRatio="xMidYMid slice"><defs>`
    + `<radialGradient id="g" cx="50%" cy="100%" r="75%"><stop offset="0" stop-color="${t.glow}" stop-opacity=".4"/><stop offset=".45" stop-color="${t.mid}" stop-opacity=".18"/><stop offset="1" stop-color="${t.deep}" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050607" stop-opacity=".7"/><stop offset=".4" stop-color="#050607" stop-opacity="0"/></linearGradient></defs>`
    + `<rect width="1688" height="716" fill="${t.deep}"/><rect width="1688" height="716" fill="url(#g)"/>${cols}<rect width="1688" height="716" fill="url(#v)"/></svg>`));
}

/* ================== регистрация в экранах index.html ================== */
for (const [id, B] of Object.entries(X.biomes)) {
  const U = B.ui;
  BIOME_UI[id] = { eyebrow: U.eyebrow, quote: U.quote, pos: U.pos, shelf: U.shelf, seals: U.seals || BV.seals, els: U.els,
    boss: U.boss, guardWin: U.guardWin, guardLose: U.guardLose, word: U.word || null };
  ARENAS[id] = artUrl(`arena-${id}.jpg`) || stubArena(id);
}
/* карточка бестиария биомов 2–4: те же поля, что у карточек Мастерской в S.foes, плюс biome и art */
const cardOf = id => {
  const c = X.cards[id], f = X.foes[id];
  return Object.assign({ id, biome: c.biome, g: c.g, name: f.name, type: c.type, tag: c.tag, cls: f.cls, el: f.el, race: f.race, hp: c.hp, bm: c.bm,
    desc: c.desc, tip: c.tip, art: artUrl(`foes/${id}.jpg`) || stubFoe(c.biome, f.rank) }, c.rare ? { rare: true } : {}, c.pos ? { pos: c.pos } : {});
};
/* знакомые игроку враги демо-аккаунта: пройденный биом — все; рубеж — встреченные до стены */
const knownIds = () => Object.keys(X.cards).filter(id => { const c = X.cards[id]; return BV.done.includes(c.biome) || (BV.frontWall[c.biome] && c.floor < BV.frontWall[c.biome]); });
function fresh(s) {
  s.foes = s.foes.filter(f => !f.biome || !X.biomes[f.biome])
    .map(f => !f.biome && X.workshop && X.workshop[f.id] ? Object.assign({}, f, { hp: X.workshop[f.id].hp, bm: X.workshop[f.id].bm }) : f)
    .concat(Object.keys(X.cards).map(cardOf));
  for (const b of s.biomes) if (X.biomes[b.id] && !b.name) b.name = X.biomes[b.id].core.name;   // у биома 4 в демо не было имени
  for (const id of knownIds()) if (!s.known.includes(id)) s.known.push(id);
  for (const id of BV.done) s.siege[id] = { hp: null, max: null, killed: true };   // пройден: босс пал, страж открыт
  return s;
}
const initBase = initialState;
initialState = function () { return fresh(initBase()); };
fresh(S);

/* ================== сценарии презентации ================== */
{
  const flows = [];
  for (const [id, B] of Object.entries(X.biomes)) {
    const name = B.core.name, U = B.ui, g = X.foes[B.core.guard.m[0]].name, fl = U.demoFloor;
    flows.push([`${name} · быстрый бой`, `Забег с ${fl}-го этажа на арене биома: его враги, элиты и стена`, () => { S.route = 'descent'; S.selBiome = id; S.overlay = null; startRun('s1', id, fl); }]);
    flows.push([`${name} · рунный страж`, `${g} и четыре элиты: 25 раундов, каждая обычная атака стража отнимает раунд`, () => { S.route = 'descent'; S.selBiome = id; S.overlay = null; S.prepSquad = 's1'; ACT.guard('demo'); }]);
  }
  const at = FLOWS.findIndex(x => x[0].startsWith('Бестиарий'));
  FLOWS.splice(at < 0 ? FLOWS.length : at + 1, 0, ...flows);
}

/* ================== UI-кит · биомы спуска ==================
   Для команды: зал, арена и её готовность, обитатели с приёмами, босс и страж, сила биома и вердикт прогона темпа */
const lib = () => EB.lib();
const abName = (x, L) => x.as || (L[x.id] ? L[x.id].n : x.id);
const TYPE_SHORT = { o: 'рядовой', e: 'элита', b: 'босс', rune: 'рунный' };
const mul = pct => Math.floor(pct / 100) + (pct % 100 ? ',' + String(pct % 100).padStart(2, '0').replace(/0$/, '') : '');   // 150 % → «1,5»
function kitBiome(id) {
  const B = X.biomes[id], C = B.core, U = B.ui, L = lib(), ids = Object.keys(X.foes).filter(f => X.foes[f].biome === id);
  const lv = f => C.foeLvl.base + Math.floor(f * C.foeLvl.perFloor / (C.foeLvl.div || 1));
  const el = C.floors.reduce((a, F) => a + F.m.filter(m => X.foes[m].rank === 'e').length, 0);
  const ready = ids.filter(f => READY.has(`foes/${f}.jpg`)).length, arena = READY.has(`arena-${id}.jpg`);
  const foe = f => { const x = X.foes[f], c = X.cards[f];
    return `<div class="bk-f" data-r="${x.rank}"><img src="${cardOf(f).art}" alt="" style="object-position:${c.pos || '50% 22%'}"><span><b>${x.name}</b><small>${TYPE_SHORT[x.rank]} · ${x.cls} · ${x.el}</small><small class="bk-ab">${x.kit.kit.map(k => abName(k, L) + (k.slot === 'ult' ? ' ★' : k.slot === 'pas' ? ' ◆' : '')).join(' · ')}</small></span></div>`; };
  const pace = X.pace && X.pace.rows ? X.pace.rows : null;
  return `<article class="bk-b">
    <div class="bk-ar"><img src="${ARENAS[id]}" alt="" style="object-position:${U.pos || '50% 50%'}"><div class="bk-ar-in"><span class="eyebrow">${U.eyebrow}</span><b class="serif">${C.name}</b>
      <span class="row" style="gap:6px;flex-wrap:wrap"><span class="chip ${arena ? 'spirit' : 'warn'}">арена ${arena ? 'выгружена' : '— заглушка'}</span><span class="chip ${ready === ids.length ? 'spirit' : 'warn'}">портреты ${ready}/${ids.length}</span></span></div></div>
    <div class="bk-facts"><span><b>${C.floors.length}</b> этажей</span><span><b>${el}</b> элит</span><span>враги <b>${lv(1)}–${lv(C.floors.length)}</b> ур.</span><span>${C.siege === false ? 'без осады' : 'осада босса'}</span><span>золото и дух <b>×${mul(C.dropPct)}</b></span><span>души с элиты <b>${C.n}</b></span></div>
    <div class="bk-foes">${ids.map(foe).join('')}</div>
    <p class="k-note">Страж: ${C.guard.m.map(m => X.foes[m].name).join(', ')} — ${C.guard.m.length} карт, 25 раундов.${pace && id === 'b2' && pace.b2.guard ? ` Прогон темпа: первая полная пачка берёт босса и стража за ${Math.round(pace.b2.guard.ms / 60000)} мин забегов, ${pace.b2.guard.runs} забегов.` : ''}${pace && pace.days && id !== 'b2' ? ` Цикл II по дням, обычный игрок: ${(() => { const d = (pace.days['обычный'] || {})[id] || {}; return `босс — ${d.boss ? d.boss.day + '-й день' : 'не пал'}, страж — ${d.guard ? d.guard.day + '-й день' : 'не пал'}`; })()}.` : ''}</p>
  </article>`;
}
KIT_EXTRA.push({
  html: () => `<section class="k-box" style="grid-column:1/-1"><h3>Биомы спуска · 2–4</h3>
    <p class="k-note">Данные — <code>design/ui/biome-foes.js</code> (сборщик <code>tools/content-gen/biomes/build.js</code>, черновик <code>docs/content/биомы-2-4.md</code>). Экран «Спуска» один на все биомы: шапка-арена, обитатели, босс и страж как ворота; забег и бой — на арене своего биома. Приёмы — библиотека по классу и стихии врага (ADR-0016), ★ — ульта, ◆ — пассивка. Числа — демонстрация.</p>
    <div class="bk-grid">${Object.keys(X.biomes).map(kitBiome).join('')}</div>
    <div class="bk-stubs"><div class="bk-st">${['o', 'e', 'b', 'rune'].map(r => `<img src="${stubFoe('b3', r)}" alt="">`).join('')}<img class="wide" src="${stubArena('b2')}" alt=""></div>
      <p class="k-note">Заглушки арта: пока портрет или арена не выгружены, прототип рисует силуэт в свете карста биома — знак ранга у элиты, босса и стража. Готов тот арт, что стоит в <code>tools/art-gen/ui-art.json</code> и выгружен <code>export_ui.py</code>; после выгрузки — пересобрать <code>build.js</code>. Бестиарий: у кого нет записи сказителя, карточка показывает облик и не даёт совета (§7.1). После рунного стража биома 2 итог забега показывает слово Этриона (ADR-0018). Закрытый биом игрок не выбирает; в режиме «Команда» его можно начать.</p></div>
  </section>`,
});

window.EN_BIOMES_UI = { cardOf, stubFoe, stubArena, knownIds, READY };   // для проверки tools/content-gen/screens/check_biomes.js
})();
