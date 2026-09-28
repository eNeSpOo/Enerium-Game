/* Энериум · правила боя в Эхо (ADR-0025, §17 GDD). Собрано tools/content-gen/economy/echo.py --js — руками не править:
   правка — в данных echo.py, затем пересобрать. Черновик — docs/content/эхо-экономика.md. Все числа — демонстрация, не баланс.

   window.EN_ECHO_RULES:
   - bp — 10 000 = 100 %.
   - ladder — типы ступеней 1–15: o рядовой, e элита, b босс недели, u Убер-босс, m Многоликий.
   - types — тип главного врага:
       foes — врагов в бою: главный и четыре защитника; у Многоликого — он один (ADR-0025);
       rounds — раундов в атаке (§17.3): maxRounds боя;
       rank — ранг карты главного врага в ядре: от него иммунитет к контролю (RULES.resist); Многоликий — лёгкий бой, набор элиты;
       design — атак на убийство у «своего» отряда: отношение уровней onLevel;
       lifeH — срок цели, часы (как в прототипе экрана, демо).
   - summonSouls — цена призыва, 1 душа на всех циклах (§17.1, §36.4); Многоликий — пятнадцатая ступень, его зовёт тот же призыв.
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
  statsFrom: {"o":{"Физ. ДД силы":"o1","Дебаффер":"o2","Маг. ДД":"o3","Танк":"o4","Лекарь":"o5","Физ. ДД ловкости":"o6"},"x":{"Физ. ДД силы":"e1","Физ. ДД ловкости":"e2","Танк":"e3","Маг. ДД":"e4","Лекарь":"e5","Дебаффер":"e6"}},
  types: {
    o: {"name":"Рядовой","foes":5,"rounds":10,"rank":"o","design":1,"lifeH":72},
    e: {"name":"Элита","foes":5,"rounds":15,"rank":"e","design":2,"lifeH":48},
    b: {"name":"Босс","foes":5,"rounds":20,"rank":"b","design":3,"lifeH":36},
    u: {"name":"Убер-босс","foes":5,"rounds":25,"rank":"uber","design":6,"lifeH":24},
    m: {"name":"Многоликий","foes":1,"rounds":10,"rank":"e","design":1,"lifeH":24},
  },
  cycles: {
    '2': [
      {"step":1,"g":"o","foeLvl":124,"bossHpPct":1800,"foeHpPct":100,"souls":30,"points":100,"manyHpPct":550,"manyPoints":100},
      {"step":2,"g":"o","foeLvl":129,"bossHpPct":1800,"foeHpPct":100,"souls":30,"points":116,"manyHpPct":550,"manyPoints":116},
      {"step":3,"g":"o","foeLvl":134,"bossHpPct":1800,"foeHpPct":100,"souls":30,"points":134,"manyHpPct":550,"manyPoints":134},
      {"step":4,"g":"o","foeLvl":139,"bossHpPct":1800,"foeHpPct":100,"souls":30,"points":156,"manyHpPct":550,"manyPoints":156},
      {"step":5,"g":"o","foeLvl":143,"bossHpPct":1800,"foeHpPct":100,"souls":30,"points":181,"manyHpPct":550,"manyPoints":181},
      {"step":6,"g":"o","foeLvl":147,"bossHpPct":1800,"foeHpPct":100,"souls":30,"points":210,"manyHpPct":550,"manyPoints":210},
      {"step":7,"g":"e","foeLvl":150,"bossHpPct":3850,"foeHpPct":100,"souls":45,"points":730,"manyHpPct":600,"manyPoints":730},
      {"step":8,"g":"e","foeLvl":153,"bossHpPct":3850,"foeHpPct":100,"souls":45,"points":847,"manyHpPct":600,"manyPoints":847},
      {"step":9,"g":"e","foeLvl":156,"bossHpPct":3850,"foeHpPct":100,"souls":45,"points":983,"manyHpPct":600,"manyPoints":983},
      {"step":10,"g":"e","foeLvl":158,"bossHpPct":3850,"foeHpPct":100,"souls":45,"points":1140,"manyHpPct":600,"manyPoints":1140},
      {"step":11,"g":"b","foeLvl":159,"bossHpPct":8250,"foeHpPct":100,"souls":60,"points":2646,"manyHpPct":850,"manyPoints":2646},
      {"step":12,"g":"b","foeLvl":161,"bossHpPct":8250,"foeHpPct":100,"souls":60,"points":3069,"manyHpPct":850,"manyPoints":3069},
      {"step":13,"g":"b","foeLvl":161,"bossHpPct":8250,"foeHpPct":100,"souls":60,"points":3560,"manyHpPct":850,"manyPoints":3560},
      {"step":14,"g":"u","foeLvl":162,"bossHpPct":18000,"foeHpPct":100,"souls":75,"points":10326,"manyHpPct":900,"manyPoints":10326},
      {"step":15,"g":"m","foeLvl":162,"bossHpPct":1850,"foeHpPct":null,"souls":30,"points":798},
    ],
    '3': [
      {"step":1,"g":"o","foeLvl":206,"bossHpPct":1800,"foeHpPct":100,"souls":70,"points":300,"manyHpPct":550,"manyPoints":300},
      {"step":2,"g":"o","foeLvl":214,"bossHpPct":1800,"foeHpPct":100,"souls":70,"points":348,"manyHpPct":550,"manyPoints":348},
      {"step":3,"g":"o","foeLvl":221,"bossHpPct":1800,"foeHpPct":100,"souls":70,"points":403,"manyHpPct":550,"manyPoints":403},
      {"step":4,"g":"o","foeLvl":228,"bossHpPct":1800,"foeHpPct":100,"souls":70,"points":468,"manyHpPct":550,"manyPoints":468},
      {"step":5,"g":"o","foeLvl":235,"bossHpPct":1800,"foeHpPct":100,"souls":70,"points":543,"manyHpPct":550,"manyPoints":543},
      {"step":6,"g":"o","foeLvl":240,"bossHpPct":1800,"foeHpPct":100,"souls":70,"points":630,"manyHpPct":550,"manyPoints":630},
      {"step":7,"g":"e","foeLvl":245,"bossHpPct":3850,"foeHpPct":100,"souls":105,"points":2192,"manyHpPct":600,"manyPoints":2192},
      {"step":8,"g":"e","foeLvl":250,"bossHpPct":3850,"foeHpPct":100,"souls":105,"points":2543,"manyHpPct":600,"manyPoints":2543},
      {"step":9,"g":"e","foeLvl":253,"bossHpPct":3850,"foeHpPct":100,"souls":105,"points":2950,"manyHpPct":600,"manyPoints":2950},
      {"step":10,"g":"e","foeLvl":256,"bossHpPct":3850,"foeHpPct":100,"souls":105,"points":3422,"manyHpPct":600,"manyPoints":3422},
      {"step":11,"g":"b","foeLvl":259,"bossHpPct":8250,"foeHpPct":100,"souls":140,"points":7939,"manyHpPct":850,"manyPoints":7939},
      {"step":12,"g":"b","foeLvl":260,"bossHpPct":8250,"foeHpPct":100,"souls":140,"points":9209,"manyHpPct":850,"manyPoints":9209},
      {"step":13,"g":"b","foeLvl":261,"bossHpPct":8250,"foeHpPct":100,"souls":140,"points":10682,"manyHpPct":850,"manyPoints":10682},
      {"step":14,"g":"u","foeLvl":262,"bossHpPct":18000,"foeHpPct":100,"souls":175,"points":30978,"manyHpPct":900,"manyPoints":30978},
      {"step":15,"g":"m","foeLvl":262,"bossHpPct":1850,"foeHpPct":null,"souls":70,"points":2395},
    ],
    '4': [
      {"step":1,"g":"o","foeLvl":336,"bossHpPct":1800,"foeHpPct":100,"souls":120,"points":900,"manyHpPct":550,"manyPoints":900},
      {"step":2,"g":"o","foeLvl":349,"bossHpPct":1800,"foeHpPct":100,"souls":120,"points":1044,"manyHpPct":550,"manyPoints":1044},
      {"step":3,"g":"o","foeLvl":362,"bossHpPct":1800,"foeHpPct":100,"souls":120,"points":1211,"manyHpPct":550,"manyPoints":1211},
      {"step":4,"g":"o","foeLvl":374,"bossHpPct":1800,"foeHpPct":100,"souls":120,"points":1404,"manyHpPct":550,"manyPoints":1404},
      {"step":5,"g":"o","foeLvl":384,"bossHpPct":1800,"foeHpPct":100,"souls":120,"points":1629,"manyHpPct":550,"manyPoints":1629},
      {"step":6,"g":"o","foeLvl":394,"bossHpPct":1800,"foeHpPct":100,"souls":120,"points":1890,"manyHpPct":550,"manyPoints":1890},
      {"step":7,"g":"e","foeLvl":402,"bossHpPct":3850,"foeHpPct":100,"souls":180,"points":6577,"manyHpPct":600,"manyPoints":6577},
      {"step":8,"g":"e","foeLvl":409,"bossHpPct":3850,"foeHpPct":100,"souls":180,"points":7629,"manyHpPct":600,"manyPoints":7629},
      {"step":9,"g":"e","foeLvl":416,"bossHpPct":3850,"foeHpPct":100,"souls":180,"points":8850,"manyHpPct":600,"manyPoints":8850},
      {"step":10,"g":"e","foeLvl":421,"bossHpPct":3850,"foeHpPct":100,"souls":180,"points":10266,"manyHpPct":600,"manyPoints":10266},
      {"step":11,"g":"b","foeLvl":424,"bossHpPct":8250,"foeHpPct":100,"souls":240,"points":23817,"manyHpPct":850,"manyPoints":23817},
      {"step":12,"g":"b","foeLvl":427,"bossHpPct":8250,"foeHpPct":100,"souls":240,"points":27627,"manyHpPct":850,"manyPoints":27627},
      {"step":13,"g":"b","foeLvl":429,"bossHpPct":8250,"foeHpPct":100,"souls":240,"points":32047,"manyHpPct":850,"manyPoints":32047},
      {"step":14,"g":"u","foeLvl":430,"bossHpPct":18000,"foeHpPct":100,"souls":300,"points":92936,"manyHpPct":900,"manyPoints":92936},
      {"step":15,"g":"m","foeLvl":430,"bossHpPct":1850,"foeHpPct":null,"souls":120,"points":7187},
    ],
    '5': [
      {"step":1,"g":"o","foeLvl":545,"bossHpPct":1800,"foeHpPct":100,"souls":180,"points":2700,"manyHpPct":550,"manyPoints":2700},
      {"step":2,"g":"o","foeLvl":566,"bossHpPct":1800,"foeHpPct":100,"souls":180,"points":3132,"manyHpPct":550,"manyPoints":3132},
      {"step":3,"g":"o","foeLvl":586,"bossHpPct":1800,"foeHpPct":100,"souls":180,"points":3633,"manyHpPct":550,"manyPoints":3633},
      {"step":4,"g":"o","foeLvl":604,"bossHpPct":1800,"foeHpPct":100,"souls":180,"points":4214,"manyHpPct":550,"manyPoints":4214},
      {"step":5,"g":"o","foeLvl":621,"bossHpPct":1800,"foeHpPct":100,"souls":180,"points":4888,"manyHpPct":550,"manyPoints":4888},
      {"step":6,"g":"o","foeLvl":635,"bossHpPct":1800,"foeHpPct":100,"souls":180,"points":5670,"manyHpPct":550,"manyPoints":5670},
      {"step":7,"g":"e","foeLvl":648,"bossHpPct":3850,"foeHpPct":100,"souls":270,"points":19732,"manyHpPct":600,"manyPoints":19732},
      {"step":8,"g":"e","foeLvl":659,"bossHpPct":3850,"foeHpPct":100,"souls":270,"points":22888,"manyHpPct":600,"manyPoints":22888},
      {"step":9,"g":"e","foeLvl":669,"bossHpPct":3850,"foeHpPct":100,"souls":270,"points":26550,"manyHpPct":600,"manyPoints":26550},
      {"step":10,"g":"e","foeLvl":677,"bossHpPct":3850,"foeHpPct":100,"souls":270,"points":30798,"manyHpPct":600,"manyPoints":30798},
      {"step":11,"g":"b","foeLvl":683,"bossHpPct":8250,"foeHpPct":100,"souls":360,"points":71451,"manyHpPct":850,"manyPoints":71451},
      {"step":12,"g":"b","foeLvl":687,"bossHpPct":8250,"foeHpPct":100,"souls":360,"points":82882,"manyHpPct":850,"manyPoints":82882},
      {"step":13,"g":"b","foeLvl":690,"bossHpPct":8250,"foeHpPct":100,"souls":360,"points":96142,"manyHpPct":850,"manyPoints":96142},
      {"step":14,"g":"u","foeLvl":691,"bossHpPct":18000,"foeHpPct":100,"souls":450,"points":278810,"manyHpPct":900,"manyPoints":278810},
      {"step":15,"g":"m","foeLvl":691,"bossHpPct":1850,"foeHpPct":null,"souls":180,"points":21561},
    ],
    '6': [
      {"step":1,"g":"o","foeLvl":877,"bossHpPct":1800,"foeHpPct":100,"souls":260,"points":8100,"manyHpPct":550,"manyPoints":8100},
      {"step":2,"g":"o","foeLvl":911,"bossHpPct":1800,"foeHpPct":100,"souls":260,"points":9396,"manyHpPct":550,"manyPoints":9396},
      {"step":3,"g":"o","foeLvl":944,"bossHpPct":1800,"foeHpPct":100,"souls":260,"points":10899,"manyHpPct":550,"manyPoints":10899},
      {"step":4,"g":"o","foeLvl":973,"bossHpPct":1800,"foeHpPct":100,"souls":260,"points":12642,"manyHpPct":550,"manyPoints":12642},
      {"step":5,"g":"o","foeLvl":999,"bossHpPct":1800,"foeHpPct":100,"souls":260,"points":14665,"manyHpPct":550,"manyPoints":14665},
      {"step":6,"g":"o","foeLvl":1023,"bossHpPct":1800,"foeHpPct":100,"souls":260,"points":17010,"manyHpPct":550,"manyPoints":17010},
      {"step":7,"g":"e","foeLvl":1044,"bossHpPct":3850,"foeHpPct":100,"souls":390,"points":59197,"manyHpPct":600,"manyPoints":59197},
      {"step":8,"g":"e","foeLvl":1062,"bossHpPct":3850,"foeHpPct":100,"souls":390,"points":68666,"manyHpPct":600,"manyPoints":68666},
      {"step":9,"g":"e","foeLvl":1078,"bossHpPct":3850,"foeHpPct":100,"souls":390,"points":79652,"manyHpPct":600,"manyPoints":79652},
      {"step":10,"g":"e","foeLvl":1090,"bossHpPct":3850,"foeHpPct":100,"souls":390,"points":92395,"manyHpPct":600,"manyPoints":92395},
      {"step":11,"g":"b","foeLvl":1100,"bossHpPct":8250,"foeHpPct":100,"souls":520,"points":214355,"manyHpPct":850,"manyPoints":214355},
      {"step":12,"g":"b","foeLvl":1107,"bossHpPct":8250,"foeHpPct":100,"souls":520,"points":248647,"manyHpPct":850,"manyPoints":248647},
      {"step":13,"g":"b","foeLvl":1111,"bossHpPct":8250,"foeHpPct":100,"souls":520,"points":288426,"manyHpPct":850,"manyPoints":288426},
      {"step":14,"g":"u","foeLvl":1113,"bossHpPct":18000,"foeHpPct":100,"souls":650,"points":836430,"manyHpPct":900,"manyPoints":836430},
      {"step":15,"g":"m","foeLvl":1113,"bossHpPct":1850,"foeHpPct":null,"souls":260,"points":64683},
    ],
  },
};
