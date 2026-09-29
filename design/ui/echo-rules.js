/* Энериум · правила боя в Эхо (ADR-0025, §17 GDD). Собрано tools/content-gen/economy/echo.py --js — руками не править:
   правка — в данных echo.py, затем пересобрать. Черновик — docs/content/эхо-экономика.md. Все числа — демонстрация, не баланс.

   window.EN_ECHO_RULES:
   - bp — 10 000 = 100 %.
   - ladder — типы ступеней 1–15: o рядовой, e элита, b босс недели, u Убер-босс, m Многоликий.
   - types — тип главного врага: o, e, b, u, m — ступени лестницы; craft — крафтовый («забытый») босс из запасов (§12.3):
       foes — врагов в бою: главный и четыре защитника; у Многоликого — он один (ADR-0025);
       rounds — раундов в атаке (§17.3): maxRounds боя — выборка таблицы ядра RULES.rounds.by (решение автора 29.09.2026);
       rank — ранг карты главного врага в ядре: от него иммунитет к контролю (RULES.resist); Многоликий — лёгкий бой, набор элиты;
       design — атак на убийство у «своего» отряда: отношение уровней onLevel;
       lifeH — срок цели, часы: боссы, Убер и крафтовый босс — час, потом цель исчезает (решение автора 29.09.2026);
       у craft ещё bossHpPct и foeHpPct — здоровье главного врага (% базы его карты) и защитников, как у ступеней;
       уровень крафтового босса — как у Убер-босса его цикла силы, цена атаки — rounds × roundSouls цикла силы.
   - summonSouls — цена призыва, 1 душа на всех циклах (§17.1, §36.4); Многоликий — пятнадцатая ступень, его зовёт тот же призыв.
   - roundSouls — цена раунда атаки по циклам I–VI (индекс — цикл − 1): цена атаки = раунды × цена раунда.
   - pickW — веса ступеней 1–14 в призыве, б. п., сумма 10 000 (ADR-0025, «Шансы призыва»): Убер — 1 %, ниже — линейная лестница,
       каждая слабее ступень чаще на одно и то же число б. п. Лестница растёт после победы над верхней открытой (§17.4); пока открыта
       не вся, веса открытых нормируются между собой: шанс ступени = её вес / сумма весов открытых.
   - manySummonBp — шанс Многоликого, б. п. (ADR-0025: 0,10 %): при каждом призыве, сверх лестницы — тогда он один из вариантов.
       Предела за неделю нет.
   - likShards — выплата Лика недели по циклам I–VI (индекс — цикл − 1), осколков героев недели: доля heroShardsWeekBp записи lik
       из recipes.js от недельных осколков Эхо увлечённого игрока (лутбоксы.md). В цикле I Лика нет — null.
   - onLevel — отношение (12 + уровень отряда) / (12 + foeLvl) × 100, при котором ступень «по силам» по меркам биома: на нём меряют
       здоровье Убер-босса. Здоровье остальных целей — по циклу: «свой» отряд цикла — главный отряд обычного игрока в первую неделю цикла
       (ADR-0031, п. 8: обычный берёт босса недели за дневной бюджет душ Эхо, крафтового — за один-два дня).
   - plank1 — первая личная планка недели по циклам '2'…'6', очки; следующие — × plankMul (лутбоксы.md). Экраны Эхо и «Неделя» берут
       пороги отсюда; в цикле II первую планку обычный берёт в 1-ю неделю.
   - statsFrom — откуда карта врага Эхо берёт характеристики st и hpPct: в echo-foes.js их нет. По классу — образец Мастерской
       (EB.FOES): o — у рядовых, x — у элит, боссов, Убер-боссов и Многоликого. Так шёл замер; иначе здоровье перемерить echo.py --sim.
   - cycles — по номеру цикла, '2'…'6': 15 ступеней, у каждой:
       step — номер ступени, g — тип;
       foeLvl — уровень всех карт боя, главного врага и защитников: как BIOMES.foeLvl.base, без роста по этажу;
       bossHpPct — здоровье главного врага, % базы его карты: заменяет hpPct карты, как BIOMES.bossHpPct.
         Ядро в модели раундов само умножает здоровье врагов на RULES.rounds.foeHpPct (60 %): замеры шли этим путём.
         Если режим отдаёт ядру maxHp, то maxHp = floor(100 × (100 + выносливость) × (12 + foeLvl) × bossHpPct × 60 / (100 × 12 × 100 × 100));
       foeHpPct — здоровье защитников, % hpPct своей карты, как BIOMES.foeHpPct; у Многоликого защитников нет — null;
       souls — цена одной атаки в душах;
       points — рейтинговые очки за убийство главного врага (§17.5–17.6);
       у ступеней 1–14 ещё этаж биома Многоликого: manyHpPct — здоровье главного врага этажа (попытка одна), manyPoints — очки за взятый этаж.
   - many — биом Многоликого (ADR-0025): ресурс с пятнадцатой ступени активирует его на своей неделе или уходит в крафт.
       floors — этажи: ступени 1–14 недели по порядку, их составы, уровни и раунды; attempts — попыток; souls — душ на атаки;
       этаж взят, когда пал главный враг; здоровье и павшие переходят дальше, как в биоме (ADR-0007): лечения между этажами нет;
       осады нет — этаж не взят, и попытка кончилась.
   Замер — отрядом прототипа (economy.SIM_JS) на врагах недели: design/ui/echo-foes.js, недель 9: oebum; режим Эхо ядра — echoBattle. */
window.EN_ECHO_RULES = {
  bp: 10000, onLevel: 240, summonSouls: 1, manySummonBp: 10,
  ladder: ["o","o","o","o","o","o","e","e","e","e","b","b","b","u","m"],
  pickW: [1332,1234,1139,1045,950,856,761,667,572,478,383,289,194,100],
  likShards: [null,13,20,33,51,75],
  many: {"floors":14,"attempts":1,"souls":0},
  roundSouls: [1,3,8,14,23,33],
  statsFrom: {"o":{"Физ. ДД силы":"o1","Дебаффер":"o2","Маг. ДД":"o3","Танк":"o4","Лекарь":"o5","Физ. ДД ловкости":"o6"},"x":{"Физ. ДД силы":"e1","Физ. ДД ловкости":"e2","Танк":"e3","Маг. ДД":"e4","Лекарь":"e5","Дебаффер":"e6"}},
  plank1: {"2":7300,"3":28000,"4":97000,"5":270000,"6":860000}, plankMul: 2,
  types: {
    o: {"name":"Рядовой","foes":5,"rounds":5,"rank":"o","design":1,"lifeH":72},
    e: {"name":"Элита","foes":5,"rounds":10,"rank":"e","design":2,"lifeH":48},
    b: {"name":"Босс","foes":5,"rounds":20,"rank":"b","design":3,"lifeH":1},
    u: {"name":"Убер-босс","foes":5,"rounds":50,"rank":"uber","design":6,"lifeH":1},
    m: {"name":"Многоликий","foes":1,"rounds":10,"rank":"e","design":1,"lifeH":24},
    craft: {"name":"Крафтовый босс","foes":5,"rounds":75,"rank":"forgotten","design":2,"lifeH":1,"bossHpPct":650,"foeHpPct":100},
  },
  cycles: {
    '2': [
      {"step":1,"g":"o","foeLvl":89,"bossHpPct":300,"foeHpPct":100,"souls":15,"points":100,"manyHpPct":100,"manyPoints":100},
      {"step":2,"g":"o","foeLvl":93,"bossHpPct":300,"foeHpPct":100,"souls":15,"points":116,"manyHpPct":100,"manyPoints":116},
      {"step":3,"g":"o","foeLvl":97,"bossHpPct":300,"foeHpPct":100,"souls":15,"points":134,"manyHpPct":100,"manyPoints":134},
      {"step":4,"g":"o","foeLvl":100,"bossHpPct":300,"foeHpPct":100,"souls":15,"points":156,"manyHpPct":100,"manyPoints":156},
      {"step":5,"g":"o","foeLvl":104,"bossHpPct":300,"foeHpPct":100,"souls":15,"points":181,"manyHpPct":100,"manyPoints":181},
      {"step":6,"g":"o","foeLvl":107,"bossHpPct":300,"foeHpPct":100,"souls":15,"points":210,"manyHpPct":100,"manyPoints":210},
      {"step":7,"g":"e","foeLvl":109,"bossHpPct":650,"foeHpPct":100,"souls":30,"points":974,"manyHpPct":100,"manyPoints":974},
      {"step":8,"g":"e","foeLvl":111,"bossHpPct":650,"foeHpPct":100,"souls":30,"points":1130,"manyHpPct":100,"manyPoints":1130},
      {"step":9,"g":"e","foeLvl":113,"bossHpPct":650,"foeHpPct":100,"souls":30,"points":1311,"manyHpPct":100,"manyPoints":1311},
      {"step":10,"g":"e","foeLvl":115,"bossHpPct":650,"foeHpPct":100,"souls":30,"points":1520,"manyHpPct":100,"manyPoints":1520},
      {"step":11,"g":"b","foeLvl":116,"bossHpPct":2250,"foeHpPct":100,"souls":60,"points":5292,"manyHpPct":250,"manyPoints":5292},
      {"step":12,"g":"b","foeLvl":117,"bossHpPct":2250,"foeHpPct":100,"souls":60,"points":6139,"manyHpPct":250,"manyPoints":6139},
      {"step":13,"g":"b","foeLvl":117,"bossHpPct":2250,"foeHpPct":100,"souls":60,"points":7121,"manyHpPct":250,"manyPoints":7121},
      {"step":14,"g":"u","foeLvl":118,"bossHpPct":31200,"foeHpPct":100,"souls":150,"points":41305,"manyHpPct":1550,"manyPoints":41305},
      {"step":15,"g":"m","foeLvl":118,"bossHpPct":1000,"foeHpPct":null,"souls":30,"points":1597},
    ],
    '3': [
      {"step":1,"g":"o","foeLvl":151,"bossHpPct":550,"foeHpPct":100,"souls":40,"points":300,"manyHpPct":150,"manyPoints":300},
      {"step":2,"g":"o","foeLvl":157,"bossHpPct":550,"foeHpPct":100,"souls":40,"points":348,"manyHpPct":150,"manyPoints":348},
      {"step":3,"g":"o","foeLvl":162,"bossHpPct":550,"foeHpPct":100,"souls":40,"points":403,"manyHpPct":150,"manyPoints":403},
      {"step":4,"g":"o","foeLvl":168,"bossHpPct":550,"foeHpPct":100,"souls":40,"points":468,"manyHpPct":150,"manyPoints":468},
      {"step":5,"g":"o","foeLvl":172,"bossHpPct":550,"foeHpPct":100,"souls":40,"points":543,"manyHpPct":150,"manyPoints":543},
      {"step":6,"g":"o","foeLvl":177,"bossHpPct":550,"foeHpPct":100,"souls":40,"points":630,"manyHpPct":150,"manyPoints":630},
      {"step":7,"g":"e","foeLvl":180,"bossHpPct":1250,"foeHpPct":100,"souls":80,"points":2923,"manyHpPct":200,"manyPoints":2923},
      {"step":8,"g":"e","foeLvl":184,"bossHpPct":1250,"foeHpPct":100,"souls":80,"points":3390,"manyHpPct":200,"manyPoints":3390},
      {"step":9,"g":"e","foeLvl":186,"bossHpPct":1250,"foeHpPct":100,"souls":80,"points":3933,"manyHpPct":200,"manyPoints":3933},
      {"step":10,"g":"e","foeLvl":189,"bossHpPct":1250,"foeHpPct":100,"souls":80,"points":4562,"manyHpPct":200,"manyPoints":4562},
      {"step":11,"g":"b","foeLvl":190,"bossHpPct":5300,"foeHpPct":100,"souls":160,"points":15878,"manyHpPct":550,"manyPoints":15878},
      {"step":12,"g":"b","foeLvl":192,"bossHpPct":5300,"foeHpPct":100,"souls":160,"points":18418,"manyHpPct":550,"manyPoints":18418},
      {"step":13,"g":"b","foeLvl":192,"bossHpPct":5300,"foeHpPct":100,"souls":160,"points":21364,"manyHpPct":550,"manyPoints":21364},
      {"step":14,"g":"u","foeLvl":193,"bossHpPct":31200,"foeHpPct":100,"souls":400,"points":123915,"manyHpPct":1550,"manyPoints":123915},
      {"step":15,"g":"m","foeLvl":193,"bossHpPct":1450,"foeHpPct":null,"souls":80,"points":4791},
    ],
    '4': [
      {"step":1,"g":"o","foeLvl":248,"bossHpPct":550,"foeHpPct":100,"souls":70,"points":900,"manyHpPct":150,"manyPoints":900},
      {"step":2,"g":"o","foeLvl":258,"bossHpPct":550,"foeHpPct":100,"souls":70,"points":1044,"manyHpPct":150,"manyPoints":1044},
      {"step":3,"g":"o","foeLvl":267,"bossHpPct":550,"foeHpPct":100,"souls":70,"points":1211,"manyHpPct":150,"manyPoints":1211},
      {"step":4,"g":"o","foeLvl":276,"bossHpPct":550,"foeHpPct":100,"souls":70,"points":1404,"manyHpPct":150,"manyPoints":1404},
      {"step":5,"g":"o","foeLvl":284,"bossHpPct":550,"foeHpPct":100,"souls":70,"points":1629,"manyHpPct":150,"manyPoints":1629},
      {"step":6,"g":"o","foeLvl":291,"bossHpPct":550,"foeHpPct":100,"souls":70,"points":1890,"manyHpPct":150,"manyPoints":1890},
      {"step":7,"g":"e","foeLvl":297,"bossHpPct":1150,"foeHpPct":100,"souls":140,"points":8769,"manyHpPct":150,"manyPoints":8769},
      {"step":8,"g":"e","foeLvl":303,"bossHpPct":1150,"foeHpPct":100,"souls":140,"points":10172,"manyHpPct":150,"manyPoints":10172},
      {"step":9,"g":"e","foeLvl":307,"bossHpPct":1150,"foeHpPct":100,"souls":140,"points":11800,"manyHpPct":150,"manyPoints":11800},
      {"step":10,"g":"e","foeLvl":311,"bossHpPct":1150,"foeHpPct":100,"souls":140,"points":13688,"manyHpPct":150,"manyPoints":13688},
      {"step":11,"g":"b","foeLvl":314,"bossHpPct":5050,"foeHpPct":100,"souls":280,"points":47634,"manyHpPct":500,"manyPoints":47634},
      {"step":12,"g":"b","foeLvl":316,"bossHpPct":5050,"foeHpPct":100,"souls":280,"points":55254,"manyHpPct":500,"manyPoints":55254},
      {"step":13,"g":"b","foeLvl":317,"bossHpPct":5050,"foeHpPct":100,"souls":280,"points":64094,"manyHpPct":500,"manyPoints":64094},
      {"step":14,"g":"u","foeLvl":318,"bossHpPct":31200,"foeHpPct":100,"souls":700,"points":371746,"manyHpPct":1550,"manyPoints":371746},
      {"step":15,"g":"m","foeLvl":318,"bossHpPct":1400,"foeHpPct":null,"souls":140,"points":14374},
    ],
    '5': [
      {"step":1,"g":"o","foeLvl":404,"bossHpPct":550,"foeHpPct":100,"souls":115,"points":2700,"manyHpPct":150,"manyPoints":2700},
      {"step":2,"g":"o","foeLvl":420,"bossHpPct":550,"foeHpPct":100,"souls":115,"points":3132,"manyHpPct":150,"manyPoints":3132},
      {"step":3,"g":"o","foeLvl":434,"bossHpPct":550,"foeHpPct":100,"souls":115,"points":3633,"manyHpPct":150,"manyPoints":3633},
      {"step":4,"g":"o","foeLvl":448,"bossHpPct":550,"foeHpPct":100,"souls":115,"points":4214,"manyHpPct":150,"manyPoints":4214},
      {"step":5,"g":"o","foeLvl":460,"bossHpPct":550,"foeHpPct":100,"souls":115,"points":4888,"manyHpPct":150,"manyPoints":4888},
      {"step":6,"g":"o","foeLvl":471,"bossHpPct":550,"foeHpPct":100,"souls":115,"points":5670,"manyHpPct":150,"manyPoints":5670},
      {"step":7,"g":"e","foeLvl":481,"bossHpPct":1200,"foeHpPct":100,"souls":230,"points":26309,"manyHpPct":200,"manyPoints":26309},
      {"step":8,"g":"e","foeLvl":489,"bossHpPct":1200,"foeHpPct":100,"souls":230,"points":30518,"manyHpPct":200,"manyPoints":30518},
      {"step":9,"g":"e","foeLvl":496,"bossHpPct":1200,"foeHpPct":100,"souls":230,"points":35401,"manyHpPct":200,"manyPoints":35401},
      {"step":10,"g":"e","foeLvl":502,"bossHpPct":1200,"foeHpPct":100,"souls":230,"points":41064,"manyHpPct":200,"manyPoints":41064},
      {"step":11,"g":"b","foeLvl":507,"bossHpPct":5150,"foeHpPct":100,"souls":460,"points":142903,"manyHpPct":500,"manyPoints":142903},
      {"step":12,"g":"b","foeLvl":510,"bossHpPct":5150,"foeHpPct":100,"souls":460,"points":165764,"manyHpPct":500,"manyPoints":165764},
      {"step":13,"g":"b","foeLvl":512,"bossHpPct":5150,"foeHpPct":100,"souls":460,"points":192284,"manyHpPct":500,"manyPoints":192284},
      {"step":14,"g":"u","foeLvl":513,"bossHpPct":31200,"foeHpPct":100,"souls":1150,"points":1115240,"manyHpPct":1550,"manyPoints":1115240},
      {"step":15,"g":"m","foeLvl":513,"bossHpPct":1400,"foeHpPct":null,"souls":230,"points":43122},
    ],
    '6': [
      {"step":1,"g":"o","foeLvl":652,"bossHpPct":550,"foeHpPct":100,"souls":165,"points":8100,"manyHpPct":150,"manyPoints":8100},
      {"step":2,"g":"o","foeLvl":678,"bossHpPct":550,"foeHpPct":100,"souls":165,"points":9396,"manyHpPct":150,"manyPoints":9396},
      {"step":3,"g":"o","foeLvl":702,"bossHpPct":550,"foeHpPct":100,"souls":165,"points":10899,"manyHpPct":150,"manyPoints":10899},
      {"step":4,"g":"o","foeLvl":723,"bossHpPct":550,"foeHpPct":100,"souls":165,"points":12642,"manyHpPct":150,"manyPoints":12642},
      {"step":5,"g":"o","foeLvl":743,"bossHpPct":550,"foeHpPct":100,"souls":165,"points":14665,"manyHpPct":150,"manyPoints":14665},
      {"step":6,"g":"o","foeLvl":761,"bossHpPct":550,"foeHpPct":100,"souls":165,"points":17010,"manyHpPct":150,"manyPoints":17010},
      {"step":7,"g":"e","foeLvl":776,"bossHpPct":1200,"foeHpPct":100,"souls":330,"points":78929,"manyHpPct":200,"manyPoints":78929},
      {"step":8,"g":"e","foeLvl":790,"bossHpPct":1200,"foeHpPct":100,"souls":330,"points":91555,"manyHpPct":200,"manyPoints":91555},
      {"step":9,"g":"e","foeLvl":801,"bossHpPct":1200,"foeHpPct":100,"souls":330,"points":106203,"manyHpPct":200,"manyPoints":106203},
      {"step":10,"g":"e","foeLvl":811,"bossHpPct":1200,"foeHpPct":100,"souls":330,"points":123194,"manyHpPct":200,"manyPoints":123194},
      {"step":11,"g":"b","foeLvl":818,"bossHpPct":5150,"foeHpPct":100,"souls":660,"points":428710,"manyHpPct":500,"manyPoints":428710},
      {"step":12,"g":"b","foeLvl":823,"bossHpPct":5150,"foeHpPct":100,"souls":660,"points":497294,"manyHpPct":500,"manyPoints":497294},
      {"step":13,"g":"b","foeLvl":826,"bossHpPct":5150,"foeHpPct":100,"souls":660,"points":576852,"manyHpPct":500,"manyPoints":576852},
      {"step":14,"g":"u","foeLvl":828,"bossHpPct":31200,"foeHpPct":100,"souls":1650,"points":3345721,"manyHpPct":1550,"manyPoints":3345721},
      {"step":15,"g":"m","foeLvl":828,"bossHpPct":1400,"foeHpPct":null,"souls":330,"points":129366},
    ],
  },
};
