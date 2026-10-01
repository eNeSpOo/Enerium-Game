/* Старт с чистого листа — данные прототипа «Свет снизу». Собирает tools/content-gen/start/build.js из data.js: уровни Странника 1–10
   цикла I — этап, порог опыта, открытия, награда, слово проводника; ворота разделов и мест отряда; канонический путь прогона ядром (path) —
   по нему проверка tools/content-gen/screens/check_start.js сверяет прототип. Руками не править: пересборка затрёт правку.
   Черновик · предложение · ждёт автора. Числа — демонстрация, только целые. Обоснование — docs/content/старт-с-чистого-листа.md.
   Уровень и награду выдаёт сервер одной операцией с номером: повтор ничего не повторяет (§16, §36). Ниже данных — алгоритм
   tools/content-gen/start/rules.js как есть. */
window.EN_START = {"meta":{"builder":"tools/content-gen/start/build.js","rules":"tools/content-gen/start/rules.js","bot":"tools/content-gen/start/bot.js","sources":["GDD §16","GDD §31","ADR-0018","ADR-0019","ADR-0031","design/ui/battle.js","design/ui/biome-foes.js","design/ui/roster.js","design/ui/recipes.js"],"doc":"docs/content/старт-с-чистого-листа.md"},"xp":{"kill":50,"closure":500,"guard":500,"limit":150,"valor":300,"echo":100,"hero":200,"cycle":2000},"formula":{"max":100,"k2":10000,"giftGold":6500,"giftStep":10},"heroes":[{"id":"c1-01","bot":"h2","role":"физ ДД"},{"id":"c1-02","bot":"h1","role":"танк"},{"id":"c1-03","bot":"h3","role":"маг ДД"},{"id":"c1-04","bot":"h4","role":"лекарь"},{"id":"c1-05","bot":"h5","role":"контроль"}],"train":"c1-01","start":{"level":1,"cycle":1,"wallet":{"gold":0,"spirit":0,"souls":0,"enerium":0,"keys":0,"dust":0}},"open":{"hire":{"n":"Призыв за золото","d":"Герой приходит с нулевого уровня; каждый следующий дороже прежнего.","go":{"route":"heroes","heroes":"hire","hire":"gold","pick":"next"}},"descent":{"n":"Спуск · Мастерская форм","d":"Пятнадцать этажей, две элиты и босс. Отряд идёт вниз сам: здоровье и павшие переходят на следующий этаж.","go":{"route":"descent","biome":"b1"}},"dev":{"n":"Уровни за дух","d":"Дух с врагов поднимает уровень героя до потолка рунного предела.","go":{"route":"heroes","heroes":"coll","hero":"power","sel":"best"}},"slot2":{"n":"Второе место в отряде","d":"Двое держат строй там, где один падает.","go":{"route":"heroes","heroes":"hire","hire":"gold","pick":"next"}},"stock":{"n":"Запасы и сундуки","d":"Ресурсы этажей и ключи ремёсел с элит ложатся в запасы; там же открываются сундуки.","go":{"route":"craft","craft":"stock","zptab":"chest"}},"shop":{"n":"Лавка","d":"Базовые ресурсы и ключи ремёсел за золото; витрина обновляется сама.","go":{"route":"craft","craft":"shop"}},"guard":{"n":"Рунный страж и рунные ключи","d":"Страж ждёт за боссом биома. Вход — за рунные ключи, его удар отнимает раунд, а победа открывает путь вниз.","go":{"route":"descent","biome":"front"}},"b2":{"n":"Подземный лес","d":"Двадцать пять этажей и шесть элит; в лесу отряд вырастет до пяти.","go":{"route":"descent","biome":"b2"}},"slot3":{"n":"Третье место в отряде","d":"Маг бьёт по всем сразу.","go":{"route":"heroes","heroes":"hire","hire":"gold","pick":"next"}},"craft":{"n":"Мастерская","d":"Шесть ячеек и загадки на самих ресурсах. Угаданный рецепт остаётся навсегда, неудача сжигает всё со стола.","go":{"route":"craft","craft":"work"}},"slot4":{"n":"Четвёртое место в отряде","d":"Лекарь держит отряд на ногах от этажа к этажу.","go":{"route":"heroes","heroes":"hire","hire":"gold","pick":"next"}},"valor":{"n":"Доблесть","d":"Руна доблести: +30 % ко всем характеристикам и новая способность. Уровень и пределы начинаются заново.","go":{"route":"heroes","heroes":"coll","hero":"power","sel":"trainee"}},"slot5":{"n":"Пятое место в отряде","d":"Полный отряд: бойцы урона, танк, лекарь и контроль.","go":{"route":"heroes","heroes":"hire","hire":"gold","pick":"next"}},"artifacts":{"n":"Артефакты Странника","d":"Золото и души — в постоянную силу аккаунта: больше духа, золота, ресурсов.","go":{"route":"profile","profile":"arts"}},"limit":{"n":"Рунный предел","d":"Потолок уровня — 50. Десять рун предела ломают его, дальше — до 150.","go":{"route":"heroes","heroes":"coll","hero":"power","sel":"capped"}},"cycle2":{"n":"Цикл II · Уларион","d":"Биомы Улариона длиннее: босса берут осадой, забегов — два разом.","go":{"route":"descent","biome":"front"}},"echo":{"n":"Эхо","d":"Души — в очки недели: призыв врагов древних цивилизаций, лестница и Убер-босс.","go":{"route":"echo"}},"week":{"n":"Неделя: контракты, ритуалы, кланы, рейтинг","d":"Дела недели и места среди всех игроков сервера.","go":{"route":"week"}},"souls":{"n":"Возрождение душ","d":"Осколки героев рулетки и праха; собранного героя пробуждают души.","go":{"route":"heroes","heroes":"hire","hire":"souls"}},"market":{"n":"Рынок","d":"Лоты игроков за золото; комиссия — с выручки.","go":{"route":"craft","craft":"market"}},"memory":{"n":"Память Странника","d":"Первое место Памяти: одна пассивка аккаунта из трёх.","go":{"route":"profile","profile":"mem"}}},"gates":{"nav":{"shelter":1,"descent":1,"heroes":1,"craft":3,"week":10},"seg":{"craft:stock":3,"craft:shop":3,"craft:work":6,"craft:market":10,"craft:reforge":10},"hire":{"gold":1,"souls":10},"art":8,"slots":[1,2,2,2,3,3,4,5,5,5]},"pace":{"b1":[7,10],"b2":[90,180]},"guard":{"spareEntries":1},"bot":{"maxSteps":400,"runesPerLimit":10,"recipe":{"cells":[["fang",2],["k1_hunt",1]]}},"levels":[{"L":1,"n":"Начало","stage":null,"why":"Первый спуск","opens":["hire","descent","dev"],"reward":{"gold":10000,"spirit":100},"rewardWhy":"золото — ровно на первого героя (квест первого героя), дух — первые уровни, чтобы один герой взял первые пять этажей","say":["mage","Внизу никто не ходит один. Найми первого героя — золото я оставил. Дух с врагов поднимет его уровень."],"xp":0},{"L":2,"n":"Пять этажей","stage":{"k":"floor","b":"b1","n":5},"why":"Пройти пять этажей Мастерской","opens":["slot2"],"reward":{"spirit":700},"rewardWhy":"дар — на второго героя (13 000), дух — второму до уровня первого","say":["enzo","Один упрётся в первую же пару. Второе место открыто — возьми того, кто держит удар."],"xp":350},{"L":3,"n":"Десять этажей","stage":{"k":"floor","b":"b1","n":10},"why":"Пройти десять этажей Мастерской","opens":["stock","shop"],"reward":{"spirit":500,"chest":{"box":"wander","r":1}},"rewardWhy":"дух — паре до босса; сундук — первое открытие в Запасах","say":["alch","С прислуги Мастерской падают ключи ремёсел, с этажей — ресурсы: всё ложится в запасы. Там же открой сундук — недостающее продам я."],"xp":700},{"L":4,"n":"Первый набросок","stage":{"k":"boss","b":"b1"},"why":"Победить босса Мастерской","opens":["guard"],"reward":{"keys":3},"rewardWhy":"ключи — три входа к Мастеру: вход стоит один ключ","say":["enzo","Набросок пал, но дорогу вниз держит Мастер. К рунному стражу входят за рунные ключи — держи три."],"xp":1350},{"L":5,"n":"Мастер пропустил","stage":{"k":"guard","b":"b1"},"why":"Победить рунного стража Мастерской","opens":["slot3","b2"],"reward":{},"rewardWhy":"дар — на третьего героя (16 000)","say":["mage","Мастер пропустил — Подземный лес открыт. Он глубже и злее: третье место открыто, возьми мага."],"xp":1950},{"L":6,"n":"Первая элита леса","stage":{"k":"floor","b":"b2","n":5},"why":"Пройти пять этажей Подземного леса","opens":["craft"],"reward":{"items":[["fang",2],["k1_hunt",1]]},"rewardWhy":"два клыка и веер лезвий, ключ охотничьего ремесла, — ровно на первый рецепт, «Точёный клык»","say":["smith","Шесть ячеек, дружок, и никаких подсказок, кроме загадок на самих ресурсах. Два клыка и веер лезвий я оставил — сложи их на столе."],"xp":2300},{"L":7,"n":"Первый рецепт","stage":{"all":[{"k":"recipe","n":1},{"k":"floor","b":"b2","n":10}]},"why":"Найти первый рецепт и пройти десять этажей леса","opens":["valor","slot4"],"reward":{"train":1},"rewardWhy":"руна обучения — первая доблесть во втором биоме (§16, ADR-0018); дар — на четвёртого героя (19 000)","say":["mage","Руна обучения даёт герою доблесть: он станет сильнее на треть и вспомнит новый приём. Уровень начнётся с нуля — догонит быстро."],"xp":2500},{"L":8,"n":"Двадцать этажей леса","stage":{"k":"floor","b":"b2","n":20},"why":"Пройти двадцать этажей Подземного леса","opens":["slot5","artifacts"],"reward":{},"rewardWhy":"дар — на пятого героя (22 000); души на первый артефакт уже набраны с элит","say":["enzo","Пятое место открыто — отряд полный. Дальше лес злее: возьми того, кто свяжет врагу руки."],"xp":3250},{"L":9,"n":"Потолок героя","stage":{"any":[{"k":"cap"},{"k":"boss","b":"b2"}]},"why":"Поднять героя до 50-го уровня — или победить босса леса","opens":["limit"],"reward":{"runes":10,"keys":9},"rewardWhy":"руны — один предел; ключи — три входа к стражу леса: вход стоит три ключа","say":["smith","Пятидесятый — потолок. Десять рун предела ломают его, дальше герой растёт до ста пятидесяти."],"xp":3450},{"L":10,"n":"Виал позади","stage":{"k":"guard","b":"b2"},"why":"Победить рунного стража Подземного леса","opens":["echo","cycle2","week","souls","market","memory"],"reward":{"runes":40,"chest":{"box":"wander","r":2},"shards":[["c2-41",10]]},"rewardWhy":"руны — предел I остальным четверым: отряд входит в цикл II на 50-м с пробитым пределом (economy.py, START_LIMITS); сундук и осколки — первые шаги Возрождения душ","say":["mage","Виал — только начало. Уларион ждёт, и с ним вся неделя: Эхо, контракты, кланы, рейтинг, возрождение душ и рынок."],"xp":6700}],"path":{"steps":[["run","b1",6,0],["run","b1",15,0],["run","b1",15,1],["guard","b1",1],["run","b2",13,0],["run","b2",14,0],["run","b2",15,0],["run","b2",15,0],["run","b2",15,0],["run","b2",15,0],["run","b2",17,0],["run","b2",19,0],["run","b2",19,0],["run","b2",20,0],["run","b2",21,0],["run","b2",20,0],["run","b2",20,0],["run","b2",20,0],["run","b2",23,0],["run","b2",24,0],["run","b2",25,0],["run","b2",25,0],["run","b2",25,0],["run","b2",25,0],["run","b2",25,0],["run","b2",25,0],["run","b2",25,0],["run","b2",25,1],["guard","b2",1]],"levels":[[1,0],[2,1],[3,2],[4,3],[5,4],[6,5],[7,5],[8,15],[9,26],[10,29]],"hires":[["c1-01",0],["c1-02",1],["c1-03",4],["c1-04",5],["c1-05",15]],"end":{"lvl":10,"xp":7900,"cycle":2,"heroes":[["c1-01",59,1,1],["c1-02",52,1,0],["c1-03",52,1,0],["c1-04",51,1,0],["c1-05",51,1,0]],"gold":37994,"spirit":9,"keys":8},"min":{"b1":493,"b2":8502}}};
/* Уровень Странника — алгоритм «сервера», общий для сборщика и прототипа. Сборщик tools/content-gen/start/build.js вставляет этот файл
   в design/ui/start.js как есть. Ориентир для серверного ядра на C#, а не код игры: опыт, уровень и награду решает только сервер
   по подтверждённым вехам (GDD §16, §16.1, §34, §36).
   Только целые числа.

   Память сервера об игроке — M:
     facts — { ключ вехи: опыт, начисленный за неё } — каждая веха один раз: kill:<враг>, hero:<герой>, closure:<биом>, guard:<биом>,
       limit:<герой>:<доблесть>:<предел>, valor:<герой>:<доблесть>, echo:<враг>, cycle:<номер>;
     xp — опыт всего, от нуля; lvl — уровень (0 — аккаунт только создан, уровень 1 выдаёт первая операция); ops — { номер операции: ответ }; seq — номер следующей операции.
   Вехи этапов (F) сервер знает сам: этажи, боссы и стражи биомов, найденные рецепты, потолок уровня героев, цикл.
   claim(M, op, F) — одна операция: все уровни, что можно взять сейчас, с наградами. Повтор того же номера возвращает прежний ответ
   и ничего не выдаёт; без новых уровней номер не тратится. */
(function (root) {
'use strict';

function make(D) {
  const N = D.levels.length;   // уровней сценария; дальше — формула §16
  /* ⌈√x⌉ целыми */
  function isqrtCeil(x) {
    if (x <= 0) return 0;
    let r = Math.floor(Math.sqrt(x));
    while (r * r > x) r--;
    while (r * r < x) r++;
    return r;
  }
  /* опыт на переход L → L+1: сценарий — разница порогов таблицы, дальше — ⌈100 × L^1,5⌉ = ⌈√(k2 × L³)⌉ (§16) */
  function need(L) {
    if (L < 1) return 0;
    if (L < N) return D.levels[L].xp - D.levels[L - 1].xp;
    return isqrtCeil(D.formula.k2 * L * L * L);
  }
  /* опыт всего, с которого берётся уровень L */
  function thr(L) {
    if (L <= 1) return 0;
    if (L <= N) return D.levels[L - 1].xp;
    let t = D.levels[N - 1].xp;
    for (let k = N; k < L; k++) t += need(k);
    return t;
  }
  /* «Дар Страннику» (§16): база × (1 + уровень × 0,1) золота, целыми вниз */
  const gift = L => Math.floor(D.formula.giftGold * (D.formula.giftStep + L) / D.formula.giftStep);
  /* награда уровня: дар и сверх него — награда сценария */
  function reward(L) {
    const x = (L >= 1 && L <= N && D.levels[L - 1].reward) || {};
    return { gold: gift(L) + (x.gold || 0), spirit: x.spirit || 0, keys: x.keys || 0, runes: x.runes || 0, train: x.train || 0,
      items: (x.items || []).map(a => a.slice()), chest: x.chest ? Object.assign({}, x.chest) : null, shards: (x.shards || []).map(a => a.slice()) };
  }
  /* опыт вехи: §16 × номер цикла, в котором веха взята */
  const xpOf = (kind, cycle) => (D.xp[kind] || 0) * Math.max(1, cycle | 0);
  /* веха — один раз: опыт начисляется только новой */
  function fact(M, key, kind, cycle) {
    if (M.facts[key] != null) return 0;
    const v = xpOf(kind, cycle);
    M.facts[key] = v; M.xp += v;
    return v;
  }
  /* этап уровня выполнен: F — вехи этапов сервера */
  function stageOk(s, F) {
    if (!s) return true;
    if (s.all) return s.all.every(x => stageOk(x, F));
    if (s.any) return s.any.some(x => stageOk(x, F));
    switch (s.k) {
      case 'floor': return ((F.floor || {})[s.b] || 0) >= s.n;
      case 'boss': return !!(F.boss || {})[s.b];
      case 'guard': return !!(F.guard || {})[s.b];
      case 'recipe': return (F.recipe || 0) >= s.n;
      case 'cap': return !!F.cap;
      case 'cycle': return (F.cycle || 1) >= s.n;
      case 'kill': return !!(F.kill || {})[s.id];
    }
    return false;
  }
  /* можно ли взять уровень L + 1: опыт, а в сценарии — ещё и этап */
  function canNext(M, F) {
    const L = M.lvl + 1;
    if (L <= N) return M.xp >= thr(L) && stageOk(D.levels[L - 1].stage, F);
    return M.xp >= thr(L) && L <= D.formula.max;
  }
  /* операция: все уровни, что можно взять сейчас, с наградами по порядку */
  function claim(M, op, F) {
    if (!op) return { refuse: 'op' };
    if (M.ops[op]) return { again: true, res: M.ops[op] };
    const got = [];
    while (canNext(M, F)) { M.lvl++; got.push({ L: M.lvl, reward: reward(M.lvl) }); }
    if (!got.length) return { refuse: 'none' };
    const res = { op, from: got[0].L - 1, to: M.lvl, levels: got };
    M.ops[op] = res; M.seq++;
    return { res };
  }
  /* мест в отряде на уровне L: таблица сценария, дальше — все пять */
  const slots = L => D.gates.slots[Math.max(0, Math.min(D.gates.slots.length, L) - 1)];
  /* с какого уровня открыто: kind — nav, seg, hire; нет записи — открыто с 1-го */
  const opensAt = (kind, key) => ((D.gates[kind] || {})[key]) || 1;
  /* опыт внутри уровня и до следующего: для полосы и листа */
  const bar = M => ({ lvl: M.lvl, xp: M.xp - thr(M.lvl), next: need(M.lvl), total: M.xp });
  const fresh = () => ({ facts: {}, xp: 0, lvl: 0, ops: {}, seq: 1 });   // аккаунт с нуля: первая операция выдаёт уровень 1 — «Начало»
  return { N, need, thr, gift, reward, xpOf, fact, stageOk, canNext, claim, slots, opensAt, bar, fresh, isqrtCeil };
}

const api = { make };
root.EnStart = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
