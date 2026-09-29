/* screens/social.js — общение: профиль игрока, друзья, почта, чат (§2.3, §28.5, §33.3 GDD; CLAUDE.md — «Честная модерация»; ADR-0026).
   Слова автора 29.09.2026: «Нужно сделать просмотр информации по клику на портрет и информации его аккаунта, как у нас это сделано
   в Страннике; добавление в друзья, почту и сообщения в ней, клановый и общий чат, ру и английский по переключению. В чате — портрет,
   что выбрал Странник, иконка, партиклы, никнейм».
   Регистрирует:
   — профиль игрока по нажатию на портрет (OV.pp): облик, уровень, цикл, клан, пятёрка сильнейших, главное из достижений; в друзья,
     написать, заблокировать, пожаловаться. Герой пятёрки — OV.pphero. Жалоба (OV.ppreport) уходит только в журнал модерации:
     автоматических наказаний нет. Блокировка (OV.ppblock) и удаление из друзей (OV.ppunf) — с подтверждением последствий (§2.3);
   — «Друзья» (OV.friends): друзья, заявки, чёрный список, поиск по имени;
   — «Входящие» (OV.inbox) — вкладки «Награды», «Письма», «Система»: награды и «пока вас не было», письма друзей, заявки в друзья
     и сообщения сервера. Письмо — OV.letter, новое письмо другу — OV.write: только текст, передача ресурсов почтой запрещена (§28.5);
   — «Чат» (OV.chat): каналы «Общий» и «Клан», у общего — язык RU или EN; сообщение — облик (портрет в рамке с частицами), имя, текст;
     нажатие на портрет — профиль. Ограничение чата модератором видно честно: до какого часа, за что, номер записи журнала; его можно
     оспорить;
   — профиль по нажатию на портрет и на других экранах, не трогая их файлов: витрина соперника Арены и Лиги (OV.opp, OV.lgopp),
     журнал обороны (OV.ardef, вкладка «Оборона»), участник клана и заявка в клан (OV.clmem, OV.clapps, список участников), рейтинги
     (OV.rank, OV.wkmode, OV.evrew) — обёртки ниже;
   — раздел UI-кита «Общение» (KIT_EXTRA), сценарии презентации.
   Облик — одна анатомия lkAva из screens/wanderer.js: своё — S.look, чужое — ppLook.
   Честная модерация (CLAUDE.md, инварианты): критика игры — не нарушение; за слова — только ограничение чата; никаких коллективных
   наказаний; бан аккаунта — только за читы и мошенничество, с доказательством из журналов сервера; каждое действие модератора пишется
   в журнал (S.soc.modlog). Жалоба игрока — тоже запись журнала, и только.
   Сервер решает, клиент показывает: заявка, ответ на заявку, удаление, блокировка, жалоба, письмо, сообщение чата, обжалование — операции
   SOC_SRV с номером; номер несёт кнопка, повтор ничего не повторяет, отказ ничего не меняет.
   Своё состояние — S.soc (заводится как S.bag). Письма игроков и заявки в друзья лежат во Входящих (S.inbox): колокол считает их, как
   прежде, — «письма и дар дня»; прочитанное письмо уходит в архив S.soc.read.
   Числа и демо — SOC_DATA, вид — SOC_VIEW. Служебное — только команде: TM, PL, tmT из index.html. Стили — screens/social.css.
   Автопроверка — tools/content-gen/screens/check_social.js. */
'use strict';

/* ================== данные: демонстрация, не баланс ================== */
const SOC_DATA = {
  rules: {
    friends: 50,          // друзей — не больше
    outgoing: 20,         // исходящих заявок разом — не больше
    letter: 500,          // знаков в письме
    lettersDay: 20,       // писем в сутки
    chat: 200,            // знаков в сообщении чата
    chatFrom: 10,         // общий чат — с 10-го уровня Странника, как рейтинги и кланы (§16)
    muteH: 6,             // демо команды: ограничение чата модератором — на столько часов
  },
  langs: [['ru', 'RU'], ['en', 'EN']],
  reasons: [['abuse', 'Оскорбления'], ['spam', 'Спам и реклама'], ['fraud', 'Мошенничество'], ['cheat', 'Читы и нечестная игра'], ['other', 'Другое']],
  /* кланы сервера: имя → паспорт на экране клана (screens/clan.js, лист clfind); свой клан — экран «Клан» */
  clans: { 'Пепельный круг': '', 'Северный дозор': 'sd', 'Серые крылья': 'sk', 'Светлый круг': 'sv', 'Ночной караван': 'nk', 'Тихая гавань': 'tg' },
  /* игроки демо-сервера: пол, уровень, цикл, клан, облик [рамка, лицо — герой состава, частицы], в сети — часов назад (0 — сейчас) */
  people: {
    'Тихий ветер': { sex: 'f', lvl: 41, cyc: 3, clan: 'Пепельный круг', look: ['first', 'c1-15', 'gold'], seen: 0 },
    'Северный странник': { sex: 'm', lvl: 38, cyc: 3, clan: 'Пепельный круг', look: ['arena', 'c1-10', 'ember'], seen: 2 },
    'Собиратель искр': { sex: 'm', lvl: 33, cyc: 2, clan: 'Пепельный круг', look: ['karst', 'c1-14', 'dust'], seen: 1 },
    'Лунный страж': { sex: 'm', lvl: 31, cyc: 2, clan: 'Пепельный круг', look: ['bronze', 'c2-43', 'ember'], seen: 5 },
    'Искатель': { sex: 'm', lvl: 30, cyc: 2, clan: 'Пепельный круг', look: ['first', 'c1-21', 'gold'], seen: 30 },
    'Светлый пепел': { sex: 'f', lvl: 29, cyc: 2, clan: 'Пепельный круг', look: ['first', 'c2-42', 'gold'], seen: 3 },
    'Серая сова': { sex: 'f', lvl: 23, cyc: 2, clan: 'Пепельный круг', look: ['bronze', 'c2-41', 'none'], seen: 6 },
    'Ясный родник': { sex: 'f', lvl: 36, cyc: 2, clan: 'Тихая гавань', look: ['karst', 'c1-13', 'dust'], seen: 20 },
    'Быстрый лис': { sex: 'f', lvl: 21, cyc: 2, clan: '', look: ['iron', 'c1-07', 'ember'], seen: 3 },
    'Медная сойка': { sex: 'f', lvl: 52, cyc: 4, clan: 'Северный дозор', look: ['timeless', 'c2-44', 'time'], seen: 1 },
    'Янтарный караван': { sex: 'm', lvl: 34, cyc: 2, clan: 'Ночной караван', look: ['bronze', 'c1-09', 'ember'], seen: 0 },
    'Синий туман': { sex: 'f', lvl: 32, cyc: 2, clan: '', look: ['forge', 'c1-12', 'ash'], seen: 0 },
    'Ловкий торговец': { sex: 'm', lvl: 11, cyc: 2, clan: '', look: ['iron', '', 'none'], seen: 0 },
    'Ashen Fox': { sex: 'f', lvl: 44, cyc: 3, clan: 'Серые крылья', look: ['clan', 'c1-17', 'spirit'], seen: 0 },
    'Northwind': { sex: 'm', lvl: 37, cyc: 3, clan: '', look: ['arena', 'c1-11', 'ember'], seen: 0 },
    'Karst Walker': { sex: 'm', lvl: 26, cyc: 2, clan: '', look: ['karst', 'c2-46', 'dust'], seen: 0 },
  },
  /* отношения демо-аккаунта: friend — друг, in — его заявка вам, out — ваша заявка ему, block — в чёрном списке */
  rel: { 'Тихий ветер': 'friend', 'Северный странник': 'friend', 'Собиратель искр': 'friend', 'Лунный страж': 'friend', 'Ясный родник': 'friend',
    'Быстрый лис': 'in', 'Медная сойка': 'out', 'Ловкий торговец': 'block' },
  /* письма друзей: read — уже прочитано, лежит в архиве */
  letters: [
    { id: 'pm1', from: 'Тихий ветер', text: 'Завтра в восемь собираемся на Кланового босса. Возьми отряд с танком: третья элита круга бьёт больно.', read: false },
    { id: 'pm0', from: 'Северный странник', text: 'Спасибо за совет с Мастером — прошёл с первого раза. С меня помощь в Эхо на неделе эльфов.', read: true },
  ],
  /* чат: [кто, текст], «@» — вы; unread — сколько последних сообщений комнаты ещё не прочитано */
  chat: {
    'all:ru': [
      ['Тихий ветер', 'Кто уже прошёл Мастера? Какой состав брали?'],
      ['Северный странник', 'Танк вперёд, контроль на него не работает — только урон.'],
      ['Ловкий торговец', 'Продам Энериум дёшево, пишите в личку!'],
      ['Синий туман', 'Съёмщик снимает силу. Не копите на один удар.'],
      ['@', 'Спасибо, попробую с танком.'],
      ['Янтарный караван', '«Ночной караван» набирает: контракты каждый день, босс — по вечерам.'],
      ['Собиратель искр', 'Лавка опять без редкого. Разработчики, добавьте обновлений!'],
      ['Тихий ветер', 'Удачи внизу!'],
    ],
    'all:en': [
      ['Northwind', 'Anyone cleared the Master with just two heroes?'],
      ['Ashen Fox', 'Tank in front, burst him down. Control won’t stick on him.'],
      ['Karst Walker', 'Looking for a chill clan, evenings.'],
      ['Ashen Fox', 'Серые крылья take English speakers — apply in Clans.'],
    ],
    clan: [
      ['Тихий ветер', 'Третья элита круга почти пала — добейте, у кого остались атаки.'],
      ['Лунный страж', 'Бью вечером, сейчас в забеге.'],
      ['Северный странник', 'Глава, что берём на 13-м уровне древа?'],
      ['@', 'Урон по Земле, если никто не против.'],
      ['Светлый пепел', 'Кто идёт в Эхо: неделя эльфов — берите героев с неприязнью.'],
      ['Искатель', 'Раздачу за прошлую неделю видел, спасибо.'],
    ],
  },
  unread: { 'all:ru': 3, 'all:en': 0, clan: 2 },
  /* демо команды: сообщение друга в открытую комнату */
  say: { who: 'Тихий ветер', t: { ru: 'Держитесь, я уже спускаюсь!', en: 'Hold on, I’m on my way down!' } },
  /* демо модератора: ограничение чата демо-аккаунту — за что и кто; номер записи журнала ставит сервер */
  mute: { reason: 'оскорбления в общем чате', by: 'модератор Ива' },
  modFrom: 1041,          // номер первой записи журнала модерации в демо
  /* чужой профиль без записи: по циклу — уровень [от, до], день пути для достижений, какие рамки и частицы встречаются */
  gen: {
    lvl: [[1, 9], [10, 30], [28, 46], [44, 62], [60, 78], [76, 95]],
    day: [0, 3, 18, 40, 60, 82],
    frames: [['iron'], ['iron', 'bronze', 'karst'], ['bronze', 'karst', 'forge', 'arena'], ['karst', 'forge', 'arena', 'clan', 'pass'],
      ['forge', 'arena', 'clan', 'pass', 'first'], ['arena', 'clan', 'pass', 'first', 'timeless']],
    fx: [['none', 'ember'], ['none', 'ember', 'dust'], ['ember', 'dust', 'ash'], ['dust', 'ash', 'spirit'], ['ash', 'spirit', 'gold'], ['spirit', 'gold', 'time']],
    clans: ['Северный дозор', 'Серые крылья', 'Светлый круг', 'Ночной караван', 'Тихая гавань'],
    clanOf: 3,            // клан есть у двух из трёх: без клана — если бросок из clanOf выпал нулём
    lvlStep: 40,          // пятёрка из пула Арены цикла ниже: уровень выше на столько за цикл, предел — на один
  },
};
/* вид */
const SOC_VIEW = {
  ava: { chat: 44, row: 40, head: 104, strip: 48, rank: 26, letter: 56, list: 36, to: 26 },   // слот облика по местам, px
  chatLive: 5,            // живые частицы — у последних N сообщений чата, у остальных облик без частиц
  cut: 64,                // письмо в списке — первые знаки
  find: 8,                // найдено по имени — не больше строк
  best: 3,                // главное из достижений — сколько
};

/* ================== помощники ================== */
const socEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const socDecode = s => String(s || '').replace(/&(amp|lt|gt|quot|#39|apos);/g, (x, k) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'" }[k]));
const socOp = () => 'sc' + S.soc.seq;   // номер следующей операции: его несут кнопки
const socMe = () => (S.look ? S.look.nick : 'Странник');
const socRel = n => (S.soc && S.soc.rel[n]) || '';
const socFriends = () => Object.keys(S.soc.rel).filter(n => S.soc.rel[n] === 'friend');
const socOf = k => Object.keys(S.soc.rel).filter(n => S.soc.rel[n] === k);
/* входящие заявки в друзья — число у кнопки «Друзья» в колонке Странника (screens/wanderer.js) */
const socIncoming = () => (S.soc ? socOf('in').length : 0);
const socCut = t => { const a = [...String(t)]; return a.length > SOC_VIEW.cut ? a.slice(0, SOC_VIEW.cut).join('').trim() + '…' : String(t); };
const socMuted = () => { const M = S.soc.mute; return M && M.until > Date.now() ? M : null; };
const socWhen = ms => { try { return new Date(ms).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); } catch (_) { return 'через ' + dur(Math.ceil((ms - Date.now()) / 1000)); } };
/* кланы сервера: их имена — не игроки, в рейтинге кланов имя клана профиль не открывает */
function socClanNames() {
  const s = new Set(Object.keys(SOC_DATA.clans)), E = window.EN_EVENT;
  if (E && E.top && E.top.clanNames) E.top.clanNames.forEach(n => s.add(n));
  if (S.clan && S.clan.n) s.add(S.clan.n);
  return s;
}
/* игроки, которых знает демо-сервер: облики, клан, Арена и Лига, лидеры События, первенства, заявки в клан, отношения */
function socNames() {
  const out = new Set(Object.keys(SOC_DATA.people)), add = n => { if (typeof n === 'string' && n.trim()) out.add(n); };
  if (S.clan && S.clan.members) S.clan.members.forEach(m => { if (!m.me) add(m.n); });
  if (S.clan && S.clan.apps) S.clan.apps.forEach(a => add(a.n));
  const A = window.EN_ARENA; if (A && A.pool) (A.pool.arena || []).concat(A.pool.league || []).forEach(o => add(o.n));
  if (A && A.top) for (const k of Object.keys(A.top)) for (const t of Object.keys(A.top[k] || {})) (A.top[k][t] || []).forEach(x => add(x[0]));   // лидеры Арены и Лиги
  const E = window.EN_EVENT; if (E && E.top && E.top.names) E.top.names.forEach(add);
  if (S.wn && S.wn.ach) Object.values(S.wn.ach.first).forEach(n => { if (n !== '@') add(n); });
  if (S.soc) Object.keys(S.soc.rel).forEach(add);
  out.delete(socMe());
  for (const c of socClanNames()) out.delete(c);
  return out;
}
const socIsPlayer = n => socNames().has(n);
/* имя занято — сервер знает всех игроков: проверка имени в «Облике» (screens/wanderer.js) */
if (typeof LK_TAKEN !== 'undefined') LK_TAKEN.push(n => { const k = String(n).toLowerCase(); for (const x of socNames()) if (x.toLowerCase() === k) return true; return false; });

/* ================== профиль игрока: что знает сервер ==================
   Запись игрока — SOC_DATA.people, участник своего клана, соперник Арены или Лиги; остального сервер-заглушка достраивает от имени:
   уровень по циклу, облик — рамки и частицы, какие встречаются в этом цикле, пятёрка — отряд из пула Арены своего цикла.
   В игре всё это — подтверждённые данные аккаунта (§2.3) */
let ppMemo = { s: null, x: {} };
function ppArena(nick) {
  const A = window.EN_ARENA; if (!A || !A.pool) return null;
  const a = (A.pool.arena || []).find(o => o.n === nick); if (a) return { c: a.c, f: a.f, r: a.r };
  const l = (A.pool.league || []).find(o => o.n === nick); return l ? { c: l.c, f: l.t[0], r: l.r } : null;
}
function ppTop(cyc, ar, roll) {
  if (ar) return ar.f.map(x => x.slice());
  const A = window.EN_ARENA, pool = A && A.pool ? A.pool.arena || [] : [];
  if (!pool.length) return [];
  const cs = [...new Set(pool.map(o => o.c))], low = cs.filter(c => c <= cyc), c = low.length ? Math.max(...low) : Math.min(...cs);
  const list = pool.filter(o => o.c === c), o = list[roll(list.length)], k = Math.max(0, cyc - c), caps = INV.hero.capByLim;
  return o.f.map(x => { const lim = Math.min(caps.length - 1, x[2] + k); return [x[0], Math.min(x[1] + k * SOC_DATA.gen.lvlStep, caps[lim]), lim, x[3]]; });
}
function ppAch(nick, cyc, lvl) {
  const W = window.EN_WANDERER; if (!W) return { n: 0, of: 0, best: [], titles: [] };
  const day = SOC_DATA.gen.day[cyc - 1] + (lvl % 5), got = W.ach.list.filter(a => a.at && a.at.o != null && a.at.o <= day);
  const best = got.filter(a => a.cat !== 'myst').sort((a, b) => b.r - a.r || b.at.o - a.at.o).slice(0, SOC_VIEW.best);   // тайны чужого профиля не раскрываются
  const first = S.wn && S.wn.ach ? S.wn.ach.first : {};
  return { n: got.length, of: W.ach.list.length, best, titles: W.ach.firsts.filter(f => first[f.id] === nick).map(f => f.title) };
}
function ppOf(nick) {
  if (ppMemo.s !== S) ppMemo = { s: S, x: {} };
  if (ppMemo.x[nick]) return ppMemo.x[nick];
  const G = SOC_DATA.gen, P = SOC_DATA.people[nick] || null, ar = ppArena(nick);
  const cm = S.clan && S.clan.in && S.clan.members ? S.clan.members.find(m => !m.me && m.n === nick) : null;
  const roll = EnLoot.makeRng(EnLoot.seedOf('профиль|' + nick));
  const cyc = Math.max(1, Math.min(G.lvl.length, P ? P.cyc : cm ? cm.cyc : ar ? ar.c : S.acc.cycle));
  const [lo, hi] = G.lvl[cyc - 1], lvl = P ? P.lvl : cm ? cm.lvl : lo + roll(hi - lo + 1);
  const sex = P ? P.sex : roll(2) ? 'f' : 'm';
  const clan = P ? P.clan : cm ? S.clan.n : roll(G.clanOf) ? G.clans[roll(G.clans.length)] : '';
  const top = ppTop(cyc, ar, roll);
  let look;
  if (P) {
    look = { frame: P.look[0], face: P.look[1], fx: P.look[2] };
    if (look.face && top.length && !top.some(x => x[0] === look.face)) top[0] = [look.face, top[0][1], top[0][2], top[0][3]];   // лицо облика — его герой
  } else {
    const fr = G.frames[cyc - 1], fx = G.fx[cyc - 1], h = top.find(x => RSI[x[0]] && RSI[x[0]].sex === sex);
    look = { frame: fr[roll(fr.length)], face: h ? h[0] : '', fx: fx[roll(fx.length)] };
  }
  return (ppMemo.x[nick] = { nick, sex, lvl, cyc, clan, look, top, seen: P ? P.seen : cm ? cm.seen : null, ach: ppAch(nick, cyc, lvl) });
}
/* облик игрока: своё — S.look */
const ppLook = nick => (nick === socMe() || nick === '@' ? S.look : ppOf(nick).look);
/* герой пятёрки — герой состава с уровнем, пределом и доблестью игрока, в форме героя боя (как у соперника Арены): мощь — BM.hero */
const PP_HEROES = new Map();
function ppHero(x) {
  const k = x.join('|'); if (PP_HEROES.has(k)) return PP_HEROES.get(k);
  const h = RSI[x[0]]; if (!h || typeof hrCore !== 'function') return null;
  const core = hrCore(h), T = HR_DATA.st[core] || HR_DATA.st['Танк'], caps = INV.hero.capByLim;
  const o = { id: 'pp:' + h.id, rid: h.id, name: h.n, cls: core, clsN: h.cls, el: h.sch, race: h.race, draft: hrDraft(h), r: h.r, cycle: h.c, img: hrImg(h), maxV: h.maxV,
    st: T[0].slice(), gr: T[1].slice(), ab: [], pas: [], ult: null, busy: null, lvl: x[1], lim: x[2], valor: Math.min(x[3], h.maxV), cap: caps[Math.min(x[2], caps.length - 1)] };
  bmProp(o); PP_HEROES.set(k, o); return o;
}
const ppView = o => ({ id: o.id, rid: o.rid, acc: null, rh: RSI[o.rid], own: true, n: o.name, face: rsFace(RSI[o.rid]), r: o.r, cls: o.clsN || o.cls, ic: o.clsN || o.cls,
  el: o.el, race: o.race, c: o.cycle, lvl: o.lvl, cap: o.cap, lim: o.lim, valor: o.valor, maxV: o.maxV, bm: o.bm, busy: '' });
const ppSeenTxt = p => (p.seen == null ? '' : p.seen === 0 ? 'в сети' : `${p.sex === 'f' ? 'была' : 'был'} ${p.seen < 24 ? `${p.seen} ч` : `${Math.floor(p.seen / 24)} ${plural(Math.floor(p.seen / 24), 'день', 'дня', 'дней')}`} назад`);
const ppArg = o => { const [n, ...b] = String((o && o.arg) || '').split('|'); return { nick: socDecode(n).trim(), back: b.join('|') }; };
const ppTo = (nick, back) => `pp:${nick}${back ? '|' + back : ''}`;
/* кнопка-облик, открывающая профиль; своё — «Странник» */
function ppAva(nick, px, back, fx = 'off') {
  if (nick === socMe() || nick === '@') return lkAva(S.look, { px, fx, act: 'go', val: 'profile', label: 'Мой Странник' });
  return lkAva(ppLook(nick), { px, fx, act: 'sheet', val: ppTo(nick, back), label: 'Профиль: ' + nick });
}

/* ================== «сервер» ==================
   Операция с номером: проверка и изменение — одним шагом; повтор того же номера ничего не меняет и отвечает тем же; отказ ничего
   не меняет и номер не тратит. Жалоба — только запись журнала модерации: игрок, на которого пожаловались, ничего не теряет */
const SOC_R = SOC_DATA.rules;
const SOC_REFUSE = {
  self: 'Это вы', blocked: 'Игрок в чёрном списке — сначала разблокируйте', already: 'Уже сделано', none: 'Заявки больше нет',
  full: `Друзей — не больше ${SOC_R.friends}`, outfull: `Заявок разом — не больше ${SOC_R.outgoing}`, notfriend: 'Письма — только друзьям',
  empty: 'Пустое не отправить', day: `Писем в сутки — не больше ${SOC_R.lettersDay}`, muted: 'Чат ограничен модератором',
  level: `Общий чат — с ${SOC_R.chatFrom}-го уровня Странника`, clan: 'Клановый чат — для участников клана', reason: 'Выберите причину жалобы',
  reported: 'Жалоба на этого игрока уже в журнале модерации', appeal: 'Обращение уже принято', nomute: 'Ограничения нет', gone: 'Нельзя',
};
const socDropFr = n => { S.inbox = S.inbox.filter(m => !(m.k === 'fr' && m.from === n)); };
function socAcceptNow(n) {
  if (socFriends().length >= SOC_R.friends) return { refuse: 'full' };
  S.soc.rel[n] = 'friend'; socDropFr(n);
  return { res: { t: 'accept', n } };
}
const socRoom = () => (S.seg.chch === 'clan' ? 'clan' : 'all:' + (S.seg.chlang === 'en' ? 'en' : 'ru'));
function chGate(room) {
  if (room === 'clan') return S.clan && S.clan.in ? '' : 'clan';
  return S.acc.level < SOC_R.chatFrom ? 'level' : '';
}
const SOC_SRV = {
  run(op, f) {
    const O = S.soc.ops;
    if (O[op]) return { again: true, res: O[op] };
    const r = f();
    if (r.res) O[op] = r.res;
    return r;
  },
  /* дружба: заявка, отмена, ответ, удаление; встречная заявка — дружба сразу */
  add(op, n) {
    return this.run(op, () => {
      if (!n || n === socMe()) return { refuse: 'self' };
      const r = socRel(n);
      if (r === 'block') return { refuse: 'blocked' };
      if (r === 'friend' || r === 'out') return { refuse: 'already' };
      if (r === 'in') return socAcceptNow(n);
      if (socOf('out').length >= SOC_R.outgoing) return { refuse: 'outfull' };
      S.soc.rel[n] = 'out';
      return { res: { t: 'add', n } };
    });
  },
  cancel(op, n) { return this.run(op, () => { if (socRel(n) !== 'out') return { refuse: 'none' }; delete S.soc.rel[n]; return { res: { t: 'cancel', n } }; }); },
  accept(op, n) { return this.run(op, () => (socRel(n) === 'in' ? socAcceptNow(n) : { refuse: 'none' })); },
  decline(op, n) { return this.run(op, () => { if (socRel(n) !== 'in') return { refuse: 'none' }; delete S.soc.rel[n]; socDropFr(n); return { res: { t: 'decline', n } }; }); },
  remove(op, n) { return this.run(op, () => { if (socRel(n) !== 'friend') return { refuse: 'none' }; delete S.soc.rel[n]; return { res: { t: 'remove', n } }; }); },
  /* блокировка (§2.3): прекращает дружбу и заявки, скрывает его сообщения в чатах, письма от него не приходят. Разблокировка
     дружбу не возвращает */
  block(op, n) {
    return this.run(op, () => {
      if (!n || n === socMe()) return { refuse: 'self' };
      if (socRel(n) === 'block') return { refuse: 'already' };
      S.soc.rel[n] = 'block'; socDropFr(n);
      /* его непрочитанные письма уходят в архив: скрыты, и колокол их больше не считает */
      S.inbox = S.inbox.filter(m => { if (m.k === 'pm' && m.from === n) { S.soc.read.unshift(m); return false; } return true; });
      return { res: { t: 'block', n } };
    });
  },
  unblock(op, n) { return this.run(op, () => { if (socRel(n) !== 'block') return { refuse: 'none' }; delete S.soc.rel[n]; return { res: { t: 'unblock', n } }; }); },
  /* жалоба — запись журнала модерации и ничего больше: ни ограничения, ни бана, ни очков «кармы». Решает модератор по журналам сервера */
  report(op, n, why) {
    return this.run(op, () => {
      if (!n || n === socMe()) return { refuse: 'self' };
      if (!SOC_DATA.reasons.some(([k]) => k === why)) return { refuse: 'reason' };
      if (S.soc.reports[n]) return { refuse: 'reported' };
      const no = S.soc.modSeq++;
      S.soc.modlog.push({ no, kind: 'report', from: socMe(), on: n, why, at: Date.now(), st: 'ждёт модератора' });
      S.soc.reports[n] = no;
      return { res: { t: 'report', n, no } };
    });
  },
  /* письмо: только другу и только текст (§28.5) */
  letter(op, to, text) {
    return this.run(op, () => {
      if (socRel(to) !== 'friend') return { refuse: 'notfriend' };
      const t = String(text == null ? '' : text).trim();
      if (!t) return { refuse: 'empty' };
      if ([...t].length > SOC_R.letter) return { refuse: 'gone', why: `Письмо — до ${SOC_R.letter} знаков` };
      if (S.soc.sentDay >= SOC_R.lettersDay) return { refuse: 'day' };
      const m = { id: 'ms' + (S.soc.sent.length + 1), to, text: t, at: Date.now() };
      S.soc.sent.unshift(m); S.soc.sentDay++;
      return { res: { t: 'letter', to, id: m.id } };
    });
  },
  /* сообщение чата: канал открыт, ограничения нет, текст не пустой и не длиннее правила */
  chat(op, room, text) {
    return this.run(op, () => {
      const g = chGate(room); if (g) return { refuse: g };
      const M = socMuted(); if (M) return { refuse: 'muted', why: `Вы не можете писать в чат до ${socWhen(M.until)}` };
      const t = String(text == null ? '' : text).trim();
      if (!t) return { refuse: 'empty' };
      if ([...t].length > SOC_R.chat) return { refuse: 'gone', why: `Сообщение — до ${SOC_R.chat} знаков` };
      const L = S.soc.chat.rooms[room] = S.soc.chat.rooms[room] || [];
      L.push({ id: room + ':' + L.length, who: '@', t });
      S.soc.chat.seen[room] = L.length;
      return { res: { t: 'chat', room } };
    });
  },
  /* обжалование ограничения: запись журнала, рассмотрит другой модератор */
  appeal(op) {
    return this.run(op, () => {
      const M = socMuted(); if (!M) return { refuse: 'nomute' };
      if (M.appeal) return { refuse: 'appeal' };
      const no = S.soc.modSeq++;
      S.soc.modlog.push({ no, kind: 'appeal', from: socMe(), ref: M.no, at: Date.now(), st: 'ждёт другого модератора' });
      M.appeal = no;
      return { res: { t: 'appeal', no } };
    });
  },
  /* демо: действие модератора — ограничение чата демо-аккаунту или его снятие. Каждое действие модератора — запись журнала,
     игроку — письмо с причиной, сроком и номером записи */
  mod(op, on) {
    return this.run(op, () => {
      const D = SOC_DATA.mute, no = S.soc.modSeq++, at = Date.now();
      if (on) {
        const until = at + SOC_R.muteH * 3600000;
        S.soc.mute = { no, until, reason: D.reason, by: D.by, appeal: 0 };
        S.soc.modlog.push({ no, kind: 'mute', by: D.by, on: socMe(), why: D.reason, at, until });
        S.inbox.unshift({ id: 'mod' + no, k: 'sys', t: 'Чат ограничен', s: `До ${socWhen(until)}. Причина — ${D.reason}. Запись журнала модерации № ${no}.` });
      } else {
        if (!S.soc.mute) return { refuse: 'nomute' };
        S.soc.modlog.push({ no, kind: 'unmute', by: D.by, on: socMe(), ref: S.soc.mute.no, at });
        S.soc.mute = null;
      }
      return { res: { t: 'mod', on: !!on, no } };
    });
  },
};
function socDo(r, ok) {
  if (r.again) { render(); return false; }
  if (r.refuse) { toast(r.why || SOC_REFUSE[r.refuse] || 'Нельзя'); return false; }
  S.soc.seq++;
  if (ok) ok(r.res);
  return true;
}

/* ================== почта: письма во Входящих ==================
   Письмо Входящих: награда — валюта, предметы и сундуки; у письма о готовом ритуале — награда ритуала (screens/rituals.js).
   k: away — «пока вас не было», mail — письмо сервера, pm — письмо друга, fr — заявка в друзья, sys — сообщение сервера */
const mailRit = m => (m.rit && S.rituals ? S.rituals.slots.find(s => s.uid === m.rit && s.st === 'ready') || null : null);
const mailHas = m => !!((m.rew && m.rew.length) || (m.chests && m.chests.length) || mailRit(m));
function mailRewHtml(m) {
  const r = mailRit(m), out = [];
  if (r) out.push(ritRewHtml(r, r.kind, 'noop'));
  for (const [id, n] of m.rew || []) out.push(CUR[id] ? money(id, n) : BAG.item(id) ? `<span class="row">${itWell(id, { act: 'noop', size: 26 })}<b class="num">×${fmt(n)}</b></span>` : '');
  for (const sp of m.chests || []) out.push(`<span class="row"><span class="well" data-r="${sp.r}" style="--s:26px"><img src="${CHEST}" alt=""></span><small>${LBX && LBX.boxes[sp.box] ? lbBoxName(sp.box, sp.r, sp.win) : 'Сундук'}</small></span>`);
  return out.join('');
}
/* вкладка письма: pm — «Письма», заявки и сообщения сервера без награды — «Система», остальное — «Награды» */
const mlTab = m => (m.k === 'pm' ? 'pm' : m.k === 'fr' || m.k === 'sys' || (m.k === 'mail' && !mailHas(m)) ? 'sys' : 'rew');
const mlFind = id => S.inbox.find(m => m.id === id && m.k === 'pm') || S.soc.read.find(m => m.id === id) || null;
const mlShown = m => socRel(m.from) !== 'block';   // письма из чёрного списка не показываются
const giftReady = () => !!(S.gift && S.gift.got < S.gift.day);
const ML_TABS = [['rew', 'Награды'], ['pm', 'Письма'], ['sys', 'Система']];
function mlPending(t) {
  if (t === 'rew') return S.inbox.some(m => mlTab(m) === 'rew') || giftReady();
  if (t === 'pm') return S.inbox.some(m => m.k === 'pm' && mlShown(m));
  return S.inbox.some(m => mlTab(m) === 'sys');
}
function mlRewRow(m) {
  const rew = mailRewHtml(m), has = mailHas(m);
  return `<div class="mail"><div class="col" style="gap:2px;min-width:0"><b>${m.t}</b><small class="faint">${m.s}</small>${rew ? `<span class="rw" style="margin-top:4px">${rew}</span>` : ''}</div>${has ? `<button class="btn sm go" data-a="claim" data-v="${m.id}">Забрать</button>` : m.go ? `<button class="btn sm" data-a="claimgo" data-v="${m.id}">Открыть</button>` : `<button class="btn sm ghost" data-a="claim" data-v="${m.id}">Прочитано</button>`}</div>`;
}
function mlPmRow(m, unread) {
  return `<div class="mail ml-pm${unread ? ' new' : ''}">${ppAva(m.from, SOC_VIEW.ava.row, 'inbox')}<button class="ml-t" data-a="mlopen" data-v="${socEsc(m.id)}"><b>${socEsc(m.from)}</b><small class="faint">${socEsc(socCut(m.text))}</small></button>${unread ? '<span class="dot" aria-label="Не прочитано"></span>' : ''}</div>`;
}
function mlSysRow(m, op) {
  if (m.k === 'fr') {
    const n = m.from;
    return `<div class="mail ml-fr">${ppAva(n, SOC_VIEW.ava.row, 'inbox')}<div class="col ml-t" style="gap:2px"><b>Заявка в друзья</b><small class="faint">${socEsc(n)}</small></div>
      <button class="btn sm ghost" data-a="ppdo" data-v="${socEsc(`decline|${op}|${n}`)}">Отклонить</button><button class="btn sm go" data-a="ppdo" data-v="${socEsc(`accept|${op}|${n}`)}">Принять</button></div>`;
  }
  return mlRewRow(m);
}

/* ================== профиль игрока: вид ================== */
function ppHeadHtml(nick, p, rel, back) {
  const chip = { friend: ['spirit', 'в друзьях'], out: ['', 'заявка отправлена'], in: ['warn', 'хочет дружить'], block: ['bad', 'в чёрном списке'], me: ['spirit', 'это вы'] }[rel];
  const mine = S.clan && S.clan.in && p.clan === S.clan.n, seen = rel === 'friend' || mine ? ppSeenTxt(p) : '';
  return `<div class="pp-head">${lkAva(p.look, { px: SOC_VIEW.ava.head })}<div class="col pp-id">
    <div class="row pp-chips"><span class="chip gold">уровень ${p.lvl}</span><span class="chip">цикл ${ROMAN[p.cyc]}</span>${chip ? `<span class="chip ${chip[0]}">${chip[1]}</span>` : ''}</div>
    ${p.clan ? ppClanLink(p.clan) : '<span class="faint pp-clan">без клана</span>'}${seen ? `<small class="${p.seen === 0 ? 'spirit' : 'faint'}">${seen}</small>` : ''}</div></div>`;
}
/* клан ведёт в паспорт именно этого клана (§2.3): свой — экран «Клан», чужой — паспорт из поиска кланов */
const ppClanOk = id => { try { return typeof OV.clfind === 'function' && !!OV.clfind({ t: 'clfind', arg: id }); } catch (_) { return false; } };
function ppClanLink(name) {
  const mine = S.clan && S.clan.in && name === S.clan.n, id = SOC_DATA.clans[name], inner = `${ic('shield')}${socEsc(name)}`;
  if (mine) return `<button class="link pp-clan" data-a="go" data-v="clan">${inner}</button>`;
  if (id && ppClanOk(id)) return `<button class="link pp-clan" data-a="sheet" data-v="clfind:${id}">${inner}</button>`;
  return `<span class="pp-clan faint">${inner}</span>`;
}
function ppFiveHtml(nick, p, back) {
  const hs = p.top.map(ppHero).filter(Boolean), sum = hs.reduce((a, h) => a + h.bm, 0);
  if (!hs.length) return '';
  return `<div class="row"><span class="eyebrow">Пятёрка сильнейших</span><span class="g-spacer"></span>${bmHtml(sum, 14)}</div>
    <div class="sq-slots pp-five">${hs.map((h, i) => hrTile(ppView(h), { act: 'sheet', val: socEsc(`pphero:${nick}|${i}${back ? '|' + back : ''}`), bm: true })).join('')}</div>`;
}
function ppAchHtml(p) {
  const A = p.ach;
  return `<span class="eyebrow">Достижения · ${fmt(A.n)} из ${fmt(A.of)}</span>
    ${A.best.length ? `<div class="pp-ach">${A.best.map(a => `<span class="pp-a" data-r="${a.r}"><span class="rar" data-r="${a.r}"></span>${socEsc(a.n)}</span>`).join('')}</div>` : ''}
    ${A.titles.length ? `<div class="row pp-titles">${A.titles.map(t => `<span class="chip gold">${ic('crown')}${socEsc(t)}</span>`).join('')}</div>` : ''}`;
}
/* свой профиль по нажатию на свой портрет: то же, но данные аккаунта; действия — в «Страннике» */
function ppMine() {
  const W = window.EN_WANDERER, got = W && S.wn ? W.ach.list.filter(a => S.wn.ach.got[a.id]) : [];
  const mine = typeof hrMine === 'function' ? hrMine() : S.heroes, top = [...mine].sort((a, b) => b.bm - a.bm).slice(0, 5);
  return { nick: socMe(), sex: S.look.sex, lvl: S.acc.level, cyc: S.acc.cycle, clan: S.clan && S.clan.in ? S.clan.n : '', look: S.look, seen: null, mineTop: top,
    ach: { n: got.length, of: W ? W.ach.list.length : 0, best: got.filter(a => a.cat !== 'myst').sort((a, b) => b.r - a.r).slice(0, SOC_VIEW.best),
      titles: W && S.wn ? W.ach.firsts.filter(f => S.wn.ach.first[f.id] === '@').map(f => f.title) : [] } };
}
const ppBackBtn = back => (back ? `<button class="iconbtn" data-a="sheet" data-v="${socEsc(back)}" aria-label="Назад" title="Назад">${ic('back')}</button>` : '');

/* ================== листы ================== */
Object.assign(OV, {
  /* профиль игрока: arg — «имя|откуда вернуться» */
  pp(o) {
    const { nick, back } = ppArg(o); if (!nick) return '';
    const me = nick === socMe(), p = me ? ppMine() : ppOf(nick), rel = me ? 'me' : socRel(nick), op = socOp(), to = ppTo(nick, back);
    if (me) {
      const five = `<div class="row"><span class="eyebrow">Пятёрка сильнейших</span><span class="g-spacer"></span>${bmHtml(BM.squad(p.mineTop.map(h => h.id)), 14)}</div><div class="sq-slots pp-five">${p.mineTop.map(h => heroCard(h, { act: 'noop' })).join('')}</div>`;
      return sheet(socEsc(nick), `${ppHeadHtml(nick, p, 'me', back)}${five}${ppAchHtml(p)}`, `${ppBackBtn(back)}<span class="g-spacer"></span><button class="btn go" data-a="go" data-v="profile">Мой Странник</button>`, true);
    }
    const blocked = rel === 'block', him = p.sex === 'f' ? 'её' : 'его';
    const body = blocked ? `${ppHeadHtml(nick, p, rel, back)}<p class="reason">Игрок в вашем чёрном списке: ${him} сообщения в чате скрыты, заявки и письма от ${p.sex === 'f' ? 'неё' : 'него'} не приходят.</p>`
      : `${ppHeadHtml(nick, p, rel, back)}${ppFiveHtml(nick, p, back)}${ppAchHtml(p)}`;
    const nv = n => socEsc(n);
    let foot;
    if (blocked) foot = `${ppBackBtn(back)}<span class="g-spacer"></span><button class="btn" data-a="ppdo" data-v="${nv(`unblock|${op}|${nick}`)}">Разблокировать</button>`;
    else {
      const side = `<button class="iconbtn" data-a="dlg" data-v="${nv(`ppreport:${nick}|${back}`)}" aria-label="Пожаловаться" title="Пожаловаться">${ic('flag')}</button>`
        + `<button class="iconbtn" data-a="dlg" data-v="${nv(`ppblock:${nick}|${back}`)}" aria-label="Заблокировать" title="Заблокировать">${ic('lock')}</button>`
        + (rel === 'friend' ? `<button class="iconbtn" data-a="dlg" data-v="${nv(`ppunf:${nick}|${back}`)}" aria-label="Удалить из друзей" title="Удалить из друзей">${ic('minus')}</button>` : '');
      const main = rel === 'friend' ? `<button class="btn go" data-a="sheet" data-v="${nv(`write:${nick}`)}">${ic('chat')}Написать</button>`
        : rel === 'out' ? `<button class="btn" data-a="ppdo" data-v="${nv(`cancel|${op}|${nick}`)}">Отменить заявку</button>`
        : rel === 'in' ? `<button class="btn ghost" data-a="ppdo" data-v="${nv(`decline|${op}|${nick}`)}">Отклонить</button><button class="btn go" data-a="ppdo" data-v="${nv(`accept|${op}|${nick}`)}">${ic('check')}Принять</button>`
        : `<button class="btn go" data-a="ppdo" data-v="${nv(`add|${op}|${nick}`)}">${ic('plus')}В друзья</button>`;
      foot = `${ppBackBtn(back)}${side}<span class="g-spacer"></span>${main}`;
    }
    return sheet(socEsc(nick), body, foot, true);
  },
  /* герой из пятёрки игрока: шапка героя с его уровнем, доблестью и пределом, кто он; назад — к профилю */
  pphero(o) {
    const [n, i, ...b] = String(o.arg || '').split('|'), nick = socDecode(n).trim(), back = b.join('|');
    const p = nick === socMe() ? null : ppOf(nick), x = p ? p.top[+i] : null, h = x ? ppHero(x) : null;
    if (!h) return sheet('Герой', '<p class="faint">Героя больше нет в пятёрке.</p>', ppBackBtn(ppTo(nick, back)));
    const rh = RSI[h.rid];
    return sheet(socEsc(h.name), `${hrHead(ppView(h))}${rh && rh.who ? foldLore(rh.who) : ''}<p class="reason">Герой игрока ${socEsc(nick)}: уровень, доблесть и предел — его.</p>`,
      `${ppBackBtn(ppTo(nick, back))}<span class="g-spacer"></span><button class="btn" data-a="sheet" data-v="${socEsc(ppTo(nick, back))}">К профилю</button>`, true);
  },
  /* жалоба: причина — одна из списка; уходит модератору, сама никого не наказывает */
  ppreport(o) {
    const { nick, back } = ppArg(o), op = socOp(), why = S.soc.rep, done = S.soc.reports[nick], to = ppTo(nick, back);
    if (done) return dialog('Жалоба', `<p class="muted">Жалоба на ${socEsc(nick)} уже в журнале модерации — запись № ${done}. Её рассмотрит модератор.</p>`, `<button class="btn go" data-a="sheet" data-v="${socEsc(to)}">К профилю</button>`);
    const chips = SOC_DATA.reasons.map(([k, n]) => `<button class="pp-rsn" data-a="pprsn" data-v="${k}" aria-pressed="${why === k}">${n}</button>`).join('');
    return dialog('Жалоба', `<div class="row pp-dh">${lkAva(ppLook(nick), { px: SOC_VIEW.ava.row, fx: 'off' })}<b class="serif">${socEsc(nick)}</b></div>
      <div class="pp-rsns" role="group" aria-label="Причина">${chips}</div>
      <p class="reason">Жалоба уходит модератору вместе с журналами сервера и сама никого не наказывает. Критика игры — не нарушение.</p>`,
    `<button class="btn ghost" data-a="sheet" data-v="${socEsc(to)}">Отмена</button><button class="btn go" data-a="ppdo" data-v="${socEsc(`report|${op}|${nick}`)}"${why ? '' : ' disabled'}>${ic('flag')}Отправить</button>`);
  },
  /* блокировка — с понятными последствиями (§2.3) */
  ppblock(o) {
    const { nick, back } = ppArg(o), op = socOp(), p = ppOf(nick), f = p.sex === 'f';
    return dialog('Заблокировать', `<div class="row pp-dh">${lkAva(p.look, { px: SOC_VIEW.ava.row, fx: 'off' })}<b class="serif">${socEsc(nick)}</b></div>
      <ul class="pp-cons"><li>Дружба и заявки прекратятся.</li><li>${f ? 'Её' : 'Его'} сообщения в общем и клановом чатах скроются.</li><li>Письма от ${f ? 'неё' : 'него'} не придут.</li><li>Разблокировка дружбу не вернёт.</li></ul>`,
    `<button class="btn ghost" data-a="sheet" data-v="${socEsc(ppTo(nick, back))}">Отмена</button><button class="btn warn" data-a="ppdo" data-v="${socEsc(`block|${op}|${nick}`)}">${ic('lock')}Заблокировать</button>`);
  },
  /* удаление из друзей — с подтверждением (§2.3) */
  ppunf(o) {
    const { nick, back } = ppArg(o), op = socOp(), p = ppOf(nick);
    return dialog('Удалить из друзей', `<div class="row pp-dh">${lkAva(p.look, { px: SOC_VIEW.ava.row, fx: 'off' })}<b class="serif">${socEsc(nick)}</b></div>
      <p class="muted">Письма друг другу станут недоступны. Прочитанное останется. Дружить снова — новой заявкой.</p>`,
    `<button class="btn ghost" data-a="sheet" data-v="${socEsc(ppTo(nick, back))}">Отмена</button><button class="btn warn" data-a="ppdo" data-v="${socEsc(`remove|${op}|${nick}`)}">Удалить</button>`);
  },
  /* «Друзья»: вкладки S.seg.frt — друзья с поиском по имени, заявки, чёрный список */
  friends() {
    const t = ['list', 'req', 'block'].includes(S.seg.frt) ? S.seg.frt : 'list', op = socOp(), fr = socFriends(), inc = socOf('in'), out = socOf('out'), bl = socOf('block');
    const tabs = `<div class="tabs" role="tablist" aria-label="Друзья">${[['list', 'Друзья', fr.length], ['req', 'Заявки', inc.length + out.length], ['block', 'Чёрный список', bl.length]]
      .map(([k, n, q]) => `<button role="tab" aria-selected="${t === k}" data-a="seg" data-v="frt:${k}">${n} · ${q}${k === 'req' && inc.length ? '<span class="bdg soc-dot" aria-hidden="true"></span>' : ''}</button>`).join('')}</div>`;
    const sub = n => { const p = ppOf(n), s = socRel(n) === 'friend' ? ppSeenTxt(p) : ''; return `уровень ${p.lvl} · цикл ${ROMAN[p.cyc]}${s ? ' · ' + s : ''}`; };
    const row = (n, acts) => `<div class="fr-row">${ppAva(n, SOC_VIEW.ava.row, 'friends')}<button class="fr-t" data-a="sheet" data-v="${socEsc(ppTo(n, 'friends'))}"><b>${socEsc(n)}</b><small class="faint">${sub(n)}</small></button>${acts}</div>`;
    const nv = s => socEsc(s);
    let body;
    if (t === 'list') {
      const q = String(S.soc.q || '').trim().toLowerCase();
      const find = `<label class="search fr-find">${ic('search')}<input id="frFind" type="search" value="${socEsc(S.soc.q || '')}" placeholder="Имя игрока" autocomplete="off" aria-label="Найти игрока по имени"></label>`;
      if (q) {
        const hits = [...socNames()].filter(n => n.toLowerCase().includes(q)).sort((a, b) => a.localeCompare(b)).slice(0, SOC_VIEW.find);
        body = find + (hits.map(n => { const r = socRel(n);
          const act = r === 'friend' ? `<span class="chip spirit">друг</span>` : r === 'out' ? '<span class="chip">заявка</span>' : r === 'in' ? `<button class="btn sm go" data-a="ppdo" data-v="${nv(`accept|${op}|${n}`)}">Принять</button>`
            : r === 'block' ? '<span class="chip bad">в чёрном списке</span>' : `<button class="btn sm" data-a="ppdo" data-v="${nv(`add|${op}|${n}`)}">${ic('plus')}В друзья</button>`;
          return row(n, act); }).join('') || '<p class="faint">Никого с таким именем.</p>');
      } else {
        const list = fr.slice().sort((a, b) => (ppOf(a).seen === 0 ? 0 : 1) - (ppOf(b).seen === 0 ? 0 : 1) || a.localeCompare(b));
        body = find + (list.map(n => row(n, `<button class="iconbtn" data-a="sheet" data-v="${nv(`write:${n}`)}" aria-label="Написать: ${nv(n)}" title="Написать">${ic('chat')}</button>`)).join('')
          || '<p class="faint">Друзей пока нет. Добавить — из профиля игрока: нажмите на его портрет в чате, клане или на Арене.</p>');
      }
    } else if (t === 'req') {
      body = (inc.length ? `<span class="eyebrow">Хотят дружить</span>${inc.map(n => row(n, `<button class="btn sm ghost" data-a="ppdo" data-v="${nv(`decline|${op}|${n}`)}">Отклонить</button><button class="btn sm go" data-a="ppdo" data-v="${nv(`accept|${op}|${n}`)}">Принять</button>`)).join('')}` : '')
        + (out.length ? `<span class="eyebrow">Ваши заявки</span>${out.map(n => row(n, `<button class="btn sm ghost" data-a="ppdo" data-v="${nv(`cancel|${op}|${n}`)}">Отменить</button>`)).join('')}` : '')
        || '<p class="faint">Заявок нет.</p>';
    } else {
      body = (bl.map(n => row(n, `<button class="btn sm" data-a="ppdo" data-v="${nv(`unblock|${op}|${n}`)}">Разблокировать</button>`)).join('') || '<p class="faint">Чёрный список пуст.</p>')
        + '<p class="reason">Сообщения игроков из чёрного списка скрыты, их заявки и письма не приходят.</p>';
    }
    const demo = TM(`<span class="soc-demo"><span>Демо:</span><button class="link" data-a="socdemo" data-v="req">новая заявка</button>${out.length ? `<button class="link" data-a="socdemo" data-v="yes">заявку приняли</button>` : ''}</span>`);
    return sheet('Друзья', `${tabs}${demo}<div class="col fr-list" data-keep="friends">${body}</div>`, `<span class="faint">Друзей ${fr.length} из ${SOC_R.friends}</span>`, true);
  },
  /* «Входящие»: вкладки S.seg.mailt — награды, письма друзей, система. Передача ресурсов почтой запрещена (§28.5) */
  inbox() {
    const t = ML_TABS.some(([k]) => k === S.seg.mailt) ? S.seg.mailt : 'rew', op = socOp();
    const tabs = `<div class="tabs ml-tabs" role="tablist" aria-label="Входящие">${ML_TABS.map(([k, n]) => `<button role="tab" aria-selected="${t === k}" data-a="seg" data-v="mailt:${k}">${n}${mlPending(k) ? '<span class="bdg soc-dot" aria-hidden="true"></span><span class="sr">, есть новое</span>' : ''}</button>`).join('')}</div>`;
    let body = '', foot = '';
    if (t === 'rew') {
      const away = S.inbox.filter(m => mlTab(m) === 'rew' && m.k === 'away'), rew = S.inbox.filter(m => mlTab(m) === 'rew' && m.k !== 'away');
      body = `${away.length ? `<span class="eyebrow">Пока вас не было</span>${away.map(mlRewRow).join('')}` : ''}
        ${rew.length ? `<span class="eyebrow">Награды</span>${rew.map(mlRewRow).join('')}` : ''}
        ${!away.length && !rew.length ? '<p class="faint">Пусто. Всё забрано.</p>' : ''}
        <span class="eyebrow">Дар дня</span><button class="mail" data-a="dlg" data-v="gift" style="text-align:left;width:100%;color:var(--parch)"><div class="col" style="gap:2px"><b>День ${S.gift.day} из 30</b><small class="faint">главный дар — на двадцатый день</small></div><span class="chip ${giftReady() ? 'spirit' : ''}">${giftReady() ? 'можно забрать' : 'получено'}</span></button>`;
      if (S.inbox.some(mailHas)) foot = '<span class="faint" style="font-size:12px">Передача ресурсов почтой запрещена · предметы — в запасы</span><button class="btn go" data-a="claimall">Забрать всё</button>';
    } else if (t === 'pm') {
      const unread = S.inbox.filter(m => m.k === 'pm' && mlShown(m)), read = S.soc.read.filter(mlShown), sent = S.soc.sent;
      body = `${unread.map(m => mlPmRow(m, true)).join('')}${read.length ? `<span class="eyebrow">Прочитанные</span>${read.map(m => mlPmRow(m, false)).join('')}` : ''}
        ${!unread.length && !read.length ? '<p class="faint">Писем пока нет. Писать можно друзьям.</p>' : ''}
        ${sent.length ? `<details class="ml-sent"><summary><span class="eyebrow">Отправленные · ${sent.length}</span></summary>${sent.map(m => `<div class="mail ml-pm">${ppAva(m.to, SOC_VIEW.ava.row, 'inbox')}<div class="col ml-t" style="gap:2px"><b>${socEsc(m.to)}</b><small class="faint">${socEsc(socCut(m.text))}</small></div></div>`).join('')}</details>` : ''}
        ${TM('<span class="soc-demo"><span>Демо:</span><button class="link" data-a="socdemo" data-v="pm">письмо от друга</button></span>')}`;
      foot = `<span class="faint" style="font-size:12px">Только текст и только друзьям</span><button class="btn go" data-a="sheet" data-v="write">${ic('chat')}Написать</button>`;
    } else {
      const sys = S.inbox.filter(m => mlTab(m) === 'sys');
      body = sys.map(m => mlSysRow(m, op)).join('') || '<p class="faint">Сообщений нет.</p>';
    }
    return sheet('Входящие', `${tabs}<div class="col ml-list" data-keep="inbox:${t}">${body}</div>`, foot);
  },
  /* письмо друга: от кого — облик и имя; ответить — если он всё ещё друг */
  letter(o) {
    const m = mlFind(o.arg); if (!m) return sheet('Письмо', '<p class="faint">Письма больше нет.</p>', `<button class="btn" data-a="sheet" data-v="inbox">Во Входящие</button>`);
    const rel = socRel(m.from);
    return sheet('Письмо', `<div class="row ml-from">${ppAva(m.from, SOC_VIEW.ava.letter, 'letter:' + m.id)}<div class="col" style="gap:2px"><b class="serif ml-fn">${socEsc(m.from)}</b><small class="faint">${rel === 'friend' ? 'друг' : rel === 'block' ? 'в чёрном списке' : ''}</small></div></div>
      <div class="ml-text">${String(m.text).split(/\n+/).map(x => `<p>${socEsc(x)}</p>`).join('')}</div>`,
    `<button class="iconbtn" data-a="sheet" data-v="inbox" aria-label="Во Входящие" title="Во Входящие">${ic('back')}</button><span class="g-spacer"></span>${rel === 'friend' ? `<button class="btn go" data-a="sheet" data-v="${socEsc(`write:${m.from}`)}">${ic('chat')}Ответить</button>` : ''}`);
  },
  /* новое письмо: кому — один из друзей, текст — до SOC_R.letter знаков */
  write(o) {
    const fr = socFriends(), M = S.soc.mail, arg = socDecode(o && o.arg ? o.arg : '');
    if (arg && fr.includes(arg) && M.for !== arg) { M.to = arg; M.for = arg; }
    const to = fr.includes(M.to) ? M.to : '', op = socOp();
    if (!fr.length) return sheet('Письмо', '<p class="faint">Письма — только друзьям. Добавьте друга из профиля игрока: нажмите на его портрет в чате, клане или на Арене.</p>', '<button class="btn" data-a="sheet" data-v="friends">Друзья</button>');
    const chips = fr.map(n => `<button class="ml-to" data-a="mlto" data-v="${socEsc(n)}" aria-pressed="${n === to}">${lkAva(ppLook(n), { px: SOC_VIEW.ava.to, fx: 'off' })}<span>${socEsc(n)}</span></button>`).join('');
    return sheet('Письмо', `<span class="eyebrow">Кому</span><div class="ml-tos" role="group" aria-label="Кому">${chips}</div>
      <textarea id="mlText" class="ml-area" maxlength="${SOC_R.letter}" placeholder="Текст письма" aria-label="Текст письма">${socEsc(M.text)}</textarea>
      <p class="row reason"><span>Только текст: предметы и валюту почтой не передать.</span><span class="g-spacer"></span><span class="num" id="mlCount">${[...String(M.text)].length} / ${SOC_R.letter}</span></p>`,
    `<button class="iconbtn" data-a="sheet" data-v="inbox" aria-label="Во Входящие" title="Во Входящие">${ic('back')}</button><span class="g-spacer"></span><button class="btn go" data-a="mlsend" data-v="${op}"${to ? '' : ' disabled'}>Отправить</button>`, true);
  },
  /* чат: каналы S.seg.chch — «Общий» и «Клан», язык общего — S.seg.chlang. Сообщение — облик, имя, текст; живые частицы — у последних */
  chat() {
    const C = S.soc.chat, ch = S.seg.chch === 'clan' ? 'clan' : 'all', lang = S.seg.chlang === 'en' ? 'en' : 'ru', room = ch === 'clan' ? 'clan' : 'all:' + lang;
    const g = chGate(room), all = g ? [] : C.rooms[room] || [], shown = all.filter(m => m.who === '@' || socRel(m.who) !== 'block'), hid = all.length - shown.length, op = socOp();
    if (!g) C.seen[room] = all.length;   // открытая комната прочитана
    const dot = k => (k === 'all' ? chUnread('all:' + lang) : chUnread('clan')) ? '<span class="bdg soc-dot" aria-hidden="true"></span><span class="sr">, есть новое</span>' : '';
    const top = `<div class="row ch-top"><div class="tabs" role="tablist" aria-label="Канал">${[['all', 'Общий'], ['clan', 'Клан']].map(([k, n]) => `<button role="tab" aria-selected="${ch === k}" data-a="seg" data-v="chch:${k}">${n}${ch === k ? '' : dot(k)}</button>`).join('')}</div><span class="g-spacer"></span>
      ${ch === 'all' ? `<div class="tabs ch-lang" role="tablist" aria-label="Язык канала">${SOC_DATA.langs.map(([k, n]) => `<button role="tab" aria-selected="${lang === k}" data-a="seg" data-v="chlang:${k}">${n}</button>`).join('')}</div>` : ''}</div>`;
    const live = new Set(shown.slice(-SOC_VIEW.chatLive));
    const list = g ? `<div class="ch-gate"><p class="muted">${SOC_REFUSE[g]}.</p>${g === 'clan' ? `<button class="btn sm" data-a="go" data-v="clan">${ic('shield')}Найти клан</button>` : ''}</div>`
      : `<div class="ch-list" data-keep="chat:${room}">${shown.slice().reverse().map(m => chMsg(m, live.has(m))).join('') || '<p class="faint">Здесь пока тихо.</p>'}</div>${hid ? `<p class="reason ch-hid">Скрыто из чёрного списка: ${hid}</p>` : ''}`;
    const M = socMuted(), demo = TM(`<span class="soc-demo"><span>Демо:</span><button class="link" data-a="socdemo" data-v="mute">${M ? 'снять ограничение' : 'ограничение чата'}</button><button class="link" data-a="socdemo" data-v="say">сообщение друга</button><span class="faint">журнал модерации: ${S.soc.modlog.length}</span></span>`);
    let foot;
    if (g) foot = '';
    else if (M) foot = `<div class="col ch-mute"><b>Вы не можете писать в чат до ${socWhen(M.until)}.</b><small class="faint">Причина — ${socEsc(M.reason)}. Решение модератора в журнале · № ${M.no}. Читать чат можно.</small>${M.appeal ? `<small class="spirit">Обращение № ${M.appeal}: решение проверит другой модератор.</small>` : ''}</div>${M.appeal ? '' : `<button class="btn sm" data-a="chappeal" data-v="${op}">Оспорить</button>`}`;
    else foot = `<label class="search grow ch-in">${ic('chat')}<input id="chIn" type="text" value="${socEsc(C.draft)}" maxlength="${SOC_R.chat}" placeholder="Сообщение" autocomplete="off" enterkeyhint="send" aria-label="Сообщение в канал «${ch === 'clan' ? 'Клан' : 'Общий'}»"></label><button class="btn sm go" data-a="chsend" data-v="${op}">Отправить</button>`;
    return sheet('Чат', `${top}${demo}${list}`, foot, true);
  },
});
/* сообщение: облик — кнопка профиля, имя, текст; своё — отмечено */
function chMsg(m, live) {
  const me = m.who === '@', nick = me ? socMe() : m.who;
  return `<div class="ch-msg${me ? ' me' : ''}">${ppAva(me ? '@' : nick, SOC_VIEW.ava.chat, 'chat', live ? 'live' : 'off')}<div class="ch-b"><b class="ch-nk">${socEsc(nick)}</b><p>${socEsc(m.t)}</p></div></div>`;
}
/* непрочитанные: после отметки комнаты, не свои и не из чёрного списка */
function chUnread(room) {
  const L = S.soc.chat.rooms[room] || [], from = S.soc.chat.seen[room] || 0;
  return L.slice(from).filter(m => m.who !== '@' && socRel(m.who) !== 'block').length;
}
/* бейдж «Чата» в Убежище: непрочитанное в открытых комнатах — общий на своём языке и клан */
function socChatN() {
  if (!S.soc) return 0;
  const rooms = [];
  if (!chGate('all:ru')) rooms.push('all:' + (S.seg.chlang === 'en' ? 'en' : 'ru'));
  if (!chGate('clan')) rooms.push('clan');
  return rooms.reduce((a, r) => a + chUnread(r), 0);
}

/* ================== профиль по нажатию на портрет на других экранах ==================
   Экраны Арены, клана и рейтингов не правятся: их листы дополняются здесь. Имя игрока — из заголовка листа или строки рейтинга */
const socTitle = h => { const m = String(h || '').match(/<div class="sheet-h"><h2>([^<]*)<\/h2>/); return m ? socDecode(m[1]).trim() : ''; };
/* витрина соперника Арены и Лиги: его облик и «Профиль игрока» — первой строкой листа */
function socStrip(h, nick, back) {
  if (!h || !nick || !socIsPlayer(nick)) return h;
  const strip = `<div class="pp-strip">${ppAva(nick, SOC_VIEW.ava.strip, back)}<button class="link" data-a="sheet" data-v="${socEsc(ppTo(nick, back))}">Профиль игрока ${ic('chev')}</button></div>`;
  return h.replace('<div class="sheet-b">', '<div class="sheet-b">' + strip);
}
for (const k of ['opp', 'lgopp']) {
  const base = OV[k];
  if (typeof base === 'function') OV[k] = function (o) { const h = base.call(this, o); return socStrip(h, socTitle(h), `${k}:${o && o.arg != null ? o.arg : ''}`); };
}
/* участник клана: вместо инициалов — облик, нажатие — профиль; свой — «Странник» */
const socClmem = OV.clmem;
if (typeof socClmem === 'function') OV.clmem = function (o) {
  const h = socClmem.call(this, o); if (!h) return h;
  const m = S.clan && S.clan.members ? S.clan.members.find(x => x.id === (o && o.arg)) : null; if (!m) return h;
  const ava = ppAva(m.me ? '@' : m.n, SOC_VIEW.ava.strip, `clmem:${m.id}`);
  const re = /<span class="cl-av lg"[^>]*>[^<]*<\/span>/;
  return re.test(h) ? h.replace(re, ava) : socStrip(h, m.n, `clmem:${m.id}`);
};
/* список участников клана: инициалы — обликом, без частиц */
const socClanScr = SCREENS.clan;
if (typeof socClanScr === 'function') SCREENS.clan = function () {
  const r = socClanScr.apply(this, arguments);
  if (!r || typeof r.html !== 'string' || S.seg.clan !== 'mem') return r;
  r.html = r.html.replace(/<span class="cl-av" data-role="([^"]*)">[^<]*<\/span>(\s*<span class="cl-mt"><b>)([^<]*)<\/b>/g, (all, role, mid, name) => {
    const t = socDecode(name), me = / · вы$/.test(t), nick = t.replace(/ · вы$/, '').trim();
    return `<span class="cl-av pp-ca" data-role="${role}">${lkAva(me ? S.look : ppLook(nick), { px: SOC_VIEW.ava.list, fx: 'off' })}</span>${mid}${name}</b>`;
  });
  return r;
};
/* заявки в клан: вместо инициалов — облик, нажатие — профиль */
const socClapps = OV.clapps;
if (typeof socClapps === 'function') OV.clapps = function (o) {
  const h = socClapps.call(this, o); if (typeof h !== 'string') return h;
  return h.replace(/<span class="cl-av">[^<]*<\/span>(<span class="cl-mt"><b>)([^<]*)<\/b>/g, (all, mid, name) => `${ppAva(socDecode(name).trim(), SOC_VIEW.ava.list, 'clapps')}${mid}${name}</b>`);
};
/* журнал обороны Арены: имя нападавшего — профиль */
const socArLog = (h, back) => (typeof h !== 'string' ? h : h.replace(/<span class="tx"><b>([^<]*)<\/b>/g, (all, name) => {
  const nick = socDecode(name).trim();
  return socIsPlayer(nick) ? `<span class="tx"><button class="pp-nm" data-a="sheet" data-v="${socEsc(ppTo(nick, back))}" aria-label="Профиль: ${socEsc(nick)}"><b>${name}</b></button>` : all;
}));
const socArdef = OV.ardef;
if (typeof socArdef === 'function') OV.ardef = function (o) { return socArLog(socArdef.call(this, o), 'ardef'); };
const socArenaScr = SCREENS.arena;
if (typeof socArenaScr === 'function') SCREENS.arena = function () {
  const r = socArenaScr.apply(this, arguments);
  if (r && typeof r.html === 'string' && S.seg.arena === 'def') r.html = socArLog(r.html, '');
  return r;
};
/* рейтинги: имя игрока в строке — облик и профиль; кланы и своя строка — как были */
function socRankLinks(h, back) {
  if (typeof h !== 'string') return h;
  return h.replace(/<div class="rkrow( me)?([^"]*)"><b class="serif">([^<]*)<\/b><span>([^<]*)<\/span>/g, (all, me, rest, place, name) => {
    const nick = socDecode(name).trim();
    if (me || !socIsPlayer(nick)) return all;
    return `<div class="rkrow${rest}"><b class="serif">${place}</b><button class="pp-nm" data-a="sheet" data-v="${socEsc(ppTo(nick, back))}" aria-label="Профиль: ${socEsc(nick)}">${lkAva(ppLook(nick), { px: SOC_VIEW.ava.rank, fx: 'off' })}<span>${name}</span></button>`;
  });
}
for (const k of ['rank', 'wkmode', 'evrew']) {
  const base = OV[k];
  if (typeof base === 'function') OV[k] = function (o) { return socRankLinks(base.call(this, o), `${k}:${o && o.arg != null ? o.arg : ''}`); };
}

/* ================== действия ================== */
Object.assign(ACT, {
  /* письмо с наградой: уходит из Входящих до выдачи — повтор ничего не выдаст. Валюта — в кошелёк, предметы — в запасы, сундуки — BAG.addChest */
  claim(v) {
    const m = S.inbox.find(x => x.id === v); if (!m) return;
    const r = mailRit(m);
    S.inbox = S.inbox.filter(x => x !== m);
    if (r) ACT.rclaim(String(S.rituals.slots.indexOf(r)));
    for (const [id, n] of m.rew || []) { if (CUR[id]) S.wallet[id] += n; else if (BAG.item(id)) BAG.add(id, n); }
    for (const sp of m.chests || []) BAG.addChest({ ...sp });
    render();
  },
  claimgo(v) { const m = S.inbox.find(x => x.id === v); if (!m) return; S.inbox = S.inbox.filter(x => x !== m); go(m.go); },
  claimall() { S.inbox.filter(mailHas).forEach(m => ACT.claim(m.id)); toast('Всё забрано: предметы и сундуки — в запасах'); },
  /* дружба, блокировка, жалоба: v — «что|номер|имя»; после подтверждения — снова профиль */
  ppdo(v) {
    const [k, op, ...n] = String(v).split('|'), nick = socDecode(n.join('|')).trim();
    if (!SOC_SRV[k] || ['run', 'letter', 'chat', 'appeal', 'mod'].includes(k)) return;
    const r = k === 'report' ? SOC_SRV.report(op, nick, S.soc.rep) : SOC_SRV[k](op, nick);
    const was = S.overlay;
    socDo(r, res => {
      if (k === 'report') S.soc.rep = '';
      if (was && ['ppreport', 'ppblock', 'ppunf'].includes(was.t)) S.overlay = { t: 'pp', arg: was.arg };
      const T = { add: `Заявка отправлена: ${nick}`, cancel: 'Заявка отменена', accept: `${nick} — в друзьях`, decline: 'Заявка отклонена', remove: `${nick} больше не в друзьях`,
        block: `${nick} — в чёрном списке`, unblock: `${nick} — не в чёрном списке. Дружить — новой заявкой`, report: `Жалоба № ${res.no} — в журнале модерации. Решит модератор; автоматических наказаний нет` };
      toast(T[res.t] || 'Готово');
    });
  },
  pprsn(v) { S.soc.rep = v; render(); },
  /* письмо друга: открыть — и оно прочитано, уходит в архив; колокол больше его не считает */
  mlopen(v) {
    const i = S.inbox.findIndex(m => m.id === v && m.k === 'pm');
    if (i >= 0) { const m = S.inbox[i]; S.inbox.splice(i, 1); S.soc.read.unshift(m); }
    open('letter', v);
  },
  mlto(v) { S.soc.mail.to = socDecode(v); render(); },
  mlsend(v) {
    socDo(SOC_SRV.letter(v, S.soc.mail.to, S.soc.mail.text), res => { S.soc.mail.text = ''; S.seg.mailt = 'pm'; S.overlay = { t: 'inbox' }; toast(`Письмо ушло: ${res.to}`); });
  },
  chsend(v) { socDo(SOC_SRV.chat(v, socRoom(), S.soc.chat.draft), () => { S.soc.chat.draft = ''; S.soc.chat.focus = true; render(); }); },
  chappeal(v) { socDo(SOC_SRV.appeal(v), res => toast(`Обращение № ${res.no} принято: решение проверит другой модератор`)); },
  /* демо команды: ограничение модератором, сообщение друга, заявка, ответ на заявку, письмо */
  socdemo(v) {
    const room = socRoom(), fr = socFriends();
    if (v === 'mute') { socDo(SOC_SRV.mod(socOp(), !socMuted()), res => toast(res.on ? `Модератор ограничил чат · запись № ${res.no}` : `Ограничение снято · запись № ${res.no}`)); return; }
    if (v === 'say') { if (chGate(room)) return; const D = SOC_DATA.say, L = S.soc.chat.rooms[room]; L.push({ id: room + ':' + L.length, who: D.who, t: room === 'all:en' ? D.t.en : D.t.ru }); render(); return; }
    if (v === 'req') { const n = [...socNames()].find(x => !socRel(x)); if (!n) return; S.soc.rel[n] = 'in'; S.inbox.unshift({ id: 'fr:' + n, k: 'fr', from: n }); toast(`Заявка в друзья: ${n}`); return; }
    if (v === 'yes') { const n = socOf('out')[0]; if (!n) return; S.soc.rel[n] = 'friend'; toast(`${n} принял${ppOf(n).sex === 'f' ? 'а' : ''} заявку`); return; }
    if (v === 'pm' && fr.length) { const n = fr[S.soc.read.length % fr.length]; S.inbox.unshift({ id: 'pm' + (S.inbox.length + S.soc.read.length + 2), k: 'pm', from: n, text: 'Как спуск? Если нужна помощь с элитами — пиши.' }); toast(`Письмо от ${n}`); }
  },
});

/* ================== ввод: поле не теряет фокус ================== */
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('input', e => {
    const t = e.target; if (!t || !S.soc) return;
    if (t.id === 'chIn') { S.soc.chat.draft = t.value; return; }
    if (t.id === 'mlText') { S.soc.mail.text = t.value; const c = document.getElementById('mlCount'); if (c) c.textContent = `${[...t.value].length} / ${SOC_R.letter}`; return; }
    if (t.id === 'frFind') { S.soc.q = t.value; S.soc.qPos = t.selectionStart; S.soc.qFocus = true; render(); }
  });
  /* Enter в поле чата — отправить */
  document.addEventListener('keydown', e => {
    const t = e.target; if (!t || t.id !== 'chIn' || e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    e.preventDefault(); ACT.chsend(socOp());
  });
}
window.addEventListener('en-render', () => {
  if (!S.soc) return;
  if (S.soc.qFocus) { S.soc.qFocus = false; const e = document.getElementById('frFind'); if (e && e.focus) { e.focus(); try { e.setSelectionRange(S.soc.qPos, S.soc.qPos); } catch (_) { } } }
  if (S.soc.chat.focus) { S.soc.chat.focus = false; const e = document.getElementById('chIn'); if (e && e.focus) e.focus(); }
});

/* ================== UI-кит: «Общение» ================== */
KIT_EXTRA.push({
  html: () => {
    const nick = 'Тихий ветер', p = ppOf(nick);
    const msgs = [{ who: 'Тихий ветер', t: 'Кто уже прошёл Мастера? Какой состав брали?' }, { who: 'Северный странник', t: 'Танк вперёд, контроль на него не работает — только урон.' }, { who: '@', t: 'Спасибо, попробую с танком.' }]
      .map((m, i) => chMsg(m, i === 0)).join('');
    const rels = [['', 'В друзья'], ['out', 'заявка отправлена'], ['in', 'хочет дружить'], ['friend', 'в друзьях'], ['block', 'в чёрном списке']]
      .map(([k, t]) => `<span class="chip ${k === 'friend' ? 'spirit' : k === 'in' ? 'warn' : k === 'block' ? 'bad' : ''}">${t}</span>`).join('');
    const rows = S.soc.modlog.map(x => `<tr><td class="num">№ ${x.no}</td><td>${{ report: 'жалоба', mute: 'ограничение чата', unmute: 'ограничение снято', appeal: 'обжалование' }[x.kind] || x.kind}</td><td>${socEsc(x.from || x.by || '')}</td><td>${socEsc(x.on || (x.ref ? '№ ' + x.ref : ''))}</td><td>${socEsc(x.why ? (SOC_DATA.reasons.find(r => r[0] === x.why) || [0, x.why])[1] : x.st || '')}</td></tr>`).join('');
    return `<section class="k-box soc-kit" style="grid-column:1/-1" id="socKit"><h3>Общение</h3>
      <p class="k-note">Профиль игрока — по нажатию на его портрет везде, где он виден: в чате, в клане, на Арене и в Лиге, в рейтингах, в друзьях и письмах. Лист как «Обзор» Странника: облик, уровень, цикл, клан, пятёрка сильнейших, главное из достижений; действия — в друзья, написать, заблокировать, пожаловаться. Почта — «Входящие» с вкладками «Награды», «Письма», «Система». Чат — «Общий» и «Клан», у общего язык RU или EN.</p>
      <div class="soc-kgrid">
        <div class="col"><span class="eyebrow">Профиль игрока</span><div class="pnl pad col soc-kpp">${ppHeadHtml(nick, p, 'friend', '')}${ppFiveHtml(nick, p, '')}${ppAchHtml(p)}</div></div>
        <div class="col"><span class="eyebrow">Чат: облик, имя, текст</span><div class="pnl pad col soc-kch"><div class="ch-list">${msgs}</div></div>
          <span class="eyebrow">Ограничение чата — честно</span><div class="pnl pad row soc-kmu"><div class="col ch-mute"><b>Вы не можете писать в чат до 30 сентября, 21:40.</b><small class="faint">Причина — оскорбления в общем чате. Решение модератора в журнале · № 1042. Читать чат можно.</small></div><button class="btn sm" type="button" tabindex="-1">Оспорить</button></div>
          <span class="eyebrow">Дружба</span><div class="row" style="flex-wrap:wrap">${rels}</div></div>
      </div>
      <span class="eyebrow">Честная модерация</span>
      <ul class="k-note soc-rules"><li>Критика игры — не нарушение.</li><li>За слова — только ограничение чата: срок, причина и номер записи журнала видны игроку; решение можно оспорить.</li><li>Никаких коллективных наказаний.</li><li>Бан аккаунта — только за читы и мошенничество, с доказательством из журналов сервера.</li><li>Жалоба — запись журнала и ничего больше: автоматических наказаний нет.</li><li>Каждое действие модератора пишется в журнал.</li></ul>
      ${TM(`<span class="eyebrow">Журнал модерации демо · ${S.soc.modlog.length}</span>${rows ? `<table class="p-table soc-klog"><thead><tr><th>Запись</th><th>Что</th><th>Кто</th><th>На кого</th><th>Причина</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="k-note">Записей пока нет: пожалуйтесь на игрока или включите ограничение в чате (демо).</p>'}
        <p class="k-note">Данные и правила — SOC_DATA в screens/social.js: друзей до ${SOC_R.friends}, письмо до ${SOC_R.letter} знаков и ${SOC_R.lettersDay} в сутки, сообщение до ${SOC_R.chat} знаков, общий чат — с ${SOC_R.chatFrom}-го уровня. Операции — SOC_SRV с номером. Проверка — tools/content-gen/screens/check_social.js.</p>`, 'div')}
    </section>`;
  },
});

/* ================== сценарии презентации ================== */
FLOWS.push(
  ['Профиль игрока', 'По нажатию на портрет — в чате, клане, на Арене, в рейтингах: облик, уровень, клан, пятёрка сильнейших, главное из достижений; в друзья, написать, заблокировать, пожаловаться',
    () => { S.route = 'shelter'; S.overlay = { t: 'pp', arg: 'Тихий ветер|chat' }; }],
  ['Друзья и заявки', 'Друзья, заявки и чёрный список; поиск по имени; принять заявку — одно нажатие',
    () => { S.route = 'profile'; S.seg.profile = 'over'; S.seg.frt = 'req'; S.overlay = { t: 'friends' }; }],
  ['Почта · письмо другу', 'Входящие: награды, письма друзей, система. Письмо — только другу и только текст',
    () => { S.route = 'shelter'; S.seg.mailt = 'pm'; S.overlay = { t: 'inbox' }; }],
  ['Чат · общий и клан, RU / EN', 'Сообщение — облик с частицами, имя и текст; нажатие на портрет — профиль. Язык общего канала — переключателем',
    () => { S.route = 'shelter'; S.seg.chch = 'all'; S.seg.chlang = 'ru'; S.overlay = { t: 'chat' }; }],
  ['Чат · ограничение модератором', 'Честно: до какого часа, за что, номер записи журнала; решение можно оспорить',
    () => { S.route = 'shelter'; S.seg.chch = 'all'; if (!socMuted()) socDo(SOC_SRV.mod(socOp(), true)); S.overlay = { t: 'chat' }; }],
);

/* ================== состояние ==================
   S.soc: rel — отношения по имени (friend, in, out, block); read — прочитанные письма; sent — отправленные, sentDay — за сутки;
   reports — жалобы по имени: номер записи журнала; rep — выбранная причина жалобы; q — поиск в друзьях; mail — новое письмо { to, text };
   chat — комнаты { 'all:ru', 'all:en', clan }, отметки прочитанного seen, черновик draft; mute — ограничение чата { no, until, reason,
   by, appeal }; modlog — журнал модерации (сервер), modSeq — номер следующей записи; ops, seq — ответы по номерам операций и номер
   следующей. Непрочитанные письма и заявки в друзья — во Входящих (S.inbox) */
function socState(s) {
  const D = SOC_DATA;
  s.soc = { rel: Object.assign({}, D.rel), read: [], sent: [], sentDay: 0, reports: {}, rep: '', q: '', qPos: 0, qFocus: false,
    mail: { to: '', for: '', text: '' }, chat: { rooms: {}, seen: {}, draft: '', focus: false }, mute: null, modlog: [], modSeq: D.modFrom, ops: {}, seq: 1 };
  for (const [room, list] of Object.entries(D.chat)) {
    s.soc.chat.rooms[room] = list.map(([who, t], i) => ({ id: room + ':' + i, who, t }));
    s.soc.chat.seen[room] = Math.max(0, list.length - (D.unread[room] || 0));
  }
  for (const L of D.letters) { const m = { id: L.id, k: 'pm', from: L.from, text: L.text }; if (L.read) s.soc.read.push(m); else s.inbox.push(m); }
  for (const [n, r] of Object.entries(D.rel)) if (r === 'in') s.inbox.push({ id: 'fr:' + n, k: 'fr', from: n });
  s.seg.mailt = s.seg.mailt || 'rew'; s.seg.frt = s.seg.frt || 'list'; s.seg.chch = s.seg.chch || 'all'; s.seg.chlang = s.seg.chlang || 'ru';
  return s;
}
const socInitBase = initialState;
initialState = function () { return socState(socInitBase()); };
socState(S);
