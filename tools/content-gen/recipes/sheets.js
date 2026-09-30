/* Листы иконок (задел под арт сеткой): каждый предмет получает поле sheet — лист, на котором его нарисуют.
   Лист — 16 или 24 иконки (сетка 4 × 4 или 6 × 4). На листе — предметы, близкие по палитре: один цикл, одно место или биом, один вид.
   Порядок групп внутри цикла — по палитре: ключи и уникальные биомов, руны, заряженный карст и топливо, заготовки и изделия по ремёслам,
   места по порядку, герои и награды. Группа не рвётся, пока влезает в лист; большая группа режется по 24.
   Общий пул базовых — свои листы; валюты, лестница Энериума и пыль — лист «общее». */
const CAP = 24, SMALL = 16;
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
/* палитра группы: подпись для художника */
const HUE = { 1: 'белый с прозеленью, светлое дерево, глина', 2: 'янтарь, бронза, камень библиотек', 3: 'алый, раскалённое железо, песок арены',
  4: 'синий, белый камень, морская вода', 5: 'зелёный, латунь часов, сухой ил', 6: 'фиолетовый, чёрное железо, застывший огонь' };

module.exports = function sheets(items, CYC) {
  const groups = [];   // { key, label, cyc, ids }
  const add = (key, label, cyc, list) => { if (list.length) groups.push({ key, label, cyc, ids: list.map(i => i.id) }); };
  const pool = items.filter(i => i.pool);
  const SPEC = ['alch', 'ench', 'eng', 'tail', 'hunt', 'smith'];
  for (const s of SPEC) add('pool-' + s, 'общий пул · ' + s, 0, pool.filter(i => i.spec === s));
  add('global', 'валюты, Энериум, пыль, Эхо', 0, items.filter(i => !i.pool && (i.fam === 'wallet' || i.fam === 'ener' || i.fam === 'dust' || i.fam === 'echo' || i.fam === 'mask')));
  const taken = new Set(groups.flatMap(g => g.ids));
  for (const cy of CYC) {
    const c = cy.n, its = items.filter(i => i.cyc === c && !taken.has(i.id));
    const pick = (key, label, f) => { const l = its.filter(i => !taken.has(i.id) && f(i)); l.forEach(i => taken.add(i.id)); add(`c${c}-${key}`, label, c, l); };
    for (const b of cy.biomes) {
      pick(b.id + '-keys', `${b.n} · ключи`, i => i.b === b.id && i.tier === 'key');
      pick(b.id + '-mem', `${b.n} · уникальный и эхо босса`, i => i.b === b.id && ['unique', 'recraft', 'memcall', 'memtrophy'].includes(i.fam));
    }
    pick('runes', 'руны и осколки', i => ['rune', 'vshard', 'valor'].includes(i.fam));
    pick('karst', 'заряженный карст и топливо', i => ['karst', 'fuel'].includes(i.fam));
    for (const s of SPEC) pick('made-' + s, `заготовки и изделия · ${s}`, i => ['part', 'made'].includes(i.fam) && (i.spec || '').split('+')[0] === s);
    pick('made-x', 'заготовки и изделия', i => ['part', 'made'].includes(i.fam));
    const placeIds = [...new Set(its.filter(i => i.place).map(i => i.b))];
    for (const pid of placeIds) pick('place-' + pid, `${its.find(i => i.b === pid && i.place).place}`, i => i.b === pid);
    pick('lures', 'приманки призыва', i => i.fam === 'lure');
    pick('heroes', 'герои из рецептов', i => i.fam === 'hero');
    pick('rest', 'награды мастерской', () => true);
  }
  /* упаковка: по циклам, группы подряд; группа не рвётся, пока влезает. Группа, что не влезла в текущий лист, сначала ищет место
     в прежних листах своего цикла — так на конце цикла не остаются листы на три иконки */
  const out = [];
  const pack = (cyc, list) => {
    let cur = null;
    const mine = () => out.filter(s => s.cyc === cyc);
    const flush = () => { if (cur && cur.items.length) out.push(cur); cur = null; };
    const open = () => { cur = { id: `${cyc === 0 ? 'P' : ROMAN[cyc]}-${String(mine().length + 1).padStart(2, '0')}`, cyc, size: CAP, palette: [], hue: cyc ? HUE[cyc] : 'по ремёслам общего пула', items: [] }; };
    const put = (sh, ids, g) => { sh.items.push(...ids); if (!sh.palette.includes(g.label)) sh.palette.push(g.label); };
    for (const g of list) {
      let ids = g.ids.slice();
      while (ids.length) {
        if (!cur) open();
        const room = CAP - cur.items.length;
        if (ids.length > room && cur.items.length && ids.length <= CAP) {
          const back = mine().find(sh => CAP - sh.items.length >= ids.length);
          if (back) { put(back, ids, g); ids = []; continue; }
          flush(); continue;   // группа целиком — на новый лист
        }
        const part = ids.slice(0, room); ids = ids.slice(room);
        put(cur, part, g);
        if (cur.items.length >= CAP) flush();
      }
    }
    flush();
  };
  pack(0, groups.filter(g => g.cyc === 0));
  for (const cy of CYC) pack(cy.n, groups.filter(g => g.cyc === cy.n));
  for (const s of out) if (s.items.length <= SMALL) s.size = SMALL;
  const byId = Object.fromEntries(items.map(i => [i.id, i]));
  for (const s of out) for (const id of s.items) byId[id].sheet = s.id;
  return out;
};
