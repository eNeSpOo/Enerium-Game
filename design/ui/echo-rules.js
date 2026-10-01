/* Энериум · правила боя в Эхо (ADR-0025, §17 GDD). Собрано tools/content-gen/economy/echo.py --js — руками не править:
   правка — в данных echo.py, затем пересобрать. Черновик — docs/content/эхо-экономика.md. Все числа — демонстрация, не баланс.

   window.EN_ECHO_RULES:
   - bp — 10 000 = 100 %.
   - ladder — типы ступеней 1–15: o рядовой, e элита, b босс недели, u Убер-босс, m Многоликий — вершина, один из Забытых (ADR-0039).
   - types — тип главного врага ступени лестницы: o, e, b, u, m:
       foes — врагов в бою: главный и четыре защитника — у всех, и у Многоликого (ADR-0039);
       rounds — раундов в атаке (§17.3): выборка таблицы ядра RULES.rounds.by (слово автора 01.10.2026) — для калькуляторов; экран Эхо
         берёт раунды из ядра (RULES.echo.rounds), а не отсюда;
       rank — ранг карты главного врага в ядре: от него иммунитет к контролю (RULES.resist); Многоликий — forgotten;
       design — атак на убийство у «своего» отряда;
       lifeH — срок цели, часы: боссы и Убер — час, потом цель исчезает (решение автора 29.09.2026).
   - summon — призванные из предмета крафта враги, вне лестницы (§12.3, ADR-0039): отдельного «крафтового босса» нет, тип — по силе:
       lifeH — срок любого призванного врага, часы;
       types — e элита, b босс, u Убер, f Забытый (тип врага — поле g записи craftBosses в recipes.js), у каждого:
         name, who — тип для игрока и кто из призывов этого типа; foes, rounds, rank, design — как у types;
         step — ступень лестницы, по которой идёт его уровень; guards — ранги защитников недели (экран выбирает ступени сам);
         foeHpPct — здоровье защитников, % hpPct своей карты;
         cycles — по циклу силы врага '2'…'6' (цикл врага, у пробуждённого — на powerCycleStep выше; за VI — уровень по шагу последнего
           цикла, ниже II — как II): foeLvl — уровень карт боя, bossHpPct — здоровье главного врага, souls — цена атаки = rounds × roundSouls.
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
       (ADR-0031, п. 8: обычный берёт босса недели за дневной бюджет душ Эхо, призванного — за один-два дня; Многоликий — как Убер-босс,
       на уровне выше его).
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
       foeHpPct — здоровье защитников, % hpPct своей карты, как BIOMES.foeHpPct;
       souls — цена одной атаки в душах;
       points — рейтинговые очки за убийство главного врага (§17.5–17.6);
       у ступеней 1–14 ещё этаж биома Многоликого: manyHpPct — здоровье главного врага этажа (попытка одна), manyPoints — очки за взятый этаж.
   - many — биом Многоликого (ADR-0025): ресурс с пятнадцатой ступени активирует его на своей неделе или уходит в крафт.
       floors — этажи: ступени 1–14 недели по порядку, их составы, уровни и раунды; attempts — попыток; souls — душ на атаки;
       этаж взят, когда пал главный враг; здоровье и павшие переходят дальше, как в биоме (ADR-0007): лечения между этажами нет;
       осады нет — этаж не взят, и попытка кончилась.
   Замер — отрядом прототипа (economy.SIM_JS) на врагах недели: design/ui/echo-foes.js, недель 9: oebum; призванные — с защитниками недели; режим Эхо ядра — echoBattle. */
window.EN_ECHO_RULES = {
  bp: 10000, onLevel: 240, summonSouls: 1, manySummonBp: 10,
  ladder: ["o","o","o","o","o","o","e","e","e","e","b","b","b","u","m"],
  pickW: [1332,1234,1139,1045,950,856,761,667,572,478,383,289,194,100],
  likShards: [null,13,20,33,51,75],
  many: {"floors":14,"attempts":1,"souls":0},
  roundSouls: [1,3,8,14,23,33],
  statsFrom: {"o":{"Физ. ДД силы":"o1","Дебаффер":"o2","Маг. ДД":"o3","Танк":"o4","Лекарь":"o5","Физ. ДД ловкости":"o6"},"x":{"Физ. ДД силы":"e1","Физ. ДД ловкости":"e2","Танк":"e3","Маг. ДД":"e4","Лекарь":"e5","Дебаффер":"e6"}},
  plank1: {"2":3300,"3":9700,"4":33000,"5":98000,"6":300000}, plankMul: 2,
  types: {
    o: {"name":"Рядовой","foes":5,"rounds":10,"rank":"o","design":1,"lifeH":72},
    e: {"name":"Элита","foes":5,"rounds":15,"rank":"e","design":2,"lifeH":48},
    b: {"name":"Босс","foes":5,"rounds":20,"rank":"b","design":3,"lifeH":1},
    u: {"name":"Убер-босс","foes":5,"rounds":30,"rank":"uber","design":6,"lifeH":1},
    m: {"name":"Многоликий","foes":5,"rounds":50,"rank":"forgotten","design":6,"lifeH":24},
  },
  summon: { lifeH: 1, types: {
    e: {"name":"Элита","who":"Лик недели","foes":5,"rounds":15,"rank":"e","design":4,"step":10,"guards":"eooo","foeHpPct":100,"cycles":{"2":{"foeLvl":115,"bossHpPct":3700,"souls":45},"3":{"foeLvl":189,"bossHpPct":6100,"souls":120},"4":{"foeLvl":311,"bossHpPct":6000,"souls":210},"5":{"foeLvl":502,"bossHpPct":6050,"souls":345},"6":{"foeLvl":811,"bossHpPct":6050,"souls":495}}},
    b: {"name":"Босс","who":"боссы руин, эхо боссов биомов","foes":5,"rounds":20,"rank":"b","design":6,"step":13,"guards":"eeoo","foeHpPct":100,"cycles":{"2":{"foeLvl":117,"bossHpPct":3300,"souls":60},"3":{"foeLvl":192,"bossHpPct":7750,"souls":160},"4":{"foeLvl":317,"bossHpPct":7450,"souls":280},"5":{"foeLvl":512,"bossHpPct":7600,"souls":460},"6":{"foeLvl":826,"bossHpPct":7550,"souls":660}}},
    u: {"name":"Убер","who":"боссы городов","foes":5,"rounds":30,"rank":"uber","design":4,"step":14,"guards":"beee","foeHpPct":100,"cycles":{"2":{"foeLvl":118,"bossHpPct":1400,"souls":90},"3":{"foeLvl":193,"bossHpPct":5450,"souls":240},"4":{"foeLvl":318,"bossHpPct":5050,"souls":420},"5":{"foeLvl":513,"bossHpPct":5250,"souls":690},"6":{"foeLvl":828,"bossHpPct":5150,"souls":990}}},
    f: {"name":"Забытый","who":"пробуждённые","foes":5,"rounds":50,"rank":"forgotten","design":4,"step":15,"guards":"bbbe","foeHpPct":100,"cycles":{"2":{"foeLvl":131,"bossHpPct":700,"souls":150},"3":{"foeLvl":213,"bossHpPct":2700,"souls":400},"4":{"foeLvl":351,"bossHpPct":2500,"souls":700},"5":{"foeLvl":565,"bossHpPct":2600,"souls":1150},"6":{"foeLvl":912,"bossHpPct":2550,"souls":1650}}},
  } },
  cycles: {
    '2': [
      {"step":1,"g":"o","foeLvl":89,"bossHpPct":1000,"foeHpPct":100,"souls":30,"points":100,"manyHpPct":300,"manyPoints":100},
      {"step":2,"g":"o","foeLvl":93,"bossHpPct":1000,"foeHpPct":100,"souls":30,"points":116,"manyHpPct":300,"manyPoints":116},
      {"step":3,"g":"o","foeLvl":97,"bossHpPct":1000,"foeHpPct":100,"souls":30,"points":134,"manyHpPct":300,"manyPoints":134},
      {"step":4,"g":"o","foeLvl":100,"bossHpPct":1000,"foeHpPct":100,"souls":30,"points":156,"manyHpPct":300,"manyPoints":156},
      {"step":5,"g":"o","foeLvl":104,"bossHpPct":1000,"foeHpPct":100,"souls":30,"points":181,"manyHpPct":300,"manyPoints":181},
      {"step":6,"g":"o","foeLvl":107,"bossHpPct":1000,"foeHpPct":100,"souls":30,"points":210,"manyHpPct":300,"manyPoints":210},
      {"step":7,"g":"e","foeLvl":109,"bossHpPct":1350,"foeHpPct":100,"souls":45,"points":730,"manyHpPct":200,"manyPoints":730},
      {"step":8,"g":"e","foeLvl":111,"bossHpPct":1350,"foeHpPct":100,"souls":45,"points":847,"manyHpPct":200,"manyPoints":847},
      {"step":9,"g":"e","foeLvl":113,"bossHpPct":1350,"foeHpPct":100,"souls":45,"points":983,"manyHpPct":200,"manyPoints":983},
      {"step":10,"g":"e","foeLvl":115,"bossHpPct":1350,"foeHpPct":100,"souls":45,"points":1140,"manyHpPct":200,"manyPoints":1140},
      {"step":11,"g":"b","foeLvl":116,"bossHpPct":2250,"foeHpPct":100,"souls":60,"points":2646,"manyHpPct":250,"manyPoints":2646},
      {"step":12,"g":"b","foeLvl":117,"bossHpPct":2250,"foeHpPct":100,"souls":60,"points":3069,"manyHpPct":250,"manyPoints":3069},
      {"step":13,"g":"b","foeLvl":117,"bossHpPct":2250,"foeHpPct":100,"souls":60,"points":3560,"manyHpPct":250,"manyPoints":3560},
      {"step":14,"g":"u","foeLvl":118,"bossHpPct":21300,"foeHpPct":100,"souls":90,"points":12391,"manyHpPct":1050,"manyPoints":12391},
      {"step":15,"g":"m","foeLvl":131,"bossHpPct":26550,"foeHpPct":100,"souls":150,"points":23956},
    ],
    '3': [
      {"step":1,"g":"o","foeLvl":151,"bossHpPct":1650,"foeHpPct":100,"souls":80,"points":300,"manyHpPct":500,"manyPoints":300},
      {"step":2,"g":"o","foeLvl":157,"bossHpPct":1650,"foeHpPct":100,"souls":80,"points":348,"manyHpPct":500,"manyPoints":348},
      {"step":3,"g":"o","foeLvl":162,"bossHpPct":1650,"foeHpPct":100,"souls":80,"points":403,"manyHpPct":500,"manyPoints":403},
      {"step":4,"g":"o","foeLvl":168,"bossHpPct":1650,"foeHpPct":100,"souls":80,"points":468,"manyHpPct":500,"manyPoints":468},
      {"step":5,"g":"o","foeLvl":172,"bossHpPct":1650,"foeHpPct":100,"souls":80,"points":543,"manyHpPct":500,"manyPoints":543},
      {"step":6,"g":"o","foeLvl":177,"bossHpPct":1650,"foeHpPct":100,"souls":80,"points":630,"manyHpPct":500,"manyPoints":630},
      {"step":7,"g":"e","foeLvl":180,"bossHpPct":2600,"foeHpPct":100,"souls":120,"points":2192,"manyHpPct":400,"manyPoints":2192},
      {"step":8,"g":"e","foeLvl":184,"bossHpPct":2600,"foeHpPct":100,"souls":120,"points":2543,"manyHpPct":400,"manyPoints":2543},
      {"step":9,"g":"e","foeLvl":186,"bossHpPct":2600,"foeHpPct":100,"souls":120,"points":2950,"manyHpPct":400,"manyPoints":2950},
      {"step":10,"g":"e","foeLvl":189,"bossHpPct":2600,"foeHpPct":100,"souls":120,"points":3422,"manyHpPct":400,"manyPoints":3422},
      {"step":11,"g":"b","foeLvl":190,"bossHpPct":5300,"foeHpPct":100,"souls":160,"points":7939,"manyHpPct":550,"manyPoints":7939},
      {"step":12,"g":"b","foeLvl":192,"bossHpPct":5300,"foeHpPct":100,"souls":160,"points":9209,"manyHpPct":550,"manyPoints":9209},
      {"step":13,"g":"b","foeLvl":192,"bossHpPct":5300,"foeHpPct":100,"souls":160,"points":10682,"manyHpPct":550,"manyPoints":10682},
      {"step":14,"g":"u","foeLvl":193,"bossHpPct":21300,"foeHpPct":100,"souls":240,"points":37174,"manyHpPct":1050,"manyPoints":37174},
      {"step":15,"g":"m","foeLvl":213,"bossHpPct":26550,"foeHpPct":100,"souls":400,"points":71870},
    ],
    '4': [
      {"step":1,"g":"o","foeLvl":248,"bossHpPct":1600,"foeHpPct":100,"souls":140,"points":900,"manyHpPct":500,"manyPoints":900},
      {"step":2,"g":"o","foeLvl":258,"bossHpPct":1600,"foeHpPct":100,"souls":140,"points":1044,"manyHpPct":500,"manyPoints":1044},
      {"step":3,"g":"o","foeLvl":267,"bossHpPct":1600,"foeHpPct":100,"souls":140,"points":1211,"manyHpPct":500,"manyPoints":1211},
      {"step":4,"g":"o","foeLvl":276,"bossHpPct":1600,"foeHpPct":100,"souls":140,"points":1404,"manyHpPct":500,"manyPoints":1404},
      {"step":5,"g":"o","foeLvl":284,"bossHpPct":1600,"foeHpPct":100,"souls":140,"points":1629,"manyHpPct":500,"manyPoints":1629},
      {"step":6,"g":"o","foeLvl":291,"bossHpPct":1600,"foeHpPct":100,"souls":140,"points":1890,"manyHpPct":500,"manyPoints":1890},
      {"step":7,"g":"e","foeLvl":297,"bossHpPct":2500,"foeHpPct":100,"souls":210,"points":6577,"manyHpPct":400,"manyPoints":6577},
      {"step":8,"g":"e","foeLvl":303,"bossHpPct":2500,"foeHpPct":100,"souls":210,"points":7629,"manyHpPct":400,"manyPoints":7629},
      {"step":9,"g":"e","foeLvl":307,"bossHpPct":2500,"foeHpPct":100,"souls":210,"points":8850,"manyHpPct":400,"manyPoints":8850},
      {"step":10,"g":"e","foeLvl":311,"bossHpPct":2500,"foeHpPct":100,"souls":210,"points":10266,"manyHpPct":400,"manyPoints":10266},
      {"step":11,"g":"b","foeLvl":314,"bossHpPct":5050,"foeHpPct":100,"souls":280,"points":23817,"manyHpPct":500,"manyPoints":23817},
      {"step":12,"g":"b","foeLvl":316,"bossHpPct":5050,"foeHpPct":100,"souls":280,"points":27627,"manyHpPct":500,"manyPoints":27627},
      {"step":13,"g":"b","foeLvl":317,"bossHpPct":5050,"foeHpPct":100,"souls":280,"points":32047,"manyHpPct":500,"manyPoints":32047},
      {"step":14,"g":"u","foeLvl":318,"bossHpPct":21300,"foeHpPct":100,"souls":420,"points":111524,"manyHpPct":1050,"manyPoints":111524},
      {"step":15,"g":"m","foeLvl":351,"bossHpPct":26550,"foeHpPct":100,"souls":700,"points":215611},
    ],
    '5': [
      {"step":1,"g":"o","foeLvl":404,"bossHpPct":1600,"foeHpPct":100,"souls":230,"points":2700,"manyHpPct":500,"manyPoints":2700},
      {"step":2,"g":"o","foeLvl":420,"bossHpPct":1600,"foeHpPct":100,"souls":230,"points":3132,"manyHpPct":500,"manyPoints":3132},
      {"step":3,"g":"o","foeLvl":434,"bossHpPct":1600,"foeHpPct":100,"souls":230,"points":3633,"manyHpPct":500,"manyPoints":3633},
      {"step":4,"g":"o","foeLvl":448,"bossHpPct":1600,"foeHpPct":100,"souls":230,"points":4214,"manyHpPct":500,"manyPoints":4214},
      {"step":5,"g":"o","foeLvl":460,"bossHpPct":1600,"foeHpPct":100,"souls":230,"points":4888,"manyHpPct":500,"manyPoints":4888},
      {"step":6,"g":"o","foeLvl":471,"bossHpPct":1600,"foeHpPct":100,"souls":230,"points":5670,"manyHpPct":500,"manyPoints":5670},
      {"step":7,"g":"e","foeLvl":481,"bossHpPct":2550,"foeHpPct":100,"souls":345,"points":19732,"manyHpPct":400,"manyPoints":19732},
      {"step":8,"g":"e","foeLvl":489,"bossHpPct":2550,"foeHpPct":100,"souls":345,"points":22888,"manyHpPct":400,"manyPoints":22888},
      {"step":9,"g":"e","foeLvl":496,"bossHpPct":2550,"foeHpPct":100,"souls":345,"points":26550,"manyHpPct":400,"manyPoints":26550},
      {"step":10,"g":"e","foeLvl":502,"bossHpPct":2550,"foeHpPct":100,"souls":345,"points":30798,"manyHpPct":400,"manyPoints":30798},
      {"step":11,"g":"b","foeLvl":507,"bossHpPct":5150,"foeHpPct":100,"souls":460,"points":71451,"manyHpPct":500,"manyPoints":71451},
      {"step":12,"g":"b","foeLvl":510,"bossHpPct":5150,"foeHpPct":100,"souls":460,"points":82882,"manyHpPct":500,"manyPoints":82882},
      {"step":13,"g":"b","foeLvl":512,"bossHpPct":5150,"foeHpPct":100,"souls":460,"points":96142,"manyHpPct":500,"manyPoints":96142},
      {"step":14,"g":"u","foeLvl":513,"bossHpPct":21300,"foeHpPct":100,"souls":690,"points":334572,"manyHpPct":1050,"manyPoints":334572},
      {"step":15,"g":"m","foeLvl":565,"bossHpPct":26550,"foeHpPct":100,"souls":1150,"points":646833},
    ],
    '6': [
      {"step":1,"g":"o","foeLvl":652,"bossHpPct":1600,"foeHpPct":100,"souls":330,"points":8100,"manyHpPct":500,"manyPoints":8100},
      {"step":2,"g":"o","foeLvl":678,"bossHpPct":1600,"foeHpPct":100,"souls":330,"points":9396,"manyHpPct":500,"manyPoints":9396},
      {"step":3,"g":"o","foeLvl":702,"bossHpPct":1600,"foeHpPct":100,"souls":330,"points":10899,"manyHpPct":500,"manyPoints":10899},
      {"step":4,"g":"o","foeLvl":723,"bossHpPct":1600,"foeHpPct":100,"souls":330,"points":12642,"manyHpPct":500,"manyPoints":12642},
      {"step":5,"g":"o","foeLvl":743,"bossHpPct":1600,"foeHpPct":100,"souls":330,"points":14665,"manyHpPct":500,"manyPoints":14665},
      {"step":6,"g":"o","foeLvl":761,"bossHpPct":1600,"foeHpPct":100,"souls":330,"points":17010,"manyHpPct":500,"manyPoints":17010},
      {"step":7,"g":"e","foeLvl":776,"bossHpPct":2550,"foeHpPct":100,"souls":495,"points":59197,"manyHpPct":400,"manyPoints":59197},
      {"step":8,"g":"e","foeLvl":790,"bossHpPct":2550,"foeHpPct":100,"souls":495,"points":68666,"manyHpPct":400,"manyPoints":68666},
      {"step":9,"g":"e","foeLvl":801,"bossHpPct":2550,"foeHpPct":100,"souls":495,"points":79652,"manyHpPct":400,"manyPoints":79652},
      {"step":10,"g":"e","foeLvl":811,"bossHpPct":2550,"foeHpPct":100,"souls":495,"points":92395,"manyHpPct":400,"manyPoints":92395},
      {"step":11,"g":"b","foeLvl":818,"bossHpPct":5150,"foeHpPct":100,"souls":660,"points":214355,"manyHpPct":500,"manyPoints":214355},
      {"step":12,"g":"b","foeLvl":823,"bossHpPct":5150,"foeHpPct":100,"souls":660,"points":248647,"manyHpPct":500,"manyPoints":248647},
      {"step":13,"g":"b","foeLvl":826,"bossHpPct":5150,"foeHpPct":100,"souls":660,"points":288426,"manyHpPct":500,"manyPoints":288426},
      {"step":14,"g":"u","foeLvl":828,"bossHpPct":21300,"foeHpPct":100,"souls":990,"points":1003716,"manyHpPct":1050,"manyPoints":1003716},
      {"step":15,"g":"m","foeLvl":912,"bossHpPct":26550,"foeHpPct":100,"souls":1650,"points":1940500},
    ],
  },
};
