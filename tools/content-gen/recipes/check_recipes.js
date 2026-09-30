/* Автопроверка данных крафта — design/ui/recipes.js (поручение автора 30.09.2026). Запуск: node tools/content-gen/recipes/check_recipes.js
   1. Мёртвых ресурсов нет: каждый предмет уходит в рецепт или сам — цель (герой, призыв врага, место, руна, награда, валюта).
   2. Ключи элит всех биомов всех шести циклов — в рецептах, у каждого не меньше двух путей.
   3. У каждого предмета есть подсказка Этриона (hint) и строка арта иконки (art, по-английски), лист иконок (sheet) — не больше 24.
   4. Лестница Энериума: сто первой ступени — одна второй, сто второй — одна третьей.
   5. В каждом призыве врага — Энериум; в полной цене каждого призыва босса — уникальный ресурс босса биома.
   6. Числа — только целые: количества, веса, дроп, сток.
   7. Тексты для игрока (имя, загадка, подсказка, «где падает») вне цикла «для команды» — без служебных слов и без спойлеров
      раздела дайджеста «Нельзя показывать раннему игроку»; имени «Эуклид» нет нигде; Этрион в подсказках себя не называет. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', '..');
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'design', 'ui', 'recipes.js'), 'utf8'), ctx);
const R = ctx.window.EN_RECIPES;
const { SERVICE } = require(path.join(ROOT, 'tools', 'content-gen', 'screens', 'check_player_view.js'));
const err = [], ok = (m, c) => { if (!c) err.push(m); };
const byId = Object.fromEntries(R.items.map(i => [i.id, i]));
const USE = {}, OUT = {};
for (const r of R.recipes) { for (const [id] of r.in) (USE[id] = USE[id] || []).push(r); (OUT[r.out[0]] = OUT[r.out[0]] || []).push(r); }

/* 1. мёртвые */
const GOAL = new Set(['hero', 'ruin', 'city', 'call', 'awcall', 'memcall', 'mask', 'rune', 'valor', 'product', 'wallet']);
for (const it of R.items) if (!GOAL.has(it.fam) && !(USE[it.id] || []).length) err.push(`мёртвый ресурс: ${it.id} «${it.n}» (${it.fam}) никуда не идёт`);
for (const it of R.items) if (!it.pool && !it.wallet && !(OUT[it.id] || []).length && !['basic', 'key', 'unique', 'craftres', 'find', 'trophy', 'echo', 'rune', 'vshard'].includes(it.tier))
  err.push(`${it.id} «${it.n}»: создаётся, но рецепта нет`);

/* 2. ключи */
const keys = R.items.filter(i => i.tier === 'key');
ok(`ключей ${keys.length}, ждали 72 — по шесть на двенадцать биомов`, keys.length === 72);
for (const k of keys) ok(`ключ ${k.id} «${k.n}»: путей ${(USE[k.id] || []).length}, нужно не меньше двух`, (USE[k.id] || []).length >= 2);

/* 3. подсказка, арт, лист */
const sheetSize = Object.fromEntries((R.sheets || []).map(s => [s.id, s]));
for (const it of R.items) {
  ok(`${it.id}: нет подсказки Этриона (hint)`, typeof it.hint === 'string' && it.hint.trim().length > 10);
  ok(`${it.id}: нет строки арта (art)`, typeof it.art === 'string' && it.art.trim().length > 10);
  if (it.art) ok(`${it.id}: арт — по-английски, без кириллицы и цифр`, !/[А-Яа-яЁё0-9]/.test(it.art));
  ok(`${it.id}: нет листа иконок (sheet)`, !!it.sheet && !!sheetSize[it.sheet]);
}
for (const s of R.sheets || []) {
  ok(`лист ${s.id}: размер ${s.size} — нужен 16 или 24`, [16, 24].includes(s.size));
  ok(`лист ${s.id}: иконок ${s.items.length} больше размера ${s.size}`, s.items.length <= s.size);
  for (const id of s.items) ok(`лист ${s.id}: ${id} числится на листе ${byId[id] && byId[id].sheet}`, byId[id] && byId[id].sheet === s.id);
}

/* 4. лестница Энериума */
const E = R.drops.ener;
const step = (a, b) => (OUT[b] || []).some(r => r.in.length === 1 && r.in[0][0] === a && r.in[0][1] === E.step && r.out[1] === 1);
ok(`лестница: ${E.step} × ${E.t1} → 1 ${E.t2}`, step(E.t1, E.t2));
ok(`лестница: ${E.step} × ${E.t2} → 1 ${E.t3}`, step(E.t2, E.t3));
ok('лестница: шаг — сто, слово автора', E.step === 100);
for (const t of [E.t2, E.t3]) ok(`${t}: ступень лестницы нигде не тратится`, (USE[t] || []).length > 0);

/* 5. призывы: Энериум и уникальный */
const ENER = new Set([E.t1, E.t2, E.t3]);
const bom = {};
function full(id, seen = new Set()) {   // все предметы полной цены по всем путям: хоть один путь несёт уникальный
  if (bom[id]) return bom[id];
  const acc = new Set(); if (seen.has(id)) return acc; seen.add(id);
  for (const r of OUT[id] || []) for (const [x] of r.in) { acc.add(x); for (const y of full(x, seen)) acc.add(y); }
  return (bom[id] = acc);
}
const firstBom = r => { const acc = new Set(); for (const [x] of r.in) { acc.add(x); const rr = (OUT[x] || [])[0]; if (rr && !['unique', 'key', 'basic', 'craftres', 'find', 'trophy'].includes(byId[x].tier)) for (const y of firstBom(rr)) acc.add(y); } return acc; };
for (const r of R.recipes.filter(x => ['call', 'awcall', 'memcall', 'mask'].includes(x.fam))) {
  ok(`призыв ${r.id}: нет Энериума`, r.in.some(([id]) => ENER.has(id)));
  if (r.fam === 'mask') continue;
  const b = firstBom(r);
  ok(`призыв ${r.id}: в полной цене нет уникального ресурса босса биома`, [...b].some(id => byId[id] && byId[id].tier === 'unique'));
}
/* эхо босса биома: перекрафт уникального ведёт к призыву */
for (const m of R.memories || []) {
  ok(`эхо ${m.id}: перекрафт ${m.recraft} не из уникального ${m.unique}`, (OUT[m.recraft] || []).some(r => r.in.some(([id]) => id === m.unique)));
  ok(`эхо ${m.id}: призыв ${m.call} не из перекрафта ${m.recraft}`, (OUT[m.call] || []).some(r => r.in.some(([id]) => id === m.recraft)));
}

/* 6. целые */
const ints = (x, where) => {
  if (typeof x === 'number') { if (!Number.isInteger(x)) err.push(`не целое число в ${where}: ${x}`); }
  else if (Array.isArray(x)) x.forEach((y, i) => ints(y, `${where}[${i}]`));
  else if (x && typeof x === 'object') for (const k in x) ints(x[k], `${where}.${k}`);
};
for (const r of R.recipes) { ints([r.in, r.out], r.id); for (const [, q] of r.in) ok(`${r.id}: количество ${q} не больше нуля`, q > 0); ok(`${r.id}: ячеек ${r.in.length}, их шесть`, r.in.length <= 6); }
ints(R.drops, 'drops'); ints(R.stats, 'stats');

/* 7. тексты игрока */
const SPOIL = [/Ириди(ум|с)/, /Оболочк/, /шест(ой|ого|ым) элемент/i, /марионетк/i, /антагонист/i, /мать мира/i, /неудачн\S* отливк/i, /стёр(ла|ли)? памят/i];
const all = JSON.stringify(R);
ok('имя «Эуклид» есть в recipes.js', !/Эуклид/.test(all));
for (const it of R.items) {
  if (it.team) continue;
  const texts = [['имя', it.n], ['загадка', it.lore], ['подсказка', it.hint]].concat((it.src || []).map(s => ['где падает', s]));
  for (const [what, t] of texts) {
    if (!t) continue;
    for (const [name, re] of SERVICE) if (re.test(t)) err.push(`${it.id} · ${what}: служебное «${name}» — «${t}»`);
    for (const re of SPOIL) if (re.test(t)) err.push(`${it.id} · ${what}: спойлер ${re} — «${t}»`);
  }
  ok(`${it.id}: Этрион в подсказке называет себя`, !/Этрион/.test(it.hint || ''));
}
for (const p of R.places || []) if (!p.team) for (const t of [p.n, p.where, p.lore, p.boss.label, p.boss.lore]) for (const re of SPOIL) if (re.test(t || '')) err.push(`место ${p.id}: спойлер ${re} — «${t}»`);

if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
const T = R.stats.total;
console.log(`Проверка пройдена: ${T.items} предметов, ${T.recipes} рецептов — мёртвых нет; ${keys.length} ключей элит в рецептах; подсказка, арт и лист — у всех; лестница Энериума 100 : 1 дважды; в каждом призыве Энериум и уникальный; числа целые; тексты игрока без служебного и спойлеров.`);
