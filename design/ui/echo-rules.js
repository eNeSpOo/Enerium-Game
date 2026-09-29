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
   - onLevel — отношение (12 + уровень отряда) / (12 + foeLvl) × 100, при котором ступень «по силам»: на нём мерили здоровье.
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
  roundSouls: [1,3,7,12,18,26],
  statsFrom: {"o":{"Физ. ДД силы":"o1","Дебаффер":"o2","Маг. ДД":"o3","Танк":"o4","Лекарь":"o5","Физ. ДД ловкости":"o6"},"x":{"Физ. ДД силы":"e1","Физ. ДД ловкости":"e2","Танк":"e3","Маг. ДД":"e4","Лекарь":"e5","Дебаффер":"e6"}},
  types: {
    o: {"name":"Рядовой","foes":5,"rounds":5,"rank":"o","design":1,"lifeH":72},
    e: {"name":"Элита","foes":5,"rounds":10,"rank":"e","design":2,"lifeH":48},
    b: {"name":"Босс","foes":5,"rounds":20,"rank":"b","design":3,"lifeH":1},
    u: {"name":"Убер-босс","foes":5,"rounds":50,"rank":"uber","design":6,"lifeH":1},
    m: {"name":"Многоликий","foes":1,"rounds":10,"rank":"e","design":1,"lifeH":24},
    craft: {"name":"Крафтовый босс","foes":5,"rounds":75,"rank":"forgotten","design":2,"lifeH":1,"bossHpPct":23100,"foeHpPct":100},
  },
  cycles: {
    '2': [
      {"step":1,"g":"o","foeLvl":124,"bossHpPct":1150,"foeHpPct":100,"souls":15,"points":100,"manyHpPct":350,"manyPoints":100},
      {"step":2,"g":"o","foeLvl":129,"bossHpPct":1150,"foeHpPct":100,"souls":15,"points":116,"manyHpPct":350,"manyPoints":116},
      {"step":3,"g":"o","foeLvl":134,"bossHpPct":1150,"foeHpPct":100,"souls":15,"points":134,"manyHpPct":350,"manyPoints":134},
      {"step":4,"g":"o","foeLvl":139,"bossHpPct":1150,"foeHpPct":100,"souls":15,"points":156,"manyHpPct":350,"manyPoints":156},
      {"step":5,"g":"o","foeLvl":143,"bossHpPct":1150,"foeHpPct":100,"souls":15,"points":181,"manyHpPct":350,"manyPoints":181},
      {"step":6,"g":"o","foeLvl":147,"bossHpPct":1150,"foeHpPct":100,"souls":15,"points":210,"manyHpPct":350,"manyPoints":210},
      {"step":7,"g":"e","foeLvl":150,"bossHpPct":3600,"foeHpPct":100,"souls":30,"points":974,"manyHpPct":550,"manyPoints":974},
      {"step":8,"g":"e","foeLvl":153,"bossHpPct":3600,"foeHpPct":100,"souls":30,"points":1130,"manyHpPct":550,"manyPoints":1130},
      {"step":9,"g":"e","foeLvl":156,"bossHpPct":3600,"foeHpPct":100,"souls":30,"points":1311,"manyHpPct":550,"manyPoints":1311},
      {"step":10,"g":"e","foeLvl":158,"bossHpPct":3600,"foeHpPct":100,"souls":30,"points":1520,"manyHpPct":550,"manyPoints":1520},
      {"step":11,"g":"b","foeLvl":159,"bossHpPct":13550,"foeHpPct":100,"souls":60,"points":5292,"manyHpPct":1350,"manyPoints":5292},
      {"step":12,"g":"b","foeLvl":161,"bossHpPct":13550,"foeHpPct":100,"souls":60,"points":6139,"manyHpPct":1350,"manyPoints":6139},
      {"step":13,"g":"b","foeLvl":161,"bossHpPct":13550,"foeHpPct":100,"souls":60,"points":7121,"manyHpPct":1350,"manyPoints":7121},
      {"step":14,"g":"u","foeLvl":162,"bossHpPct":55450,"foeHpPct":100,"souls":150,"points":41305,"manyHpPct":2750,"manyPoints":41305},
      {"step":15,"g":"m","foeLvl":162,"bossHpPct":2650,"foeHpPct":null,"souls":30,"points":1597},
    ],
    '3': [
      {"step":1,"g":"o","foeLvl":206,"bossHpPct":1150,"foeHpPct":100,"souls":35,"points":300,"manyHpPct":350,"manyPoints":300},
      {"step":2,"g":"o","foeLvl":214,"bossHpPct":1150,"foeHpPct":100,"souls":35,"points":348,"manyHpPct":350,"manyPoints":348},
      {"step":3,"g":"o","foeLvl":221,"bossHpPct":1150,"foeHpPct":100,"souls":35,"points":403,"manyHpPct":350,"manyPoints":403},
      {"step":4,"g":"o","foeLvl":228,"bossHpPct":1150,"foeHpPct":100,"souls":35,"points":468,"manyHpPct":350,"manyPoints":468},
      {"step":5,"g":"o","foeLvl":235,"bossHpPct":1150,"foeHpPct":100,"souls":35,"points":543,"manyHpPct":350,"manyPoints":543},
      {"step":6,"g":"o","foeLvl":240,"bossHpPct":1150,"foeHpPct":100,"souls":35,"points":630,"manyHpPct":350,"manyPoints":630},
      {"step":7,"g":"e","foeLvl":245,"bossHpPct":3600,"foeHpPct":100,"souls":70,"points":2923,"manyHpPct":550,"manyPoints":2923},
      {"step":8,"g":"e","foeLvl":250,"bossHpPct":3600,"foeHpPct":100,"souls":70,"points":3390,"manyHpPct":550,"manyPoints":3390},
      {"step":9,"g":"e","foeLvl":253,"bossHpPct":3600,"foeHpPct":100,"souls":70,"points":3933,"manyHpPct":550,"manyPoints":3933},
      {"step":10,"g":"e","foeLvl":256,"bossHpPct":3600,"foeHpPct":100,"souls":70,"points":4562,"manyHpPct":550,"manyPoints":4562},
      {"step":11,"g":"b","foeLvl":259,"bossHpPct":13550,"foeHpPct":100,"souls":140,"points":15878,"manyHpPct":1350,"manyPoints":15878},
      {"step":12,"g":"b","foeLvl":260,"bossHpPct":13550,"foeHpPct":100,"souls":140,"points":18418,"manyHpPct":1350,"manyPoints":18418},
      {"step":13,"g":"b","foeLvl":261,"bossHpPct":13550,"foeHpPct":100,"souls":140,"points":21364,"manyHpPct":1350,"manyPoints":21364},
      {"step":14,"g":"u","foeLvl":262,"bossHpPct":55450,"foeHpPct":100,"souls":350,"points":123915,"manyHpPct":2750,"manyPoints":123915},
      {"step":15,"g":"m","foeLvl":262,"bossHpPct":2650,"foeHpPct":null,"souls":70,"points":4791},
    ],
    '4': [
      {"step":1,"g":"o","foeLvl":336,"bossHpPct":1150,"foeHpPct":100,"souls":60,"points":900,"manyHpPct":350,"manyPoints":900},
      {"step":2,"g":"o","foeLvl":349,"bossHpPct":1150,"foeHpPct":100,"souls":60,"points":1044,"manyHpPct":350,"manyPoints":1044},
      {"step":3,"g":"o","foeLvl":362,"bossHpPct":1150,"foeHpPct":100,"souls":60,"points":1211,"manyHpPct":350,"manyPoints":1211},
      {"step":4,"g":"o","foeLvl":374,"bossHpPct":1150,"foeHpPct":100,"souls":60,"points":1404,"manyHpPct":350,"manyPoints":1404},
      {"step":5,"g":"o","foeLvl":384,"bossHpPct":1150,"foeHpPct":100,"souls":60,"points":1629,"manyHpPct":350,"manyPoints":1629},
      {"step":6,"g":"o","foeLvl":394,"bossHpPct":1150,"foeHpPct":100,"souls":60,"points":1890,"manyHpPct":350,"manyPoints":1890},
      {"step":7,"g":"e","foeLvl":402,"bossHpPct":3600,"foeHpPct":100,"souls":120,"points":8769,"manyHpPct":550,"manyPoints":8769},
      {"step":8,"g":"e","foeLvl":409,"bossHpPct":3600,"foeHpPct":100,"souls":120,"points":10172,"manyHpPct":550,"manyPoints":10172},
      {"step":9,"g":"e","foeLvl":416,"bossHpPct":3600,"foeHpPct":100,"souls":120,"points":11800,"manyHpPct":550,"manyPoints":11800},
      {"step":10,"g":"e","foeLvl":421,"bossHpPct":3600,"foeHpPct":100,"souls":120,"points":13688,"manyHpPct":550,"manyPoints":13688},
      {"step":11,"g":"b","foeLvl":424,"bossHpPct":13550,"foeHpPct":100,"souls":240,"points":47634,"manyHpPct":1350,"manyPoints":47634},
      {"step":12,"g":"b","foeLvl":427,"bossHpPct":13550,"foeHpPct":100,"souls":240,"points":55254,"manyHpPct":1350,"manyPoints":55254},
      {"step":13,"g":"b","foeLvl":429,"bossHpPct":13550,"foeHpPct":100,"souls":240,"points":64094,"manyHpPct":1350,"manyPoints":64094},
      {"step":14,"g":"u","foeLvl":430,"bossHpPct":55450,"foeHpPct":100,"souls":600,"points":371746,"manyHpPct":2750,"manyPoints":371746},
      {"step":15,"g":"m","foeLvl":430,"bossHpPct":2650,"foeHpPct":null,"souls":120,"points":14374},
    ],
    '5': [
      {"step":1,"g":"o","foeLvl":545,"bossHpPct":1150,"foeHpPct":100,"souls":90,"points":2700,"manyHpPct":350,"manyPoints":2700},
      {"step":2,"g":"o","foeLvl":566,"bossHpPct":1150,"foeHpPct":100,"souls":90,"points":3132,"manyHpPct":350,"manyPoints":3132},
      {"step":3,"g":"o","foeLvl":586,"bossHpPct":1150,"foeHpPct":100,"souls":90,"points":3633,"manyHpPct":350,"manyPoints":3633},
      {"step":4,"g":"o","foeLvl":604,"bossHpPct":1150,"foeHpPct":100,"souls":90,"points":4214,"manyHpPct":350,"manyPoints":4214},
      {"step":5,"g":"o","foeLvl":621,"bossHpPct":1150,"foeHpPct":100,"souls":90,"points":4888,"manyHpPct":350,"manyPoints":4888},
      {"step":6,"g":"o","foeLvl":635,"bossHpPct":1150,"foeHpPct":100,"souls":90,"points":5670,"manyHpPct":350,"manyPoints":5670},
      {"step":7,"g":"e","foeLvl":648,"bossHpPct":3600,"foeHpPct":100,"souls":180,"points":26309,"manyHpPct":550,"manyPoints":26309},
      {"step":8,"g":"e","foeLvl":659,"bossHpPct":3600,"foeHpPct":100,"souls":180,"points":30518,"manyHpPct":550,"manyPoints":30518},
      {"step":9,"g":"e","foeLvl":669,"bossHpPct":3600,"foeHpPct":100,"souls":180,"points":35401,"manyHpPct":550,"manyPoints":35401},
      {"step":10,"g":"e","foeLvl":677,"bossHpPct":3600,"foeHpPct":100,"souls":180,"points":41064,"manyHpPct":550,"manyPoints":41064},
      {"step":11,"g":"b","foeLvl":683,"bossHpPct":13550,"foeHpPct":100,"souls":360,"points":142903,"manyHpPct":1350,"manyPoints":142903},
      {"step":12,"g":"b","foeLvl":687,"bossHpPct":13550,"foeHpPct":100,"souls":360,"points":165764,"manyHpPct":1350,"manyPoints":165764},
      {"step":13,"g":"b","foeLvl":690,"bossHpPct":13550,"foeHpPct":100,"souls":360,"points":192284,"manyHpPct":1350,"manyPoints":192284},
      {"step":14,"g":"u","foeLvl":691,"bossHpPct":55450,"foeHpPct":100,"souls":900,"points":1115240,"manyHpPct":2750,"manyPoints":1115240},
      {"step":15,"g":"m","foeLvl":691,"bossHpPct":2650,"foeHpPct":null,"souls":180,"points":43122},
    ],
    '6': [
      {"step":1,"g":"o","foeLvl":877,"bossHpPct":1150,"foeHpPct":100,"souls":130,"points":8100,"manyHpPct":350,"manyPoints":8100},
      {"step":2,"g":"o","foeLvl":911,"bossHpPct":1150,"foeHpPct":100,"souls":130,"points":9396,"manyHpPct":350,"manyPoints":9396},
      {"step":3,"g":"o","foeLvl":944,"bossHpPct":1150,"foeHpPct":100,"souls":130,"points":10899,"manyHpPct":350,"manyPoints":10899},
      {"step":4,"g":"o","foeLvl":973,"bossHpPct":1150,"foeHpPct":100,"souls":130,"points":12642,"manyHpPct":350,"manyPoints":12642},
      {"step":5,"g":"o","foeLvl":999,"bossHpPct":1150,"foeHpPct":100,"souls":130,"points":14665,"manyHpPct":350,"manyPoints":14665},
      {"step":6,"g":"o","foeLvl":1023,"bossHpPct":1150,"foeHpPct":100,"souls":130,"points":17010,"manyHpPct":350,"manyPoints":17010},
      {"step":7,"g":"e","foeLvl":1044,"bossHpPct":3600,"foeHpPct":100,"souls":260,"points":78929,"manyHpPct":550,"manyPoints":78929},
      {"step":8,"g":"e","foeLvl":1062,"bossHpPct":3600,"foeHpPct":100,"souls":260,"points":91555,"manyHpPct":550,"manyPoints":91555},
      {"step":9,"g":"e","foeLvl":1078,"bossHpPct":3600,"foeHpPct":100,"souls":260,"points":106203,"manyHpPct":550,"manyPoints":106203},
      {"step":10,"g":"e","foeLvl":1090,"bossHpPct":3600,"foeHpPct":100,"souls":260,"points":123194,"manyHpPct":550,"manyPoints":123194},
      {"step":11,"g":"b","foeLvl":1100,"bossHpPct":13550,"foeHpPct":100,"souls":520,"points":428710,"manyHpPct":1350,"manyPoints":428710},
      {"step":12,"g":"b","foeLvl":1107,"bossHpPct":13550,"foeHpPct":100,"souls":520,"points":497294,"manyHpPct":1350,"manyPoints":497294},
      {"step":13,"g":"b","foeLvl":1111,"bossHpPct":13550,"foeHpPct":100,"souls":520,"points":576852,"manyHpPct":1350,"manyPoints":576852},
      {"step":14,"g":"u","foeLvl":1113,"bossHpPct":55450,"foeHpPct":100,"souls":1300,"points":3345721,"manyHpPct":2750,"manyPoints":3345721},
      {"step":15,"g":"m","foeLvl":1113,"bossHpPct":2650,"foeHpPct":null,"souls":260,"points":129366},
    ],
  },
};
