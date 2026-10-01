/* Законы окна «Спуск» на уровне AAA — их зовёт tools/content-gen/screens/check_biomes.js (раздел 8б); отдельный файл — не проверка
   сама по себе (имя не check*.js: tools/run-checks.js его не запускает).
   Слова автора 01.10.2026: «Ну и как ты понимаешь окно спуска тоже в АА уровень перевести, там уже есть красивые картинки но всё
   остальное старое под нынешний UI уже не катит. Линии общего интерфейся слишком толстые… рамки тоже толстые… и сами кнопки слабые».
   Каждый закон — функция от разметки, стилей и переменных <html> → список нарушений; проверка мутацией зовёт его с поломкой и ждёт ошибку.
   П — путь вниз: в шапке — слоты биомов (камней столько, сколько слотов; занятые — горят; подпись «Слоты биомов: занято N из M»);
       у каждого биома — медальон с картиной своего биома (адрес — полный: url() из переменной разрешается от файла стилей); у закрытого — замок;
       руины в слотах биомов — сразу под шапкой пути (видны без прокрутки).
   Ш — путь внутри биома: ровно три камня по порядку — этажи (число этажей; где кончился прошлый забег), босс биома (стоит · осада N %
       с полосой · повержен), рунный страж (за боссом · ждёт · пройден); вход к стражу — в строке стража, только когда босс пал;
       с цикла RULES.drop.b.runeKeyFrom у босса — рунный ключ: сколько (цикл биома) и шанс игрока (данные и отмычки, lootCtx — ADR-0044);
       в цикле I — ни слова о ключе, этажи — короткого варианта биома.
   М — метка состояния биома у названия: «Рубеж спуска», «Пройден», «Закрыт».
   Г — одно главное действие: «Начать забег» с отрядом спуска и его мощью; закрытый биом — кнопка закрыта с причиной; идёт забег —
       «К бою» и «Ещё отряд»; заняты все слоты биомов — главная кнопка (и «Ещё отряд») закрыта, причина — словами.
   Л — лист «Отряд для спуска» в материале окна: картина биома, строка места, слоты биомов у кнопки; мощь тех, кто пойдёт, — второй
       строкой главной кнопки (в теле листа строки мощи нет: карты и стихии зала помещаются без прокрутки); слоты заняты — «Начать забег»
       закрыта и говорит почему. Лист другого режима (Эхо) — без материала спуска.
   Т — толщины — из данных: нить пути, рамки камней, бестиария и слотов — переменные --shl-ln и --shl-fr (SHL_VIEW, screens/shell.js);
       в descent.css толщина рамки — только переменной (кроме плиты главной кнопки — срезы её рисунка), кольцо тенью — не толще THIN.
   С — состояния различимы: биом пройден, рубеж, закрыт, выбран — разный медальон и подпись; камни «за боссом», «ждёт», «пройден» —
       разные; осада — не как «стоит»; главная кнопка доступна и закрыта — разные.
   В — воздух: строка места, название, цитата, метка, путь внутри биома и низ окна помещаются в окно на 932 × 430 и 844 × 390 по каскаду. */
'use strict';
const vm = require('vm');
const CC = require('./css_cascade.js');

const THIN = 2;           // нить и рамка окна — не толще, px (слово автора: «слишком толстые»)
const LH = 1.35;          // межстрочие текста окна, если правило его не задаёт (font у .g — 14px/1.35)
const DIGIT_EM = 0.62;    // ширина цифры — с запасом
const SERIF_EM = 0.5;     // ширина буквы названия (Cormorant Garamond) в em — с запасом

module.exports = function descentLaws(o) {
  const { T, ctx, UI, html, fail, draw, reset, rootVars, rootCls } = o;
  const ev = x => vm.runInContext(x, ctx);   // const верхнего уровня скриптов прототипа — не свойства window: читаем из песочницы
  const DS = T.DS, SH = ctx.EN_SHELL, V = SH && SH.SHL_VIEW, D = DS && DS.DS_DATA;
  if (!DS || !SH || !V) { fail('законы «Спуска»: нет window.EN_DESCENT или window.EN_SHELL'); return { laws: 0, mut: '0 из 0' }; }
  const SIZE = ev('SHELL_SIZE'), siegeDone = ev('siegeDone'), sq = ev('sq'), sqReady = ev('sqReady'), BM = ev('BM'), fmt = ev('fmt'), FR = [{ n: '932 × 430', i: 0, small: false }, { n: '844 × 390', i: 1, small: true }];
  const RULES = CC.sheets(UI, html);
  const pxOf = v => { const m = String(v == null ? '' : v).trim().match(/^(-?[\d.]+)px$/); return m ? +m[1] : null; };
  const rootStyle = vars => Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
  const treeOf = (small, markup, vars) => CC.wrap([['html', { class: [...rootCls].join(' '), lang: 'ru', style: rootStyle(vars) }], ['body', {}], ['div', { class: 'p-device', id: 'device' }],
    ['div', { class: 'p-device-inner' }], ['div', { class: small ? 'g sm' : 'g', id: 'game', lang: 'ru' }], ['main', { class: 'g-main' }]], markup);
  const envOf = fr => { const [w, h, top, rail] = SIZE.frames[fr.i]; return { w, h, reduced: false, hover: false, containers: { main: [w - rail, h - top] } }; };
  const in1 = (root, pred) => CC.q(root, pred)[0];
  const has = (...c) => e => c.every(k => e.cls.has(k));
  const mainOf = h => { const i = h.indexOf('<section class="scr flush ds"'); if (i < 0) return ''; const j = h.indexOf('</main>', i); return h.slice(i, j < 0 ? undefined : j); };
  const ovOf = h => { const i = h.indexOf('<div class="ov"'); return i < 0 ? '' : h.slice(i); };
  const slotsNow = () => ctx.EN_ECHO && ctx.EN_ECHO.bio ? ctx.EN_ECHO.bio() : null;
  const SHIco = k => (SH.shlIco ? SH.shlIco(k) : '');
  const g = id => T.G(id);
  const B = id => T.EB.BIOMES[id];

  /* П — путь вниз */
  function lawPath(h, tag, ruins) {   // ruins — сколько руин в слотах; по умолчанию — из состояния
    const out = [], sl = slotsNow(), nav = (h.match(/<nav class="ds-nav"[\s\S]*?<\/nav>/) || [''])[0];
    if (!nav) return [`${tag}: нет пути вниз`];
    const head = nav.slice(0, Math.max(0, nav.indexOf('<div class="cyc')));
    if (!/<span class="eyebrow">Путь вниз<\/span>/.test(head)) out.push(`${tag}: в шапке пути нет «Путь вниз»`);
    if (sl) {
      const at = head.indexOf('<span class="ds-slots'), box = at < 0 ? '' : head.slice(at);
      const pips = [...box.matchAll(/<i( class="on")?><\/i>/g)];
      if (!box) out.push(`${tag}: в шапке пути нет слотов биомов`);
      else {
        if (!box.includes(`Слоты биомов: занято ${sl.used} из ${sl.cap}`)) out.push(`${tag}: подпись слотов — не «Слоты биомов: занято ${sl.used} из ${sl.cap}»`);
        if (pips.length !== sl.cap) out.push(`${tag}: камней слотов ${pips.length}, а слотов ${sl.cap}`);
        if (pips.filter(m => m[1]).length !== Math.min(sl.used, sl.cap)) out.push(`${tag}: горит камней ${pips.filter(m => m[1]).length}, а занято ${sl.used}`);
        if (sl.used >= sl.cap !== /class="ds-slots full"/.test(box)) out.push(`${tag}: слоты ${sl.used >= sl.cap ? 'заняты, а' : 'свободны, а'} вид — ${sl.used >= sl.cap ? 'спокойный' : '«заняты»'}`);
      }
    }
    for (const b of T.S.biomes) {
      const node = (nav.match(new RegExp(`<button class="bnode ${b.state}" data-a="biome" data-v="${b.id}"[\\s\\S]*?</button>`)) || [''])[0];
      if (!node) { out.push(`${tag}: на пути вниз нет узла ${b.id}`); continue; }
      const a = D.art[b.id];
      if (a && !new RegExp(`<span class="bn-ph" style="--ph:url\\('[^']*://[^']*${a.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}`).test(node)) out.push(`${tag}: у ${b.id} медальон не с картиной своего биома (полный адрес ${a})`);
      if ((b.state === 'lock') !== /class="ds-em lk"/.test(node)) out.push(`${tag}: у ${b.id} замок ${b.state === 'lock' ? 'не стоит' : 'лишний'}`);
    }
    /* руины занимают слоты биомов — на пути они сразу под шапкой, их видно без прокрутки */
    const E = T.S.ech, nR = ruins != null ? ruins : E && E.biomes ? E.biomes.length : 0;
    if (nR) {
      const first = nav.indexOf('<div class="cyc'), ru = nav.indexOf('<div class="cyc ech-rs">');
      if (ru < 0) out.push(`${tag}: руины заняли слоты биомов, а на пути вниз их нет`);
      else if (ru !== first) out.push(`${tag}: руины — не сразу под шапкой пути, без прокрутки их не видно`);
    }
    return out;
  }

  /* Ш — путь внутри биома */
  function lawSteps(h, id, tag) {
    const out = [], st = (h.match(/<div class="ds-state">([\s\S]*?)<div class="ds-acts">/) || [])[1];
    if (!st) return [`${tag}: нет пути внутри биома (.ds-state)`];
    const steps = [...st.matchAll(/<div class="ds-st ([a-z]+)"/g)].map(m => m[1]);
    const n = B(id).floors.length, sg = siegeDone(id), kill = g(id).killed;
    if (steps.length !== 3) return [`${tag}: камней пути ${steps.length}, а нужно три — этажи, босс, страж`];
    if (steps[0] !== 'fl') out.push(`${tag}: первый камень — не этажи`);
    if (!['up', 'siege', 'down'].includes(steps[1])) out.push(`${tag}: второй камень — не босс биома`);
    if (!['wait', 'open', 'done'].includes(steps[2])) out.push(`${tag}: третий камень — не рунный страж`);
    if (!st.includes(`<b>${n}</b>`)) out.push(`${tag}: нет числа этажей ${n}`);
    if (kill !== (steps[1] === 'down')) out.push(`${tag}: босс ${kill ? 'пал' : 'стоит'}, а камень — «${steps[1]}»`);
    if (!kill && sg > 0 && B(id).siege !== false && (steps[1] !== 'siege' || !st.includes(`style="--v:${sg}"`))) out.push(`${tag}: осада ${sg} % — нет камня осады с полосой`);
    if (kill && steps[1] === 'siege') out.push(`${tag}: босс пал, а камень — осада`);
    const guard = (st.match(/<div class="ds-st (?:wait|open|done)"[\s\S]*$/) || [''])[0];
    if (kill !== /data-a="guard" data-v="gd\d+"/.test(guard)) out.push(`${tag}: вход к стражу ${kill ? 'не в строке стража' : 'открыт до босса'}`);
    if (/data-a="guard" data-v="gd\d+"/.test(st.replace(guard, ''))) out.push(`${tag}: вход к стражу — вне строки стража`);
    for (const [k, svg] of [['floors', 'down'], ['boss', 'crown'], ['guard', 'door']]) {
      const p = SHIco(k), want = p ? `<img src="${T.AV(p)}"` : `href="#i-${svg}"`;
      if (!st.includes(want)) out.push(`${tag}: у камня «${k}» нет знака ${p || svg}`);
    }
    const L = T.S.lastRun[id];
    if (L && (L.wall || L.floor || L.kind === 'boss' || L.kind === 'siege') && !/<em>прошлый забег — /.test(st)) out.push(`${tag}: не сказано, где кончился прошлый забег`);
    /* рунный ключ с босса биома: шанс — данные (RULES.drop.b) и отмычки игрока (lootCtx — что знает «сервер»), ключей — цикл биома */
    const K = T.EB.RULES.drop && T.EB.RULES.drop.b, cyc = T.S.acc.cycle, boss = (st.match(/<div class="ds-st (?:up|siege|down)"[\s\S]*?(?=<div class="ds-st (?:wait|open|done)")/) || [''])[0];
    if (K && K.runeKeyBp && cyc >= K.runeKeyFrom) {
      const X = ev('typeof lootCtx === "function" ? lootCtx() : null'), art = X && X.art && X.art.runeKeyBp || 0;
      const bp = Math.min(K.runeKeyMaxBp, K.runeKeyBp + art), n = B(id).cycle || 1;
      const want = new RegExp(`<span class="ds-key"><img [^>]*>${n > 1 ? `${n} рунн[а-я]+ ключ[а-я]*` : 'рунный ключ'} · шанс ${Math.round(bp / 100)} %</span>`);
      if (!want.test(boss)) out.push(`${tag}: у босса биома не сказано, что с него падает ${n > 1 ? n + ' ключа' : 'рунный ключ'} с шансом ${Math.round(bp / 100)} %`);
    } else if (/class="ds-key"/.test(boss)) out.push(`${tag}: в цикле ${cyc} рунный ключ с босса не падает, а окно его обещает`);
    return out;
  }

  /* М — метка состояния биома */
  function lawTag(h, b, tag) {
    const head = (h.match(/<header class="ds-head">[\s\S]*?<\/header>/) || [''])[0];
    return head.includes(`<span class="ds-tag ${b.state}">${D.tag[b.state]}</span>`) ? [] : [`${tag}: у названия нет метки «${D.tag[b.state]}»`];
  }

  /* Г — одно главное действие */
  function lawGo(h, b, tag) {
    const out = [], go = (h.match(/<div class="ds-go">[\s\S]*$/) || [''])[0];
    const main = h.match(/class="btn go[^"]*"/g) || [], sl = slotsNow(), full = !!(sl && sl.used >= sl.cap);
    const live = T.S.runs.filter(r => !r.over && !r.scene && r.biome === b.id);
    if (main.length !== 1) out.push(`${tag}: главных кнопок ${main.length}, а нужна одна`);
    if (b.state === 'lock' && !T.KH.team) {
      if (!/<button class="btn go big" disabled>/.test(go) || !go.includes('Откроется после рунного стража')) out.push(`${tag}: закрытый биом — нет закрытой кнопки с причиной`);
      return out;
    }
    if (live.length) {
      if (!go.includes(`data-a="focus" data-v="${live[0].id}"`) || !/Ещё отряд<\/button>/.test(go)) out.push(`${tag}: идёт забег — нет «К бою» и «Ещё отряд»`);
      if (full !== /<button class="btn" data-a="sheet" data-v="prep" disabled/.test(go)) out.push(`${tag}: слоты ${full ? 'заняты, а «Ещё отряд» доступна' : 'свободны, а «Ещё отряд» закрыта'}`);
      return out;
    }
    if (full) {
      if (/<button class="btn go big" data-a="sheet" data-v="prep">/.test(go)) out.push(`${tag}: слоты биомов заняты, а «Начать забег» доступна`);
      if (!go.includes(`Слоты биомов: занято ${sl.used} из ${sl.cap}`)) out.push(`${tag}: слоты заняты — причина не сказана`);
      return out;
    }
    if (!/<button class="btn go big" data-a="sheet" data-v="prep">/.test(go)) out.push(`${tag}: нет главной кнопки «Начать забег» (договор с обучением, screens/start.js)`);
    const s = sq(T.S.prepSquad), r = s && sqReady('descent', s);
    if (s && r && r.go.length) {
      const bm = BM.squad(r.go), q = (go.match(/<span class="ds-sq"[\s\S]*?<button/) || [''])[0];
      if (!q.includes(`<b>${s.name}</b>`) || !q.includes(`<span class="num">${fmt(bm)}</span>`)) out.push(`${tag}: у главной кнопки нет отряда спуска «${s.name}» и его мощи ${fmt(bm)}`);
    }
    return out;
  }

  /* Л — лист «Отряд для спуска» в материале окна */
  function lawPrep(ov, id, full, tag) {
    const out = [], b = T.S.biomes.find(x => x.id === id), sl = slotsNow();
    if (!/<aside class="sheet[^"]*\bds-sheet\b/.test(ov)) out.push(`${tag}: лист спуска не в материале окна (.ds-sheet)`);
    if (D.art[id] && !ov.includes(D.art[id])) out.push(`${tag}: у листа спуска нет картины биома ${D.art[id]}`);
    if (b && !ov.includes(`<span class="eyebrow">${b.name} · ${D.node[b.state] || ''}</span>`)) out.push(`${tag}: у листа спуска нет строки места «${b.name}»`);
    if (sl && !/<div class="sheet-f"><span class="ds-slots/.test(ov)) out.push(`${tag}: у главной кнопки листа нет слотов биомов`);
    const start = (ov.match(/<button class="btn go" data-a="start"[^>]*>/) || [''])[0];
    if (full && (!/ disabled/.test(start) || !/title="Слоты биомов: занято/.test(start))) out.push(`${tag}: слоты заняты, а «Начать забег» листа доступна или молчит`);
    /* мощь тех, кто пойдёт, — на главной кнопке листа: строку мощи в теле листа спуска прячет descent.css */
    const s0 = sq(T.S.prepSquad), r0 = s0 ? sqReady('descent', s0) : null;
    if (r0 && r0.go.length) {
      const btn = (ov.match(/<button class="btn go" data-a="start"[\s\S]*?<\/button>/) || [''])[0], bm = fmt(BM.squad(r0.go));
      if (!btn.includes('<span class="ds-cta-t">Начать забег<small>') || !btn.includes(`<span class="num">${bm}</span></small></span>`)) out.push(`${tag}: на главной кнопке листа нет мощи отряда ${bm}`);
    }
    return out;
  }

  /* Т — толщины из данных */
  const borderW = v => { for (const x of String(v).trim().split(/\s+(?![^(]*\))/)) { if (/^(none|hidden)$/.test(x)) return '0'; if (/^(solid|dashed|dotted|double|groove|ridge|inset|outset)$/.test(x)) return null; if (/^(?:-?[\d.]+(?:px)?|thin|medium|thick|var\(.*\)|calc\(.*\))$/.test(x)) return x; } return null; };
  function lawThin(rules, vars, m) {
    const out = [];
    for (const fr of FR) {
      const root = treeOf(fr.small, m, vars), C = new CC.Cascade(rules, envOf(fr)), want = { line: V.line[fr.i], frame: V.frame[fr.i] };
      const chk = (what, e, prop, kind) => { if (!e) { out.push(`${fr.n}: в разметке нет — ${what}`); return; } const v = C.value(e, prop); if (pxOf(v) !== want[kind]) out.push(`${fr.n}: ${what} — ${v || 'нет'}, а SHL_VIEW.${kind} — ${want[kind]} px`); };
      chk('нить пути вниз (.ds-nav)', in1(root, has('ds-nav')), 'border-right-width', 'line');
      chk('рамка камня пути (.ds-em)', in1(root, e => e.cls.has('ds-em') && !e.cls.has('lk')), 'border-top-width', 'frame');
      chk('рамка бестиария (.ds-best)', in1(root, has('ds-best')), 'border-top-width', 'frame');
      chk('камень слотов (.ds-pips i)', in1(root, e => e.tag === 'i' && e.parent && e.parent.cls.has('ds-pips')), 'border-top-width', 'frame');
    }
    for (const r of rules) {
      if (r.src !== 'screens/descent.css') continue;
      for (const d of r.decls) {
        if (/^border(?:-(?:top|right|bottom|left))?(?:-width)?$/.test(d.p)) {
          const ws = /-width$/.test(d.p) ? d.v.trim().split(/\s+(?![^(]*\))/) : [borderW(d.v)];
          for (const w of ws) if (w && w !== '0' && !/^var\(--(?:shl-(?:ln|fr)|c[trbl])\b/.test(w)) out.push(`descent.css «${r.sel}»: толщина рамки «${w}» — не из данных (var(--shl-ln), var(--shl-fr) или срезы плиты --ct…--cl)`);
        }
        if (d.p === 'box-shadow') for (const mm of d.v.matchAll(/(?:^|,)\s*(?:inset\s+)?0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+([\d.]+)px/g)) if (+mm[1] > THIN) out.push(`descent.css «${r.sel}»: кольцо тенью ${mm[1]} px — толще нити ${THIN} px`);
      }
    }
    return out;
  }

  /* С — состояния различимы */
  function lawStates(rules, vars, m) {
    const out = [];
    for (const fr of FR) {
      const root = treeOf(fr.small, m, vars), C = new CC.Cascade(rules, envOf(fr));
      const node = k => in1(root, e => e.attrs.get('data-node') === k), sig = {};
      for (const k of ['пройден', 'рубеж', 'закрыт', 'выбран']) {
        const n = node(k), ph = n && in1(n, has('bn-ph')), t = n && in1(n, has('bn-t'));
        if (!n || !ph || !t) { out.push(`${fr.n}: нет биома «${k}» на пути вниз`); continue; }
        sig[k] = `${C.value(ph, 'box-shadow')} | ${C.value(t, 'color')} | ${C.value(n, 'background-image') || C.value(n, 'background')} | ${C.value(n, 'box-shadow')}`;
      }
      const K = Object.keys(sig);
      for (let i = 0; i < K.length; i++) for (let j = i + 1; j < K.length; j++) if (sig[K[i]] === sig[K[j]]) out.push(`${fr.n}: биомы «${K[i]}» и «${K[j]}» на пути вниз не различить`);
      const em = k => { const s = in1(root, e => e.attrs.get('data-step') === k), e = s && in1(s, has('ds-em')); return e ? `${C.value(e, 'border-top-color')} | ${C.value(e, 'box-shadow')}` : null; };
      const steps = ['wait', 'open', 'done', 'up', 'siege'].map(k => [k, em(k)]);
      for (const [k, v] of steps) if (!v) out.push(`${fr.n}: нет камня «${k}»`);
      const sv = Object.fromEntries(steps);
      for (const [a, b] of [['wait', 'open'], ['open', 'done'], ['wait', 'done'], ['up', 'siege']]) if (sv[a] && sv[a] === sv[b]) out.push(`${fr.n}: камни «${a}» и «${b}» не различить`);
      const cta = k => { const e = in1(root, x => x.attrs.get('data-cta') === k); return e ? `${C.value(e, 'filter')}` : null; };   // плита одна — доступность видна фильтром плиты
      if (!cta('on') || !cta('off')) out.push(`${fr.n}: нет главной кнопки доступной и закрытой`);
      else if (cta('on') === cta('off')) out.push(`${fr.n}: главная кнопка доступная и закрытая не различить`);
    }
    return out;
  }

  /* В — воздух: окно помещается целиком */
  function lawFit(rules, vars, m, note) {
    const out = [];
    for (const fr of FR) {
      const [, H, TOP] = SIZE.frames[fr.i], root = treeOf(fr.small, m, vars), C = new CC.Cascade(rules, envOf(fr));
      const ui = in1(root, has('ds-ui')), main = in1(root, has('ds-main')), head = in1(root, has('ds-head')), h2 = head && in1(head, e => e.tag === 'h2'), q = head && in1(head, has('quote'));
      const eb = head && in1(head, has('eyebrow')), tags = head && in1(head, has('ds-tags')), st = in1(root, has('ds-state')), row = st && in1(st, has('ds-st'));
      const best = in1(root, has('ds-best')), go = in1(root, e => e.tag === 'button' && e.cls.has('btn') && e.cls.has('go') && e.cls.has('big')), sq = in1(root, has('ds-sq'));
      if (!ui || !main || !head || !h2 || !q || !st || !row || !best || !go) { out.push(`${fr.n}: в разметке окна нет частей для расчёта воздуха`); continue; }
      const fz = (e, d) => pxOf(C.value(e, 'font-size')) || d;
      /* межстрочие: своё line-height, иначе из сокращения font (размер/межстрочие) у себя или предка */
      const lh = (e, f) => { for (let a = e; a && a.tag !== '#root'; a = a.parent) { const w = C.win(a, 'line-height'); if (w) { const n = parseFloat(w.v); return /px$/.test(w.v) ? n : n * f; } const ft = C.win(a, 'font'); if (ft) { const m = ft.v.match(/\/\s*([\d.]+)(px)?/); if (m) return m[2] ? +m[1] : +m[1] * f; } } return f * LH; };
      const gap = e => pxOf(String(C.value(e, 'row-gap') || '').split(/\s+/)[0]) || 0;
      const lines = +(C.value(q, '-webkit-line-clamp') || 2);
      const tg = tags && in1(tags, has('ds-tag'));
      const hHead = lh(eb, fz(eb, 10.5)) + lh(h2, fz(h2, 40)) + lines * lh(q, fz(q, 15.5)) + (tg ? lh(tg, fz(tg, 10)) : 0) + gap(head) * (tags ? 3 : 2) + (pxOf(C.value(head, 'padding-top')) || 0);
      /* камень пути: не ниже min-height, а со строкой заметки и полосой осады — по содержимому */
      const rowsEl = CC.q(st, has('ds-st')), hState = rowsEl.reduce((a, r) => {
        const t = in1(r, has('ds-st-t')), b = t && in1(t, e => e.tag === 'b' && e.parent === t), sm = in1(r, e => e.tag === 'small'), bar = in1(r, has('ds-sg'));
        const content = (b ? lh(b, fz(b, 19)) : 0) + (t ? gap(t) : 0) + (sm ? lh(sm, fz(sm, 9.5)) : 0) + (bar ? 6 + (t ? gap(t) : 0) : 0);
        return a + Math.max(pxOf(C.value(r, 'min-height')) || 40, content);
      }, 0) + (rowsEl.length - 1) * gap(st);
      const cth = pxOf(C.value(go, '--cth')) || pxOf(C.value(go, 'height')) || 50, hGo = cth + (sq ? lh(sq, fz(sq, 12)) + 6 : 0);
      const hActs = Math.max(pxOf(C.value(best, 'min-height')) || 48, hGo);
      const pad = (pxOf(C.value(ui, 'padding-top')) || 0) + (pxOf(C.value(ui, 'padding-bottom')) || 0), avail = H - TOP - pad;
      const need = hHead + hState + hActs + 2 * gap(main);
      if (need > avail + 0.5) out.push(`${fr.n}: окну нужно ${need.toFixed(1)} px по высоте, а есть ${avail} — строка места, название, цитата, путь и низ не помещаются`);
      /* название — одной строкой (nowrap): помещается целиком в строку места */
      const name = (m.match(/<header class="ds-head">[\s\S]*?<h2[^>]*>([^<]*)<\/h2>/) || [, ''])[1], headW = pxOf(String(C.value(head, 'max-width') || '').replace(/^min\((\d+)px,100%\)$/, '$1px'));
      if (C.value(h2, 'white-space') !== 'nowrap') out.push(`${fr.n}: название биома переносится — окно уедет вниз`);
      else if (headW && [...name].length * SERIF_EM * fz(h2, 40) > headW) out.push(`${fr.n}: название «${name}» около ${Math.round([...name].length * SERIF_EM * fz(h2, 40))} px — не помещается в ${headW} px`);
      if (note && o.note) o.note.push(`${fr.n}: высота окна ${need.toFixed(0)} из ${avail} px`);
    }
    return out;
  }

  /* ---------- прогон: биомы демо, игроку и команде; идущий забег; заняты слоты; лист отряда ---------- */
  let laws = 0;
  const say = (k, list) => { laws++; for (const e of list) fail(`закон ${k}: ${e}`); };
  for (const team of [false, true]) {
    T.setTeam(team);
    for (const b0 of ['b1', 'b2', 'b3', 'b4']) {
      reset(); T.S.route = 'descent'; T.S.selBiome = b0;
      const b = T.S.biomes.find(x => x.id === b0), tag = `Спуск · ${b0} · ${team ? 'команда' : 'игрок'}`, h = mainOf(draw(tag + ' · законы'));
      say('П', lawPath(h, tag)); say('Ш', lawSteps(h, b0, tag)); say('М', lawTag(h, b, tag)); say('Г', lawGo(h, b, tag));
    }
  }
  T.setTeam(false);
  /* осада и прошлый забег: у рубежа снято 40 %, забег кончился стеной */
  reset(); T.S.route = 'descent'; T.S.selBiome = 'b3';
  { const G3 = g('b3'), mx = 1000; G3.max = mx; G3.hp = 600; T.S.lastRun.b3 = { wall: 27, kind: 'wall', floor: 27 };
    const hs = mainOf(draw('Спуск · b3 · осада'));
    say('Ш', lawSteps(hs, 'b3', 'Спуск · b3 · осада и стена')); say('В', lawFit(RULES, rootVars, hs)); }
  /* идущий забег и заняты слоты */
  const bio0 = ctx.EN_ECHO && ctx.EN_ECHO.bio;
  reset(); T.S.route = 'descent'; T.S.selBiome = 'b2'; T.S.prepSquad = 's1'; T.ACT.start(); T.S.route = 'descent'; T.S.overlay = null;
  { const b = T.S.biomes.find(x => x.id === 'b2'); say('Г', lawGo(mainOf(draw('Спуск · идёт забег · законы')), b, 'Спуск · идёт забег')); say('П', lawPath(mainOf(draw('Спуск · идёт забег · путь')), 'Спуск · идёт забег')); }
  if (bio0) {
    ctx.EN_ECHO.bio = () => ({ cap: 2, used: 2 });
    { const b = T.S.biomes.find(x => x.id === 'b2'), h = mainOf(draw('Спуск · идёт забег · слоты заняты')); say('Г', lawGo(h, b, 'Спуск · идёт забег · слоты заняты')); say('П', lawPath(h, 'Спуск · идёт забег · слоты заняты')); }
    T.S.runs = []; T.S.selBiome = 'b3';
    { const b = T.S.biomes.find(x => x.id === 'b3'), h = mainOf(draw('Спуск · слоты заняты')); say('Г', lawGo(h, b, 'Спуск · слоты заняты')); say('П', lawPath(h, 'Спуск · слоты заняты')); }
    T.S.overlay = { t: 'prep', arg: '' }; say('Л', lawPrep(ovOf(draw('лист спуска · слоты заняты')), 'b3', true, 'лист спуска · слоты заняты'));
    ctx.EN_ECHO.bio = bio0;
  }
  T.S.runs = [];
  /* цикл I (обучение): короткий вариант биома, о рунном ключе с босса — ни слова */
  reset(); T.S.acc.cycle = 1; T.S.route = 'descent'; T.S.selBiome = 'b1';
  say('Ш', lawSteps(mainOf(draw('Спуск · цикл I · b1')), 'b1', 'Спуск · цикл I · b1'));
  /* руина в слоте биомов: на пути — сразу под шапкой */
  reset(); T.S.route = 'descent'; T.S.selBiome = 'b3';
  const ruinOk = ev(`(() => { S.runs = []; const cb = RX.drops.craftBiomes.find(c => { const it = BAG.item(c.act); return it && it.cyc <= S.acc.cycle; });
    if (!cb) return false; const it = BAG.item(cb.act); BAG.add(it.id, 1); ACTIVATE.act(it.id); if (!S.overlay || !S.overlay.op) return false;
    ACT.echactdo(S.overlay.op); S.overlay = null; S.route = 'descent'; return S.ech.biomes.length > 0; })()`);
  const ruinWin = ruinOk ? mainOf(draw('Спуск · руина в слоте')) : '';
  if (!ruinOk) fail('законы «Спуска»: руина не встала в слот биомов — путь с руиной не проверен');
  else say('П', lawPath(ruinWin, 'Спуск · руина в слоте'));
  /* лист отряда: спуск — в материале окна, Эхо — нет */
  reset(); T.S.route = 'descent'; T.S.selBiome = 'b3'; T.S.overlay = { t: 'prep', arg: '' };
  const prepOv = ovOf(draw('лист спуска · законы'));
  say('Л', lawPrep(prepOv, 'b3', false, 'лист спуска'));
  T.S.overlay = { t: 'prep', arg: 'echo' };
  { const e = ovOf(draw('лист Эхо · без материала спуска')); laws++; if (/ds-sheet/.test(e)) fail('закон Л: лист Эхо оделся в материал спуска'); }

  /* разметка для каскада: окно рубежа, образцы состояний */
  reset(); T.S.route = 'descent'; T.S.selBiome = 'b3';
  const win = mainOf(draw('Спуск · каскад'));
  const nodeOf = (h, id) => (h.match(new RegExp(`<button class="bnode [a-z]+" data-a="biome" data-v="${id}"[\\s\\S]*?</button>`)) || [''])[0];
  T.S.selBiome = 'b2'; const sel2 = mainOf(draw('Спуск · выбран b2'));
  const nodes = `<nav class="ds-nav">${nodeOf(win, 'b1').replace('<button ', '<button data-node="пройден" ')}${nodeOf(win, 'b3').replace('aria-current="true"', 'aria-current="false"').replace('<button ', '<button data-node="рубеж" ')}`
    + `${nodeOf(win, 'b4').replace('<button ', '<button data-node="закрыт" ')}${nodeOf(sel2, 'b2').replace('<button ', '<button data-node="выбран" ')}</nav>`;
  const em = k => `<i class="ds-em" aria-hidden="true"></i>`;
  const steps = ['wait', 'open', 'done', 'up', 'siege'].map(k => `<div class="ds-st ${k}" data-step="${k}">${em(k)}<span class="ds-st-t"><b>${k}</b><small>камень</small></span></div>`).join('');
  const ctas = `<div class="ds-go"><button class="btn go big" data-cta="on" data-a="sheet" data-v="prep">Начать забег</button><button class="btn go big" data-cta="off" disabled>Начать забег</button></div>`;
  const states = `<section class="scr flush ds"><div class="ds-ui">${nodes}<div class="ds-main"><div class="ds-state">${steps}</div>${ctas}</div></div></section>`;
  say('Т', lawThin(RULES, rootVars, win));
  say('С', lawStates(RULES, rootVars, states));
  for (const id of ['b1', 'b2', 'b3', 'b4']) { reset(); T.S.route = 'descent'; T.S.selBiome = id; say('В', lawFit(RULES, rootVars, mainOf(draw(`Спуск · ${id} · воздух`)), id === 'b3')); }

  /* ---------- проверка мутацией: ломаем — закон обязан упасть ---------- */
  const plus = css => RULES.concat(CC.parseCss(css, 'screens/descent.css'));
  const b3 = T.S.biomes.find(x => x.id === 'b3');
  const MUT = [
    ['П', 'камень слотов потерян', () => lawPath(win.replace(/<i( class="on")?><\/i>/, ''), 'мутация')],
    ['П', 'медальон биома без картины', () => lawPath(win.replace(/ style="--ph:url\('[^']*'\);--pp:[^"]*"/, ''), 'мутация')],
    ['Ш', 'страж за боссом, а вход открыт', () => lawSteps(win.replace('<span class="row ds-gd">', '<span class="row ds-gd"><button class="btn sm" data-a="guard" data-v="gd9">Войти</button>'), 'b3', 'мутация')],
    ['Ш', 'камня этажей нет', () => lawSteps(win.replace(/<div class="ds-st fl"[\s\S]*?<\/span><\/div>/, ''), 'b3', 'мутация')],
    ['Ш', 'у босса нет рунного ключа', () => lawSteps(win.replace(/<em><span class="ds-key">[\s\S]*?<\/span><\/em>/, ''), 'b3', 'мутация')],
    ['П', 'руины в конце пути, под прокруткой', () => (ruinWin ? lawPath(ruinWin.replace(/(<div class="cyc ech-rs">[\s\S]*?<\/div><\/div>)([\s\S]*?)(<\/nav>)/, '$2$1$3'), 'мутация', 1) : ['руины нет'])],
    ['М', 'метки состояния нет', () => lawTag(win.replace(/<span class="ds-tag [a-z]+">[^<]*<\/span>/, ''), b3, 'мутация')],
    ['Г', 'вторая главная кнопка', () => lawGo(win.replace('<div class="ds-go">', '<div class="ds-go"><button class="btn go big" data-a="noop">Ещё</button>'), b3, 'мутация')],
    ['Г', 'слоты заняты, а «Начать забег» доступна', () => { const was = ctx.EN_ECHO.bio; ctx.EN_ECHO.bio = () => ({ cap: 2, used: 2 }); try { return lawGo(win, b3, 'мутация'); } finally { ctx.EN_ECHO.bio = was; } }],
    ['Л', 'лист спуска без материала окна', () => lawPrep(prepOv.replace(' ds-sheet', ''), 'b3', false, 'мутация')],
    ['Л', 'мощь отряда пропала с кнопки листа', () => lawPrep(prepOv.replace(/<span class="ds-cta-t">Начать забег<small>[\s\S]*?<\/small><\/span>/, 'Начать забег'), 'b3', false, 'мутация')],
    ['Т', 'рамка камня пути числом 3 px', () => lawThin(plus('.ds-em{border:3px solid #000}'), rootVars, win)],
    ['Т', 'кольцо тенью 5 px у медальона биома', () => lawThin(plus('.ds-nav .bnode .bn-ph{box-shadow:0 0 0 5px #000}'), rootVars, win)],
    ['С', 'рубеж как пройденный', () => lawStates(RULES.filter(r => !/\.bnode\.front \.bn-ph/.test(r.sel)), rootVars, states)],
    ['С', 'закрытая главная кнопка как доступная', () => lawStates(RULES.filter(r => !/\[disabled\]/.test(r.sel) || !/ds-go/.test(r.sel)), rootVars, states)],
    ['В', 'название в два раза крупнее — окно не помещается', () => lawFit(plus('.ds-head h2{font-size:96px}'), rootVars, win)],
    ['В', 'длинное название переносится на вторую строку', () => lawFit(plus('.ds-head h2{white-space:normal}'), rootVars, win)],
  ];
  let caught = 0;
  for (const [k, what, f] of MUT) { let e; try { e = f(); } catch (x) { e = []; fail(`мутация «${what}»: исключение — ${x.message}`); } if (e.length) caught++; else fail(`мутация «${what}»: закон ${k} её не поймал`); }
  return { laws, mut: `${caught} из ${MUT.length}` };
};
