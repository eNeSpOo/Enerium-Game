/* screens/chest-open.js — окно открытия сундука: одна анимация на все сундуки прототипа. Договор — screens/model.js.
   Регистрирует: coShow(итог, { host, trial }) — показ итога открытия, его зовёт zpOpen в screens/bag.js после выдачи; OV.co — окно поверх
   игры; ACT.coreveal (нажатие на сцену), ACT.coskip; раздел UI-кита «Открытие сундука» (KIT_EXTRA) — живая проба, раскадровка пяти
   моментов и готовность арта; кнопку «С анимацией» у пробного открытия раздела «Лутбоксы»; два сценария презентации.
   Своё состояние — S.co, заводится как S.bag в model.js.
   Где открываются сундуки: только в запасах (§14.4, §36.11) — «Ремесло → Запасы → Сундуки», по одному и пачкой. Дары путешествия,
   Входящие и добыча режимов кладут закрытые сундуки в запасы (§23.1) — открывают их там, этой же анимацией. UI-кит показывает ту же
   анимацию пробой: проба — не выдача.
   Сервер решает, клиент показывает. Итог выдаёт zpOpen (bag.js) одной операцией с номером: EnLoot.roll на сиде каждого сундука, прах
   за осколки пробуждённых героев, выдача через BAG — и только потом зовёт coShow. Анимация итог не меняет: закрыть окно, пропустить
   анимацию или нажимать на сцену — итог тот же и второй раз не выдаётся. Повтор номера операции zpOpen не выдаёт и не показывает.
   Режиссура (слова автора 29.09.2026: «анимация лутбокса очень деревянная»):
   1. Предвкушение: сундук падает, приземляется с пылью; из щели под крышкой бьёт свет, крышка подпрыгивает, дрожь нарастает. Свет
      поднимается по редкостям — от нижней ступени окна сундука до редкости самой ценной записи: уже решённый итог, показанный честно.
   2. Замок срывается и падает, крышка откидывается назад по-настоящему (3D, ось у задней кромки) — вспышка, столп света, лучи, искры.
   3. Записи поднимаются из сундука карточками рубашкой вверх, со шлейфом цвета редкости, встают по бокам и переворачиваются.
   4. Самая ценная — героический момент: вокруг темнеет, камера приближается, карточка медленно поднимается, висит и переворачивается
      со вспышкой своей редкости; с древней — кольца, золото и дрожь.
   5. Итог — одной сеткой. Нажатие на сцену переносит к следующему моменту: к замку, к самой ценной, к перевороту, к итогу.
   Пачка (×N и «Открыть все») — то же коротко: один сундук с «×N», свет до самой ценной записи пачки, фонтан искр цветов всех выпавших
   редкостей, одна карточка — самая ценная, затем сводка по редкостям.
   Анимация — CSS по времени: разметка рисуется из момента от начала показа (задержки --d…), поэтому перерисовка экрана посреди
   анимации её не рвёт. Движется только transform и opacity; частицы — EnFx (fx.js) в своём слое рядом с #game.
   Арт — сундук своего режима и своей редкости (слово автора 30.09.2026: «лутбоксы должны отличаться по виду от режима… генерить их
   более крупными размерами»): листы tools/art-gen/jobs/chest-sheets.json — на режим семь редкостей и свой замок, сундук около 1380 px
   исходника, в выгрузке 960 px; корпус и крышка — слои по шву (tools/art-gen/chest_layers.py sheets), CO_ART.sets. Пока лист режима
   не выгружен — прежний сундук вида (jobs/chests.json, CO_ART.chests), за ним — SVG и CSS-градиенты; битых картинок нет.
   Свет и цвет редкости по-прежнему дают токены --r1…--r7 (ADR-0027); рисунок редкости — материал, оковка и камень сундука.
   «Пропустить анимацию» — итог сразу; выбор помнит localStorage (en-co-skip), без него всё работает; при prefers-reduced-motion
   анимации нет. Числа вида — CO_VIEW, арт — CO_ART, демо сценариев — CO_DEMO. Служебное — только команде: TM из index.html.
   Автопроверка — tools/content-gen/screens/check_chest_open.js. */
'use strict';

/* ================== вид: числа анимации, не баланс ================== */
const CO_VIEW = {
  /* сцена: ширина и высота, земля — от низа; сундук-рисунок — px сцены на 1000 px исходника; ось крышки — у задней кромки, глубина
     сундука — ‰ высоты крышки: откинутая крышка встаёт позади во весь рост; перспектива — ‰ ширины крышки; замок — ширина, ‰ ширины
     крышки, и сколько % его высоты висит ниже шва; карточка и самая ценная [ш, в]; карточки по бокам сундука: зазор от сундука, между
     столбцами и рядами; верх самой ценной; монеты справа от сундука: зазор и шаг; столп света [ширина, высота], ‰ ширины крышки — px */
  geo: { w: 720, h: 356, ground: 34, scale: 228, depth: 1000, persp: 3000, lock: 190, lockDrop: 64, card: [84, 112], hero: [124, 166],
    side: 28, colGap: 14, rowGap: 14, heroTop: 14, coin: [18, 36], beam: [760, 1500],
    /* помост под сундуком (арт --cr-dais, screens/crafthall.js): ширина — ‰ ширины сундука; середина верха помоста — на земле */
    dais: 1560 },
  /* моменты, мс */
  drop: 460,                                      // сундук падает на место
  settle: 220,                                    // от приземления до первого света в щели
  charge: [560, 600, 640, 700, 760, 840, 920],    // первый свет держится — по редкости сундука
  step: 560,                                      // шаг света: свет в щели поднимается на редкость
  final: 560,                                     // последний свет: дрожь сильнее всего, крышка рвётся
  climb: 3,                                       // свет поднимается не больше чем на столько редкостей
  lockLead: 220, lock: 900, lockPop: 200,         // замок: рвётся за столько до крышки; срыв и падение; искры — через столько от начала
  lid: 900,                                       // крышка откидывается: удар, перелёт, покачивание
  first: 460, cardStep: 380,                      // от открытия до первой карточки; между карточками
  fly: 580, flip: 380,                            // карточка поднимается из сундука; переворот
  heroGap: 200,                                   // пауза перед самой ценной
  coin: 220, coinStep: 130,                       // монеты гарантированной валюты: после открытия и между монетами
  leak: 190,                                      // искры из щели в предвкушении — раз в столько мс
  trail: [20, 45, 70],                            // шлейф карточки: искры на таких % полёта
  tapGap: 40,                                     // нажатие ведёт к следующему моменту, до которого больше стольких мс
  hint: 1300,                                     // подсказка «нажмите — быстрее» появляется через столько мс
  /* самая ценная — по её редкости: подъём, висит рубашкой вверх, переворот, от переворота до итога — мс; приближение — ‰ сверх 1;
     затемнение вокруг — % */
  hero: {
    rise: [620, 680, 780, 900, 1020, 1120, 1220],
    hover: [140, 180, 260, 380, 500, 620, 760],
    flip: [420, 440, 480, 520, 560, 600, 640],
    hold: [760, 820, 900, 980, 1060, 1140, 1240],
    zoom: [0, 0, 40, 70, 90, 110, 130],
    dim: [0, 18, 32, 46, 56, 62, 68],
  },
  /* пачка: коротко — первый свет, шаг, последний свет, редкостей вверх; самая ценная: подъём, висит, переворот, до итога, мс */
  many: { charge: 360, step: 340, final: 320, climb: 2, rise: 620, hover: 220, flip: 460, hold: 900 },
  amp: [10, 12, 14, 17, 20, 24, 28],              // дрожь предвкушения к концу, десятые доли градуса — по редкости сундука
  lift: [4, 5, 6, 7, 8, 10, 12],                  // крышка подпрыгивает в предвкушении, градусы — по редкости сундука
  halo: [34, 42, 50, 60, 70, 80, 90],             // ореол за сундуком по редкости света, %
  ray: [0, 0, 0, 38, 50, 62, 74],                 // лучи после открытия — по редкости света, %
  beam: [42, 50, 58, 68, 78, 88, 96],             // столп света из сундука — по редкости света, %
  haze: [8, 9, 10, 12, 14, 16, 18],               // дымка вокруг — по редкости сундука, %
  rays: 4, rune: 4, gild: 5,                      // с какой редкости: лучи (свет), кольцо под сундуком (сундук), золотой отблеск (сундук)
  kitMany: 10,                                    // UI-кит: сундуков в пробной пачке
  /* UI-кит, раскадровка: предвкушение — такая доля последнего света, %; крышка — столько мс после открытия; карточки — такая доля
     переворота первой, %; самая ценная — столько мс после переворота; итог — столько мс после конца */
  board: { wait: 60, open: 200, card: 50, hero: 260, hold: 2000 },
  /* частицы EnFx. Искры, полосы и золото — [сколько, скорость, жизнь мс, размер]; кольца — [[радиус в % ширины крышки, мс, толщина,
     задержка мс]]; огоньки — [серий, шаг мс, сколько, скорость, жизнь мс, размер, подъём]; вспышка — [масштаб %, мс]; дрожь — [px, мс] */
  fx: {
    land: { dust: [14, 110, 900, 4], shake: [2, 200] },                 // приземление: пыль у углов, лёгкая дрожь
    step: { ring: [150, 620, 2], motes: [8, 70, 900, 4, 120] },         // шаг света: кольцо; огоньки [сколько, скорость, жизнь, размер, подъём]
    leak: [1, 30, 700, 3, 90],                                          // искра из щели: [сколько, скорость, жизнь, размер, подъём]
    lock: { sparks: [18, 200, 620, 3], shards: [9, 160, 900, 5] },      // замок сорвался
    open: [
      { sparks: [16, 170, 650, 4], streaks: [6, 220, 360, 2], flash: [120, 560] },
      { sparks: [22, 190, 720, 4], streaks: [10, 240, 400, 2], flash: [135, 600] },
      { sparks: [28, 210, 800, 5], streaks: [14, 260, 440, 2], flash: [150, 640] },
      { sparks: [36, 230, 900, 5], streaks: [18, 290, 480, 2], gold: [14, 220, 900, 4], flash: [170, 740] },
      { sparks: [44, 250, 1100, 6], streaks: [24, 330, 560, 3], gold: [26, 260, 1100, 5], rings: [[110, 700, 3, 0], [170, 950, 2, 140]], flash: [195, 860], shake: [3, 320] },
      { sparks: [52, 270, 1300, 6], streaks: [30, 360, 620, 3], gold: [38, 300, 1300, 6], rings: [[120, 760, 3, 0], [190, 1000, 2, 140], [90, 600, 2, 300]], motes: [5, 160, 9, 70, 1300, 4, 150], flash: [220, 960], shake: [4, 380] },
      { sparks: [60, 290, 1500, 7], streaks: [36, 400, 700, 3], gold: [52, 340, 1500, 7], rings: [[130, 820, 3, 0], [210, 1100, 2, 140], [100, 650, 2, 300]], motes: [7, 160, 10, 70, 1500, 4, 160], flash: [250, 1080], shake: [5, 420] },
    ],
    fountain: [6, 150, 1200, 5, 200],                                   // пачка: фонтан — на каждую выпавшую запись [сколько, скорость, жизнь, размер, подъём]
    launch: [8, 120, 420, 3],                                           // карточка вылетела из сундука
    trail: [3, 40, 520, 3],                                             // шлейф карточки
    card: [[10, 140, 520, 3], [12, 150, 560, 3], [14, 160, 600, 4], [18, 180, 680, 4], [22, 200, 760, 5], [26, 220, 840, 5], [30, 240, 920, 6]],   // переворот — по редкости карточки
    cardRing: [3, 120, 520, 2],                                         // кольцо переворота: с какой редкости, радиус % ширины карточки, мс, толщина
    /* самая ценная: огоньки вокруг сундука, пока поднимается; при перевороте — полосы, кольца с redFrom, золото с goldFrom, дрожь с shakeFrom */
    hero: { motes: [4, 180, 8, 60, 1200, 4, 140], streaks: [20, 280, 520, 2], ringFrom: 4, rings: [[130, 760, 3, 0], [220, 1000, 2, 160]], goldFrom: 5, gold: [30, 280, 1100, 5], shakeFrom: 5, shake: [4, 360] },
  },
};

/* ================== арт ==================
   tools/art-gen/jobs/chests.json → tools/art-gen/chest_layers.py → выгрузка export_ui.py в assets/art/chests/. ready — выгруженные
   пути: отмечаются после выгрузки. Пока пути нет — прежний SVG и CSS-градиенты. Сундук берёт рисунок, только когда выгружены оба слоя.
   chests — рамка сундука [x, y, ш, в], шов, крышка и корпус [x, y, ш, в] в px исходника 1200 × 896 (вывод chest_layers.py);
   svg — то же у заглушки SVG, с её масштабом ‰; lock — размер замка в исходнике; fx — текстуры света.
   sets — листы режимов (jobs/chest-sheets.json → chest_layers.py sheets и spec): у вида — семь редкостей рисунком и свой замок.
   scale — px сцены на 1000 px исходника листа (сундук в сцене — как прежний, около 236 px); lock — размер замка режима; by — по
   редкостям рамка, шов, крышка и корпус в px вырезанного сундука. Пути — chests/<вид>/r<редкость>-body.webp, -lid.webp, плитка
   запасов и наград r<редкость>.webp (тот же рисунок, уменьшенный), замок lock.webp */
const CO_ART = {
  ready: ['chests/shards-body.png', 'chests/shards-lid.png', 'chests/keys-body.png', 'chests/keys-lid.png', 'chests/equip-body.png',
    'chests/equip-lid.png', 'chests/talisman-body.png', 'chests/talisman-lid.png', 'chests/workers-body.png', 'chests/workers-lid.png',
    'chests/craft-body.png', 'chests/craft-lid.png', 'chests/wander-body.png', 'chests/wander-lid.png', 'chests/lock.png',
    'chests/fx-rays.png', 'chests/fx-flash.png', 'chests/fx-ring.png', 'chests/fx-haze.png', 'chests/fx-beam.png', 'chests/fx-dust.png',   // выгрузка 29.09.2026
    ...['shards', 'keys', 'equip', 'talisman', 'workers', 'craft', 'wander'].flatMap(b => [1, 2, 3, 4, 5, 6, 7].flatMap(r => [`chests/${b}/r${r}-body.webp`, `chests/${b}/r${r}-lid.webp`, `chests/${b}/r${r}.webp`]).concat(`chests/${b}/lock.webp`))],   // листы режимов, 01.10.2026; шкатулка духа и каменный сундук руин — после пополнения API
  sets: {
    shards: { scale: 171, lock: [774, 1132], by: [
      { frame: [0, 0, 1379, 1120], seam: 615, lid: [0, 0, 1379, 617], body: [2, 613, 1376, 507] },
      { frame: [0, 0, 1378, 1123], seam: 617, lid: [0, 0, 1378, 619], body: [3, 615, 1375, 508] },
      { frame: [0, 0, 1379, 1230], seam: 724, lid: [0, 0, 1379, 726], body: [2, 722, 1376, 508] },
      { frame: [0, 0, 1379, 1217], seam: 710, lid: [0, 0, 1379, 712], body: [3, 708, 1376, 509] },
      { frame: [0, 0, 1381, 1145], seam: 631, lid: [0, 0, 1381, 633], body: [4, 629, 1377, 516] },
      { frame: [0, 0, 1381, 1224], seam: 715, lid: [0, 0, 1381, 717], body: [4, 713, 1377, 511] },
      { frame: [0, 0, 1380, 1293], seam: 790, lid: [0, 0, 1380, 792], body: [5, 788, 1374, 505] }] },
    keys: { scale: 161, lock: [866, 1168], by: [
      { frame: [0, 0, 1474, 1116], seam: 543, lid: [0, 0, 1474, 545], body: [7, 541, 1467, 575] },
      { frame: [0, 0, 1461, 1114], seam: 542, lid: [0, 0, 1461, 544], body: [8, 540, 1447, 574] },
      { frame: [0, 0, 1460, 1114], seam: 543, lid: [0, 0, 1460, 545], body: [8, 541, 1445, 573] },
      { frame: [0, 0, 1466, 1115], seam: 544, lid: [0, 0, 1466, 546], body: [8, 542, 1451, 573] },
      { frame: [0, 0, 1468, 1124], seam: 544, lid: [0, 0, 1468, 546], body: [0, 542, 1462, 582] },
      { frame: [0, 0, 1471, 1243], seam: 667, lid: [0, 0, 1471, 669], body: [0, 665, 1466, 578] },
      { frame: [0, 0, 1471, 1124], seam: 544, lid: [0, 0, 1471, 546], body: [0, 542, 1466, 582] }] },
    equip: { scale: 165, lock: [832, 1138], by: [
      { frame: [0, 0, 1432, 1080], seam: 521, lid: [0, 0, 1432, 523], body: [10, 519, 1411, 561] },
      { frame: [0, 0, 1426, 1079], seam: 520, lid: [0, 0, 1426, 522], body: [9, 518, 1407, 561] },
      { frame: [0, 0, 1426, 1080], seam: 521, lid: [0, 0, 1426, 523], body: [11, 519, 1406, 561] },
      { frame: [0, 0, 1417, 1079], seam: 521, lid: [0, 0, 1417, 523], body: [7, 519, 1400, 560] },
      { frame: [0, 0, 1431, 1108], seam: 539, lid: [0, 0, 1431, 541], body: [15, 537, 1405, 571] },
      { frame: [0, 0, 1443, 1108], seam: 539, lid: [0, 0, 1443, 541], body: [22, 537, 1408, 571] },
      { frame: [0, 0, 1444, 1108], seam: 538, lid: [0, 0, 1444, 540], body: [14, 536, 1415, 572] }] },
    talisman: { scale: 174, lock: [796, 1129], by: [
      { frame: [0, 0, 1354, 1090], seam: 498, lid: [0, 0, 1354, 500], body: [1, 496, 1353, 594] },
      { frame: [0, 0, 1355, 1089], seam: 500, lid: [0, 0, 1355, 502], body: [0, 498, 1350, 591] },
      { frame: [0, 0, 1357, 1089], seam: 499, lid: [1, 0, 1356, 501], body: [0, 497, 1357, 592] },
      { frame: [0, 0, 1355, 1090], seam: 502, lid: [0, 0, 1355, 504], body: [1, 500, 1348, 590] },
      { frame: [0, 0, 1374, 1100], seam: 510, lid: [0, 0, 1374, 512], body: [1, 508, 1373, 592] },
      { frame: [0, 0, 1374, 1101], seam: 510, lid: [0, 0, 1374, 512], body: [1, 508, 1373, 593] },
      { frame: [0, 0, 1371, 1101], seam: 514, lid: [0, 0, 1371, 516], body: [5, 512, 1366, 589] }] },
    workers: { scale: 160, lock: [782, 1165], by: [
      { frame: [0, 0, 1473, 1072], seam: 389, lid: [70, 0, 1333, 391], body: [0, 387, 1473, 685] },
      { frame: [0, 0, 1474, 1072], seam: 387, lid: [71, 0, 1331, 389], body: [0, 385, 1474, 687] },
      { frame: [0, 0, 1473, 1079], seam: 396, lid: [70, 0, 1332, 398], body: [0, 394, 1473, 685] },
      { frame: [0, 0, 1465, 1072], seam: 385, lid: [72, 0, 1320, 387], body: [0, 383, 1465, 689] },
      { frame: [0, 0, 1475, 1063], seam: 382, lid: [73, 0, 1330, 384], body: [0, 380, 1475, 683] },
      { frame: [0, 0, 1475, 1063], seam: 379, lid: [73, 0, 1329, 381], body: [0, 377, 1475, 686] },
      { frame: [0, 0, 1486, 1064], seam: 382, lid: [81, 0, 1332, 384], body: [0, 380, 1486, 684] }] },
    craft: { scale: 163, lock: [873, 1218], by: [
      { frame: [0, 0, 1479, 1096], seam: 514, lid: [0, 0, 1478, 516], body: [7, 512, 1472, 584] },
      { frame: [0, 0, 1444, 1097], seam: 515, lid: [0, 0, 1443, 517], body: [0, 513, 1444, 584] },
      { frame: [0, 0, 1441, 1097], seam: 515, lid: [0, 0, 1440, 517], body: [5, 513, 1436, 584] },
      { frame: [0, 0, 1443, 1096], seam: 516, lid: [0, 0, 1443, 518], body: [8, 514, 1435, 582] },
      { frame: [0, 0, 1465, 1130], seam: 531, lid: [0, 0, 1465, 533], body: [9, 529, 1451, 601] },
      { frame: [0, 0, 1459, 1126], seam: 518, lid: [0, 0, 1459, 520], body: [0, 516, 1454, 610] },
      { frame: [0, 0, 1451, 1130], seam: 532, lid: [0, 0, 1451, 534], body: [9, 530, 1442, 600] }] },
    wander: { scale: 165, lock: [775, 1102], by: [
      { frame: [0, 0, 1438, 1112], seam: 554, lid: [0, 0, 1438, 556], body: [2, 552, 1435, 560] },
      { frame: [0, 0, 1433, 1113], seam: 554, lid: [0, 0, 1433, 556], body: [1, 552, 1429, 561] },
      { frame: [0, 0, 1434, 1113], seam: 554, lid: [0, 0, 1434, 556], body: [3, 552, 1429, 561] },
      { frame: [0, 0, 1438, 1113], seam: 554, lid: [0, 0, 1438, 556], body: [3, 552, 1432, 561] },
      { frame: [0, 0, 1419, 1062], seam: 530, lid: [0, 0, 1419, 532], body: [1, 528, 1417, 534] },
      { frame: [0, 0, 1422, 1110], seam: 576, lid: [0, 0, 1422, 578], body: [2, 574, 1417, 536] },
      { frame: [0, 0, 1406, 1064], seam: 534, lid: [0, 0, 1406, 536], body: [2, 532, 1403, 532] }] },
  },
  chests: {
    shards: { frame: [85, 47, 1030, 778], seam: 460, lid: [86, 47, 1027, 415], body: [85, 458, 1030, 367] },
    keys: { frame: [95, 88, 1009, 742], seam: 446, lid: [95, 88, 1009, 360], body: [99, 444, 1000, 386] },
    equip: { frame: [72, 82, 1057, 745], seam: 444, lid: [72, 82, 1057, 364], body: [84, 442, 1032, 385] },
    talisman: { frame: [112, 98, 976, 747], seam: 450, lid: [112, 98, 976, 354], body: [118, 448, 963, 397] },
    workers: { frame: [46, 84, 1102, 748], seam: 353, lid: [104, 84, 992, 271], body: [46, 351, 1102, 481] },
    craft: { frame: [79, 86, 1041, 730], seam: 429, lid: [79, 86, 1041, 345], body: [84, 427, 1033, 389] },
    wander: { frame: [106, 94, 988, 711], seam: 453, lid: [106, 94, 988, 361], body: [108, 451, 984, 354] },
  },
  svg: { scale: 1500, frame: [22, 32, 156, 124], seam: 88, lid: [22, 32, 156, 58], body: [22, 86, 156, 70] },
  lock: [738, 899],
  fx: ['rays', 'flash', 'ring', 'haze', 'beam', 'dust'],
};
/* сундук своего вида у заглушки SVG: материал и оковка; эмблема — значок вида из LB_IC (index.html). Цвета вида, не баланс */
const CO_KINDS = {
  shards: { n: 'Осколки', ic: 'users', wood: '#28303c', wood2: '#161b23', metal: '#9aa6b6', metal2: '#56606c' },     // реликварий Эхо: тёмный камень и серебро
  keys: { n: 'Ключи', ic: 'key', wood: '#373c42', wood2: '#1f2327', metal: '#b48a4f', metal2: '#6d5230' },          // окованный ларь: железо и бронза
  equip: { n: 'Снаряжение', ic: 'shield', wood: '#5a3526', wood2: '#35201a', metal: '#8e969d', metal2: '#565c61' },  // оружейный ящик: дуб и сталь
  talisman: { n: 'Талисманы', ic: 'gem', wood: '#2e2238', wood2: '#1a1322', metal: '#cfae6a', metal2: '#7b6437' },   // шкатулка: лак и золото
  workers: { n: 'Рабочие', ic: 'gear', wood: '#6a5137', wood2: '#46341f', metal: '#6f6c66', metal2: '#44423e' },     // рабочий короб: светлое дерево и железо
  craft: { n: 'Крафт', ic: 'crown', wood: '#48483f', wood2: '#2c2c27', metal: '#7f8b7c', metal2: '#4d564b' },        // каменный сундук руин
  wander: { n: 'Странник', ic: 'star', wood: '#4c3423', wood2: '#2e1f15', metal: '#c09858', metal2: '#735a33' },     // дорожный сундук: кожа и латунь
};
const CO_GOLD = ['#e3c27c', '#8e6b35'];            // золотая оковка заглушки SVG с редкости CO_VIEW.gild: светлая и тёмная
/* сценарии презентации: какой сундук кладётся в запасы и сколько — демо, не выдача режима */
const CO_DEMO = {
  one: { box: 'talisman', r: 6, cyc: 3, win: 'step', src: 'Клановый босс · доля клана', count: 1 },
  many: { box: 'shards', r: 4, cyc: 3, win: 'step', week: 'Эльфы', src: 'Эхо · личная планка', count: 10 },
};
/* ценность вида записи при равной редкости: кто вылетает позже и стоит выше в итоге */
const CO_KIND_W = { shard: 6, tal: 5, equip: 4, wshard: 3, item: 2, cur: 1 };

/* ================== помощники ================== */
const CO_KEY = 'en-co-skip';   // localStorage: «Пропустить анимацию» у сундуков — свой выбор, не общий с рулеткой
const coSaved = () => { try { return localStorage.getItem(CO_KEY) === '1'; } catch (_) { return false; } };
const coReduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } };
const coSkipOn = () => !!(S.co && S.co.skip) || coReduced();
const coNow = () => { try { return Math.round(performance.now()); } catch (_) { return 0; } };
const coVal = c => c.r * 10 + (CO_KIND_W[c.kind] || 0);
const coChests = n => `${fmt(n)} ${plural(n, 'сундук', 'сундука', 'сундуков')}`;
const coCurName = k => (LBX && LBX.currencies[k]) || (CUR[k] ? CUR[k].n : k);
const coBoxName = cs => LBX && cs && LBX.boxes[cs.box] ? lbBoxName(cs.box, cs.r, cs.win) : 'Сундук';
const coNextOp = () => 'zo' + ((typeof zpV === 'function' && zpV().op) || 1);   // номер следующей операции открытия: его несут кнопки
/* цвет редкости — из токенов --r1…--r7 (ADR-0027) */
const coColor = r => { try { return getComputedStyle(document.documentElement).getPropertyValue('--r' + r).trim() || EnFx.COL.gold; } catch (_) { return '#ddbc7a'; } };
const coPct = (a, k) => Math.round(a * k / 100);

/* арт: выгружен ли путь; полный адрес для CSS — url() из переменной браузер разрешает от файла стилей, где её подставили */
const coArtOk = p => CO_ART.ready.includes(p);
const coAbs = p => { const u = AV(p); try { return new URL(u, document.baseURI).href; } catch (_) { return u; } };
/* текстура света: класс и переменная --tex, если выгружена; иначе пусто — элемент рисует CSS-градиент */
function coTex(n) {
  const p = `chests/fx-${n}.png`;
  return coArtOk(p) ? { cls: ' co-tex', st: `--tex:url('${coAbs(p)}')` } : { cls: '', st: '' };
}
/* пути листа режима: корпус, крышка, плитка сундука редкости r; замок режима */
const coSetPath = (box, r, part) => `chests/${box}/r${r}${part ? '-' + part : ''}.webp`;
const coSetLock = box => `chests/${box}/lock.webp`;
/* замок сундука: замок режима, если выгружен лист; иначе общий. p — путь (null — заглушка SVG), px — размер в исходнике */
function coLockOf(box) {
  const S = CO_ART.sets[box];
  if (S && coArtOk(coSetLock(box))) return { p: coSetLock(box), px: S.lock };
  return { p: coArtOk('chests/lock.png') ? 'chests/lock.png' : null, px: CO_ART.lock };
}
/* сундук рисунком — если выгружены оба слоя: лист режима своей редкости, иначе прежний сундук вида */
function coChestArt(box, r) {
  const S = CO_ART.sets[box], g = S && S.by[(r || 1) - 1];
  if (g) {
    const b = coSetPath(box, r, 'body'), l = coSetPath(box, r, 'lid');
    if (coArtOk(b) && coArtOk(l)) return { g, s: S.scale, set: true, body: AV(b), lid: AV(l), bodyAbs: coAbs(b), lidAbs: coAbs(l) };
  }
  const G = CO_ART.chests[box], b = `chests/${box}-body.png`, l = `chests/${box}-lid.png`;
  return G && coArtOk(b) && coArtOk(l) ? { g: G, s: CO_VIEW.geo.scale, set: false, body: AV(b), lid: AV(l), bodyAbs: coAbs(b), lidAbs: coAbs(l) } : null;
}
/* раскладка сундука в px сцены: рамка, шов, крышка и корпус [x, y, ш, в], середина по крышке, глубина, перспектива, замок */
function coChestGeo(box, r) {
  const A = coChestArt(box, r), G = A ? A.g : CO_ART.svg, s = A ? A.s : CO_ART.svg.scale, V = CO_VIEW.geo, K = coLockOf(box).px;
  const px = v => Math.round(v * s / 1000), [fx, fy, fw, fh] = G.frame;
  const part = ([x, y, w, h]) => [px(x - fx), px(y - fy), px(w), px(h)];
  const lid = part(G.lid), body = part(G.body), seam = px(G.seam - fy), inner = Math.min(lid[2], body[2]);
  const cx = lid[0] + Math.round(lid[2] / 2), lw = Math.round(inner * V.lock / 1000), lh = Math.round(lw * K[1] / K[0]);
  return { A, w: px(fw), h: px(fh), seam, lid, body, inner, cx, depth: Math.round(lid[3] * V.depth / 1000), persp: Math.round(inner * V.persp / 1000),
    lock: [cx - Math.round(lw / 2), seam - lh + coPct(lh, V.lockDrop), lw, lh] };
}
/* картинки сундука и текстуры — заранее, чтобы к падению сундука они были готовы */
const CO_PRE = new Set();
function coPreload(box, r) {
  const A = coChestArt(box, r), L = coLockOf(box).p;
  const list = (A ? [A.body, A.lid] : []).concat(L ? [AV(L)] : [], CO_ART.fx.filter(n => coArtOk(`chests/fx-${n}.png`)).map(n => AV(`chests/fx-${n}.png`)));
  for (const u of list) if (!CO_PRE.has(u)) { CO_PRE.add(u); try { const im = new Image(); im.decoding = 'async'; im.src = u; } catch (_) { } }
}

/* одна выпавшая запись — для карточки и плитки: значок, имя, количество, редкость — выпавшая из окна сундука */
function coView(it) {
  const k = it.kind, o = { kind: k, id: it.id, r: it.r, q: it.q, dust: it.dust || 0, face: false, name: '', hn: '', icon: '', tip: '' };
  if (k === 'shard') {
    const h = RSI[it.id], n = h ? h.n : LBX && LBX.heroInfo[it.id] ? LBX.heroInfo[it.id].n : 'Герой';
    /* осколки — стекло с лицом героя и долей собранного (shardGhost, screens/art-icons.js); ушли в прах — портрет пробуждённого */
    const g = h && !o.dust && typeof shardGhost === 'function' ? shardGhost(h, S.rs.shards[it.id] || 0, RS.rules.stub.shards, 96) : '';
    o.face = !!h && !g; o.glass = !!g; o.icon = g || (h ? rsFace(h) : ic('users')); o.hn = n; o.name = o.dust ? `${n} → прах` : n;
    o.tip = o.dust ? `${n} уже пробуждён: осколки ×${fmt(it.q)} → прах +${fmt(o.dust)}` : `Осколки героя: ${n} ×${fmt(it.q)}`;
  } else if (k === 'item') {
    const x = BAG.item(it.id);
    o.icon = !x ? ic('gem') : x.team ? (typeof resHideIco === 'function' ? resHideIco(64) : ic('lock')) : trIcon(x); o.name = x ? zpName(x) : 'Предмет'; o.tip = `${o.name} ×${fmt(it.q)}`;
  } else if (k === 'cur') {
    o.icon = `<img src="${curImg(it.id)}" alt="">`; o.name = coCurName(it.id); o.tip = `${o.name} ×${fmt(it.q)}`;
  } else {   // tal, wshard, equip — «из сундуков» в запасах; спойлеры в именах талисманов прячет zpExtraName
    const xk = k === 'tal' ? 'tal' : k === 'wshard' ? 'wsh' : 'eq';
    o.icon = (typeof zpExtraArt === 'function' && zpExtraArt(xk, it.id, 64)) || ic(ZP_EXTRA_IC[xk] || 'gem'); o.name = zpExtraName(xk, it.id, it.r); o.tip = `${o.name} ×${fmt(it.q)}`;
    /* снаряжение: предмет, который создал сервер при открытии (screens/equipment.js) — его слот и главная строка */
    const v = k === 'equip' && typeof eqView === 'function' ? eqView(it) : null;
    if (v) { o.icon = v.icon; o.name = v.name; o.tip = v.tip; }
  }
  return o;
}
/* записи итога по сундукам: журнал zpOpenOne (sum.log); без журнала — из сумм итога одним сундуком */
function coLog(last) {
  const s = last.sum || {};
  if (Array.isArray(s.log) && s.log.length) return s.log;
  const items = [], cur = Object.entries(s.cur || {});
  for (const [id, q] of Object.entries(s.items || {})) { const x = BAG.item(id); items.push({ kind: 'item', id, q, r: x ? x.r : 1 }); }
  for (const [id, q] of Object.entries(s.shards || {})) items.push({ kind: 'shard', id, q, r: RSI[id] ? RSI[id].r : 1 });
  for (const [id, d] of Object.entries(s.dust || {})) items.push({ kind: 'shard', id, q: (s.dustQ || {})[id] || 0, dust: d, r: RSI[id] ? RSI[id].r : 1 });
  for (const [key, q] of Object.entries(s.extra || {})) { const [xk, id, r] = key.split(':'); items.push({ kind: xk === 'tal' ? 'tal' : xk === 'wsh' ? 'wshard' : 'equip', id, q, r: +r || 1 }); }
  return [{ cur, items }];
}

/* ================== показ ==================
   R — один показ: host — 'game' (окно поверх игры) или 'kit' (сцена раздела UI-кита); phase — 'anim', 'res' (итог) или 'idle' (сундук
   раздела до пробы); items — все выпавшие записи, cards — что вылетает карточками (последняя — самая ценная), cur — гарантированная
   валюта; b — редкость самой ценной, climb — ступени света от нижней ступени окна до b; T — моменты от начала, мс */
let coSeq = 0;
/* нижняя ступень окна сундука: с неё свет начинает подниматься */
function coWinMin(cs) {
  try { const w = EnLoot.windowOf(LBX, cs.win || 'step', cs.r).filter(x => x[1] > 0).map(x => x[0]); return w.length ? Math.min(...w) : cs.r; } catch (_) { return cs.r; }
}
function coClimb(R) {
  const up = R.n > 1 ? CO_VIEW.many.climb : CO_VIEW.climb, from = Math.min(R.b, Math.max(coWinMin(R.cs), R.b - up)), out = [];
  for (let x = from; x <= R.b; x++) out.push(x);
  return out;
}
function coRun(last, host, o) {
  const log = coLog(last), cs = last.cs, items = [], cur = {};
  log.forEach((L, ci) => {
    for (const [k, a] of L.cur || []) cur[k] = (cur[k] || 0) + a;
    (L.items || []).forEach((it, i) => items.push(Object.assign(coView(it), { ci, i })));
  });
  const n = (last.sum && last.sum.n) || log.length;
  const sorted = items.slice().sort((a, b) => coVal(a) - coVal(b) || a.ci - b.ci || a.i - b.i);
  const R = { id: ++coSeq, host, key: last.key || '', op: last.op || '', cs, box: cs.box, r: cs.r, n, items, cur, cards: n > 1 ? sorted.slice(-1) : sorted,
    trial: !!o.trial, phase: 'anim', t0: coNow(), tr: null, timers: [] };
  R.b = R.cards.length ? R.cards[R.cards.length - 1].r : R.r;
  R.climb = coClimb(R);
  R.T = coTimes(R);
  return R;
}
/* самая ценная: подъём, висит, переворот, до итога; приближение и затемнение — по её редкости; у пачки — коротко */
function coHero(R) {
  const H = CO_VIEW.hero, M = CO_VIEW.many, i = R.b - 1;
  if (R.n > 1) return { rise: M.rise, hover: M.hover, flip: M.flip, hold: M.hold, zoom: H.zoom[i], dim: H.dim[i] };
  return { rise: H.rise[i], hover: H.hover[i], flip: H.flip[i], hold: H.hold[i], zoom: H.zoom[i], dim: H.dim[i] };
}
/* моменты от начала, мс: приземление, ступени света lv, замок, крышка, вылет каждой карточки (последняя — самая ценная), самая ценная:
   подъём, висит, переворот, открыта; итог. beats — куда ведёт нажатие на сцену */
function coTimes(R) {
  const V = CO_VIEW, M = V.many, many = R.n > 1, land = V.drop, climb0 = land + V.settle;
  const charge = many ? M.charge : V.charge[R.r - 1] || V.charge[0], step = many ? M.step : V.step, fin = many ? M.final : V.final;
  const s = R.climb.length - 1, lv = R.climb.map((x, k) => k ? climb0 + charge + (k - 1) * step : climb0);
  const open = s ? lv[s] + fin : climb0 + charge, lock = open - V.lockLead;
  const reg = Math.max(0, R.cards.length - 1), cards = [];
  let t = open + V.first;
  for (let i = 0; i < reg; i++) { cards.push(t); t += V.cardStep; }
  const H = coHero(R), start = reg ? cards[reg - 1] + V.fly + V.flip + V.heroGap : open + V.first;
  if (R.cards.length) cards.push(start);
  const hover = start + H.rise, flip = hover + H.hover, shown = flip + H.flip, end = shown + H.hold;
  return { land, climb0, lv, open, lock, cards, H, hero: { start, hover, flip, shown }, end, beats: [lock, start, flip, end] };
}
const coCur = host => host === 'kit' ? CO_KIT.run : S.co ? S.co.run : null;
const coLive = R => !!R && R.phase === 'anim' && coCur(R.host) === R;
function coStop(R) { if (!R) return; for (const t of R.timers) clearTimeout(t); R.timers = []; }
function coPaint(R) { if (R.host === 'kit') coKitPaint(); else render(); }
/* показ итога: одна функция на все места. last — { key, cs, sum: { n, log }, op } от zpOpen или пробы UI-кита */
function coShow(last, o = {}) {
  if (!last || !last.cs || !LBX) return null;
  const host = o.host === 'kit' ? 'kit' : 'game';
  coStop(coCur(host));
  const R = coRun(last, host, o);
  coPreload(R.box, R.r);
  if (host === 'kit') CO_KIT.run = R; else { S.co.run = R; S.overlay = { t: 'co', arg: String(R.id) }; }
  if (coSkipOn()) { R.phase = 'res'; R.tr = R.t0; } else coSchedule(R);
  coPaint(R);
  if (R.phase === 'res') coFocus(R);
  return R;
}
/* таймеры показа от текущего момента: частицы, итог. Каждый проверяет, что показ ещё идёт; прошедшие моменты не повторяются */
function coSchedule(R) {
  const T = R.T, V = CO_VIEW, e = coNow() - R.t0;
  const at = (ms, f) => { if (ms < e) return; R.timers.push(setTimeout(() => { if (coLive(R)) { try { f(); } catch (_) { } } }, Math.max(0, ms - e))); };
  at(T.land, () => coBurstLand(R));
  T.lv.forEach((t, k) => { if (k) at(t, () => coBurstStep(R, k)); });
  for (let t = T.climb0 + V.leak; t < T.lock; t += V.leak) { const tt = t; at(tt, () => coBurstLeak(R, tt)); }
  at(T.lock + V.lockPop, () => coBurstLock(R));
  at(T.open, () => coBurstOpen(R));
  const last = R.cards.length - 1;
  R.cards.forEach((c, i) => {
    if (i < last) {
      at(T.cards[i], () => coBurstLaunch(R, i));
      for (const k of V.trail) at(T.cards[i] + coPct(V.fly, k), () => coBurstTrail(R, i));
      at(T.cards[i] + V.fly + Math.round(V.flip / 2), () => coBurstCard(R, i));
    } else {
      at(T.hero.start, () => coBurstRise(R));
      at(T.hero.flip + Math.round(T.H.flip / 2), () => coBurstHero(R));
    }
  });
  at(T.end, () => coReveal(R));
}
/* итог: после анимации, сразу при «Пропустить анимацию», после последнего нажатия на сцену или если галочку поставили посреди анимации */
function coReveal(R) {
  if (!coLive(R)) return;
  coStop(R); R.phase = 'res'; R.tr = coNow();
  coPaint(R); coFocus(R);
}
/* нажатие на сцену посреди анимации — к следующему моменту: замок, самая ценная, её переворот; после — итог.
   Время показа сдвигается, разметка рисуется из нового момента, частицы прошедших моментов не повторяются */
function coTap(R) {
  if (!coLive(R)) return;
  const e = coNow() - R.t0, next = R.T.beats.find(b => b > e + CO_VIEW.tapGap);
  if (next == null || next >= R.T.end) { coReveal(R); return; }
  coStop(R); R.t0 = coNow() - next; coSchedule(R); coPaint(R);
}
function coFocus(R) {
  if (R.host !== 'game') return;
  try { requestAnimationFrame(() => { const b = document.querySelector('#game .co-res .co-main'); if (b) b.focus({ preventScroll: true }); }); } catch (_) { }
}
/* одна строка об итоге: когда окно закрыли посреди анимации — выдача уже сделана */
const coSay = R => `${R.n > 1 ? `Открыто: ${coChests(R.n)}` : 'Сундук открыт'} — всё в запасах`;
/* после каждой перерисовки: окно закрыли — показ остановлен; закрыли посреди анимации — итог приходит сообщением */
function coSync() {
  const R = S.co && S.co.run; if (!R) return;
  if (S.overlay && S.overlay.t === 'co') return;
  coStop(R); S.co.run = null;
  if (R.phase === 'anim') setTimeout(() => toast(coSay(R), CHEST), 0);
}
window.addEventListener('en-render', coSync);

/* ================== частицы: слой рядом с #game — перерисовка экрана его не сносит; у UI-кита — свой слой в сцене ================== */
const CO_FXI = { game: null, kit: null };
function coRoot(R) { return document.getElementById(R.host === 'kit' ? 'coKit' : 'game'); }
function coFxHost(host) {
  if (host === 'kit') { const k = document.getElementById('coKit'); return k && k.querySelector ? k.querySelector(':scope > .co-fxl') : null; }
  const g = document.getElementById('game'), p = g && g.parentElement;
  if (!p || !p.querySelector) return null;
  let L = p.querySelector(':scope > .co-fxl');
  if (!L) { L = document.createElement('div'); L.className = 'co-fxl'; L.setAttribute('aria-hidden', 'true'); p.appendChild(L); }
  return L;
}
function coFx(host) {
  if (!window.EnFx) return null;
  const L = coFxHost(host); if (!L) return null;
  let I = CO_FXI[host];
  if (!I || I.host !== L) { if (I) I.destroy(); I = CO_FXI[host] = EnFx.create(L); }
  return I;
}
const coEl = (R, sel) => { const root = coRoot(R); return root && root.querySelector ? root.querySelector(`[data-co-run="${R.id}"] ${sel}`) : null; };
/* что нужно почти каждой вспышке: слой частиц, середина щели, ширина крышки */
function coAt(R) {
  const fx = coFx(R.host), pt = coEl(R, '.co-mpt'), lid = coEl(R, '.co-lidf');
  if (!fx || !pt) return null;
  const m = fx.center(pt);
  return { fx, x: m.x, y: m.y, w: lid ? fx.center(lid).w : 160, C: EnFx.COL };
}
const coLvAt = (R, t) => { let k = 0; R.T.lv.forEach((x, i) => { if (x <= t) k = i; }); return R.climb[k]; };
/* огоньки, что поднимаются: серия из n всплесков с подъёмом */
function coMotes(R, fx, x, y, col, [n, step, k, sp, life, size, up]) {
  for (let i = 0; i < n; i++) setTimeout(() => { if (coLive(R)) fx.burst(x, y, i % 2 ? EnFx.COL.gold : col, k, sp, life, size, { ay: -up, drag: 1, fade: 'in' }); }, i * step);
}
/* приземление: пыль у углов сундука, лёгкая дрожь */
function coBurstLand(R) {
  const a = coAt(R), ch = coEl(R, '.co-chest'); if (!a || !ch) return;
  const b = a.fx.center(ch), F = CO_VIEW.fx.land, y = b.y + b.h / 2 - 4;
  for (const x of [b.x - b.w / 2 + 10, b.x + b.w / 2 - 10]) a.fx.burst(x, y, EnFx.COL.dust, ...F.dust, { ay: 60, blend: 'normal', fade: 'in' });
  a.fx.shake(...F.shake);
}
/* свет поднялся на ступень: кольцо и огоньки цвета новой редкости */
function coBurstStep(R, k) {
  const a = coAt(R); if (!a) return;
  const F = CO_VIEW.fx.step, c = coColor(R.climb[k]), [n, sp, life, size, up] = F.motes;
  a.fx.ring(a.x, a.y, c, a.w * F.ring[0] / 100, F.ring[1], F.ring[2]);
  a.fx.burst(a.x, a.y, c, n + k * 2, sp, life, size, { ay: -up, drag: 1, fade: 'in' });
}
/* искра из щели: цвета текущей ступени света, к открытию — чаще; место по щели — от момента, без случайности */
function coBurstLeak(R, t) {
  const a = coAt(R); if (!a) return;
  const [n, sp, life, size, up] = CO_VIEW.fx.leak, span = Math.max(1, R.T.lock - R.T.climb0), k = Math.floor((t - R.T.climb0) * 3 / span);
  const x = a.x + ((t * 7919 % 1000) - 500) * a.w * 4 / 5000;
  a.fx.burst(x, a.y, coColor(coLvAt(R, t)), n + k, sp, life, size, { ay: -up, drag: 1, fade: 'in' });
}
/* замок сорвался: искры и обломки */
function coBurstLock(R) {
  const fx = coFx(R.host), el = coEl(R, '.co-lock'); if (!fx || !el) return;
  const b = fx.center(el), F = CO_VIEW.fx.lock, C = EnFx.COL;
  fx.burst(b.x, b.y, C.gold, ...F.sparks, { shape: 'streak', w: 1.3 });
  fx.burst(b.x, b.y, '#8d8f93', ...F.shards, { shape: 'shard', blend: 'normal', vr: 7, ay: 260 });
}
/* крышка откинулась: всплеск цвета самой ценной, полосы света, с эпической — золото, с древней — кольца, огоньки и дрожь. Пачка — фонтан
   искр цветов всех выпавших редкостей */
function coBurstOpen(R) {
  const a = coAt(R); if (!a) return;
  const P = CO_VIEW.fx.open[R.b - 1], C = a.C, c = coColor(R.b), { fx, x, y, w } = a;
  fx.burst(x, y, c, ...P.sparks);
  fx.burst(x, y, C.steel, ...P.streaks, { shape: 'streak', w: 1.4 });
  if (P.gold) fx.burst(x, y, C.gold, ...P.gold);
  for (const [k, ms, th, d] of P.rings || []) setTimeout(() => { if (coLive(R)) fx.ring(x, y, c, w * k / 100, ms, th); }, d);
  if (P.motes) coMotes(R, fx, x, y, c, P.motes);
  if (P.shake) fx.shake(...P.shake);
  if (R.n > 1) {
    const by = {}; R.items.forEach(it => { by[it.r] = (by[it.r] || 0) + 1; });
    const [k, sp, life, size, up] = CO_VIEW.fx.fountain;
    for (const [r, q] of Object.entries(by)) fx.burst(x, y, coColor(+r), Math.min(60, k * q), sp, life, size, { ay: -up, drag: 1.2 });
  }
}
/* карточка вылетела из сундука; её шлейф; переворот — искра цвета её редкости, с уникальной — кольцо */
function coBurstLaunch(R, i) { const a = coAt(R); if (a) a.fx.burst(a.x, a.y, coColor(R.cards[i].r), ...CO_VIEW.fx.launch, { shape: 'streak', w: 1.2 }); }
function coBurstTrail(R, i) {
  const fx = coFx(R.host), el = coEl(R, `.co-card[data-i="${i}"] .co-flip`); if (!fx || !el) return;
  const b = fx.center(el); fx.burst(b.x, b.y, coColor(R.cards[i].r), ...CO_VIEW.fx.trail, { fade: 'in' });
}
function coBurstCard(R, i) {
  const fx = coFx(R.host), el = coEl(R, `.co-card[data-i="${i}"] .co-flip`); if (!fx || !el) return;
  const c = R.cards[i], b = fx.center(el), col = coColor(c.r), [from, k, ms, th] = CO_VIEW.fx.cardRing;
  fx.burst(b.x, b.y, col, ...CO_VIEW.fx.card[c.r - 1]);
  if (c.r >= from) fx.ring(b.x, b.y, col, b.w * k / 100, ms, th);
}
/* самая ценная поднимается: огоньки её цвета вокруг сундука; переворот — вспышка, полосы, кольца, золото и дрожь по её редкости */
function coBurstRise(R) { const a = coAt(R); if (a) coMotes(R, a.fx, a.x, a.y, coColor(R.b), CO_VIEW.fx.hero.motes); }
function coBurstHero(R) {
  const fx = coFx(R.host), el = coEl(R, '.co-card.best .co-flip'); if (!fx || !el) return;
  const c = R.cards[R.cards.length - 1], B = CO_VIEW.fx.hero, b = fx.center(el), col = coColor(c.r), C = EnFx.COL;
  fx.burst(b.x, b.y, col, ...CO_VIEW.fx.card[c.r - 1]);
  fx.burst(b.x, b.y, C.steel, ...B.streaks, { shape: 'streak', w: 1.4 });
  if (c.r >= B.ringFrom) for (const [k, ms, th, d] of B.rings) setTimeout(() => { if (coLive(R)) fx.ring(b.x, b.y, col, b.w * k / 100, ms, th); }, d);
  if (c.r >= B.goldFrom) fx.burst(b.x, b.y, C.gold, ...B.gold);
  if (c.r >= B.shakeFrom) fx.shake(...B.shake);
}

/* ================== разметка ================== */
/* заглушка SVG, пока рисунка вида нет: крышка и корпус — отдельные SVG, их рамки — CO_ART.svg. u — префикс id градиентов */
function coSvgPart(part, box, u) {
  const K = CO_KINDS[box] || CO_KINDS.wander, emb = (typeof LB_IC !== 'undefined' && LB_IC[box]) || K.ic, G = CO_ART.svg[part];
  const shade = `<linearGradient id="${u}${part}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".46"/></linearGradient>`;
  const lid = 'M26 90V61C26 43 60 34 100 34C140 34 174 43 174 61V90Z';
  const body = part === 'lid'
    ? `<path class="w" d="${lid}"/><path class="w2" d="M27 63C54 52 146 52 173 63"/><path class="m" d="M46 41.6L58 38.1V90H46Z M154 41.6L142 38.1V90H154Z"/>
      <rect class="m2" x="24" y="79" width="152" height="11" rx="3"/><circle class="m2" cx="100" cy="60" r="11"/><use class="co-emb" href="#i-${emb}" x="92" y="52" width="16" height="16"/><path d="${lid}" fill="url(#${u}lid)"/>`
    : `<rect class="w" x="30" y="86" width="140" height="66" rx="5"/><path class="w2" d="M32 108.5H168M32 130.5H168"/>
      <rect class="m" x="46" y="86" width="12" height="66"/><rect class="m" x="142" y="86" width="12" height="66"/><rect class="m2" x="26" y="146" width="148" height="9" rx="2.5"/>
      <g class="rv"><circle cx="52" cy="97" r="1.7"/><circle cx="52" cy="138" r="1.7"/><circle cx="148" cy="97" r="1.7"/><circle cx="148" cy="138" r="1.7"/></g>
      <rect x="30" y="86" width="140" height="66" rx="5" fill="url(#${u}body)"/>`;
  return `<svg class="co-sv" viewBox="${G.join(' ')}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs>${shade}</defs>${body}</svg>`;
}
/* замок: рисунок или заглушка SVG; скважина светится */
function coLockArt(box) {
  const L = coLockOf(box).p;
  if (L) return `<img src="${AV(L)}" alt="" draggable="false">`;
  return `<svg class="co-sv" viewBox="0 0 82 100" aria-hidden="true" focusable="false"><path d="M19 42V28C19 14 29 6 41 6S63 14 63 28V42" fill="none" stroke="#3a3f45" stroke-width="10"/>
    <path d="M19 42V28C19 14 29 6 41 6S63 14 63 28V42" fill="none" stroke="#6b7078" stroke-width="3" stroke-opacity=".55"/><rect x="6" y="38" width="70" height="58" rx="14" fill="#b08c4e"/>
    <rect x="12" y="44" width="58" height="46" rx="10" fill="#2a2e33"/><path d="M41 55a7 7 0 0 1 4 12.7V78h-8V67.7A7 7 0 0 1 41 55z" fill="#07090b"/></svg>`;
}
/* шапка окна: вид, имя сундука с кристаллом редкости, маленькое окно с галочкой и крестик */
function coTopHtml(R) {
  const red = coReduced(), many = R.n > 1;
  const eb = R.trial ? (many ? `Проба · ${coChests(R.n)}` : 'Проба') : many ? `Открытие · ${coChests(R.n)}` : 'Открытие сундука';
  return `<div class="co-top"><div class="co-tt"><span class="co-eb">${eb}</span><b class="co-nm" data-r="${R.r}">${ICON('r' + R.r, 18, RAR[R.r])}<span>${trEsc(coBoxName(R.cs))}</span></b></div>
    <label class="co-skip"${red ? ' title="В системе включено «меньше движения»"' : ''}><input type="checkbox" data-a="coskip"${coSkipOn() ? ' checked' : ''}${red ? ' disabled' : ''}><span>Пропустить анимацию</span></label>
    ${R.phase === 'idle' ? '' : `<button class="iconbtn x co-x" data-a="close" aria-label="Закрыть">${ic('x')}</button>`}</div>`;
}
/* места карточек: самая ценная — в воздухе над сундуком; остальные — по бокам сундука, по очереди слева и справа, изнутри наружу */
function coSlots(R, C) {
  const G = CO_VIEW.geo, n = R.cards.length, reg = Math.max(0, n - 1), mx = Math.round(G.w / 2), out = [];
  const per = Math.ceil(reg / 2), rows = Math.max(1, Math.ceil(per / 2)), k = rows > 2 ? Math.floor(2000 / rows) : 1000;
  const cw = Math.round(G.card[0] * k / 1000), ch = Math.round(G.card[1] * k / 1000);
  const half = Math.round(Math.max(C.w - C.cx, C.cx)), heroY = G.heroTop + Math.round(G.hero[1] / 2);
  const top0 = heroY - Math.round(ch / 2) - (rows > 1 ? Math.round((ch + G.rowGap) * (rows - 1) / 2) : 0);
  for (let i = 0; i < reg; i++) {
    const side = i % 2 ? 1 : -1, j = Math.floor(i / 2), col = j % 2, row = Math.floor(j / 2);
    const cx = mx + side * (half + G.side + Math.round(cw / 2) + col * (cw + G.colGap));
    out.push({ x: cx - Math.round(cw / 2), y: top0 + row * (ch + G.rowGap), w: cw, h: ch });
  }
  if (n) out.push({ x: mx - Math.round(G.hero[0] / 2), y: G.heroTop, w: G.hero[0], h: G.hero[1] });
  return out;
}
/* карточки: поднимаются из щели рубашкой вверх со шлейфом, встают на место и переворачиваются; самая ценная — медленно, в воздух над
   сундуком, висит и переворачивается со вспышкой. e — мс от начала показа */
function coCardsHtml(R, e, C, my) {
  const V = CO_VIEW, G = V.geo, T = R.T, n = R.cards.length; if (!n) return '';
  const slots = coSlots(R, C), mx = Math.round(G.w / 2), H = T.H;
  return R.cards.map((c, i) => {
    const best = i === n - 1, { x, y, w, h } = slots[i], t = T.cards[i];
    const fx = Math.round(mx - x - w / 2), fy = Math.round(my - y - h / 2), ta = Math.round(Math.atan2(fy, fx) * 180 / Math.PI) - 90;
    const fly = best ? H.rise : V.fly, fl = best ? T.hero.flip : t + V.fly, fp = best ? H.flip : V.flip;
    const s = `left:${x}px;top:${y}px;--w:${w}px;--h:${h}px;--fx:${fx}px;--fy:${fy}px;--dc:${t - e}ms;--tf:${fly}ms;--dl:${fl - e}ms;--tp:${fp}ms;--ta:${ta}deg`
      + (best ? `;--dv:${T.hero.hover - e}ms;--tv:${H.hover}ms` : '');
    const face = `<span class="co-cb co-face"><i class="co-cr"></i><span class="co-ci${c.face ? ' face' : c.glass ? ' glass' : ''}">${c.icon}</span><b class="co-cq">${c.dust ? '+' + fmt(c.dust) : '×' + fmt(c.q)}</b>${best ? '<i class="co-csh co-a"></i>' : ''}</span>`;
    const back = `<span class="co-back"><i class="co-bk"></i></span>`;
    const inner = `<i class="co-tail co-a"></i>${best ? '<i class="co-aura co-a"></i>' : ''}<span class="co-flip co-a">${face}${back}</span>`;
    return `<div class="co-card co-a${best ? ' best' : ''}${c.dust ? ' dust' : ''}" data-r="${c.r}" data-i="${i}" title="${trEsc(c.tip)}" style="${s}">`
      + (best ? `<div class="co-bob co-a">${inner}</div>` : inner) + `<small class="co-cn co-a">${trEsc(c.name)}</small></div>`;
  }).join('');
}
/* монеты гарантированной валюты: вылетают из щели при открытии и встают справа от сундука, у земли */
function coCoinsHtml(R, e, C, my, gy) {
  const V = CO_VIEW, G = V.geo, list = Object.entries(R.cur).filter(([, a]) => a > 0), mx = Math.round(G.w / 2);
  const left = mx - C.cx + C.w + G.coin[0];
  return list.map(([k, a], i) => {
    const top = gy - G.coin[1] * (i + 1);
    return `<span class="co-coin co-a" style="left:${left}px;top:${top}px;--fx:${mx - left}px;--fy:${my - top}px;--dq:${R.T.open + V.coin + i * V.coinStep - e}ms"><img src="${curImg(k)}" alt="${coCurName(k)}"><b>+${fmt(a)}</b></span>`;
  }).join('');
}
/* итог — одной сеткой: одинаковые записи слиты, редкие сверху; у пачки — по редкостям. Прах — плиткой героя и строкой суммы */
function coGroups(R) {
  const m = new Map();
  for (const c of R.items) {
    const k = [c.kind, c.id, c.dust ? 'прах' : ''].join(':'), x = m.get(k);
    if (x) { x.q += c.q; x.dust += c.dust; x.n++; if (c.r > x.r) x.r = c.r; } else m.set(k, Object.assign({}, c, { n: 1 }));
  }
  return [...m.values()].sort((a, b) => b.r - a.r || (CO_KIND_W[b.kind] || 0) - (CO_KIND_W[a.kind] || 0) || b.q - a.q || a.name.localeCompare(b.name, 'ru'));
}
function coTile(g, i) {
  const tip = g.kind === 'shard' ? (g.dust ? `${g.hn} уже пробуждён: осколки ×${fmt(g.q)} → прах +${fmt(g.dust)}` : `Осколки героя: ${g.hn} ×${fmt(g.q)}`) : `${g.name} ×${fmt(g.q)}`;
  return `<div class="co-t${g.dust ? ' dust' : ''}" data-r="${g.r}" title="${trEsc(tip)}" style="--i:${i}"><span class="co-ti${g.face ? ' face' : g.glass ? ' glass' : ''}">${g.icon}<b class="co-tq">${g.dust ? '+' + fmt(g.dust) : '×' + fmt(g.q)}</b></span><small>${trEsc(g.name)}</small></div>`;
}
/* кнопки итога: «Открыть ещё» — один такой же сундук с полной анимацией, «Открыть все» — оставшиеся пачкой; номер операции — на кнопках */
function coActs(R) {
  if (R.trial) return `<button class="btn sm go co-main" data-co="again">Открыть ещё</button><button class="btn sm" data-co="many">Пачкой ×${fmt(CO_VIEW.kitMany)}</button><button class="btn sm ghost co-close" data-a="close">Закрыть</button>`;
  const g = R.key && typeof zpChestGroups === 'function' ? zpChestGroups().find(x => x.key === R.key) : null, left = g ? g.q : 0, op = coNextOp(), k = trEsc(R.key);
  return (left ? `<button class="btn sm go co-main" data-a="zpopen" data-v="${k}" data-op="${op}" data-n="1">Открыть ещё</button>` : '')
    + (left > 1 ? `<button class="btn sm" data-a="zpopen" data-v="${k}" data-op="${op}" data-n="all">Открыть все · ${fmt(left)}</button>` : '')
    + `<button class="btn sm ghost co-close${left ? '' : ' co-main'}" data-a="close">Закрыть</button>`;
}
function coResHtml(R, e) {
  const many = R.n > 1, G = coGroups(R), dr = `${(R.tr != null ? R.tr - R.t0 : 0) - e}ms`, cur = Object.entries(R.cur).filter(([, a]) => a > 0);
  const head = `<div class="co-res-h"><h3>${many ? `Открыто: ${coChests(R.n)}` : 'Сундук открыт'}</h3>${R.trial ? '<span class="chip warn">проба — не выдача</span>' : `<span class="chip spirit">${ic('check')}в запасах</span>`}</div>`;
  const coins = cur.length ? `<div class="co-rcs">${cur.map(([k, a]) => `<span class="co-rc" title="${coCurName(k)}"><img src="${curImg(k)}" alt="${coCurName(k)}"><b>+${fmt(a)}</b></span>`).join('')}</div>` : '';
  let i = 0;
  const grid = list => `<div class="co-grid">${list.map(g => coTile(g, i++)).join('')}</div>`;
  let body = '';
  if (!many) body = G.length ? grid(G) : '';
  else for (const r of [...new Set(G.map(g => g.r))]) body += `<div class="co-rg"><span class="co-rh">${rar(r)}</span>${grid(G.filter(g => g.r === r))}</div>`;
  const dust = G.reduce((a, g) => a + g.dust, 0);
  const dl = dust ? `<p class="co-dust"><img src="${curImg('dust')}" alt="${coCurName('dust')}"><span>Осколки пробуждённых героев ушли в прах: <b>+${fmt(dust)}</b></span></p>` : '';
  const note = R.trial ? TM('Проба тем же алгоритмом, что у запасов (EnLoot на сиде пробы): запасы и кошелёк не меняются.', 'p', 'reason')
    : TM(`Итог выдан до анимации одной операцией${R.op ? ' ' + R.op : ''}: у каждого сундука свой сид, выданный вместе с ним. Анимация только показывает: закрыть окно, пропустить её или нажимать на сцену — итог тот же, повтор номера операции ничего не выдаёт. Числа вида — CO_VIEW.`, 'p', 'reason');
  return `<button class="co-scrim2" data-a="close" aria-label="Закрыть итог" tabindex="-1" style="--dr:${dr}"></button>
    <section class="co-res${many ? ' wide' : ''}" role="dialog" aria-label="Итог открытия" style="--dr:${dr}">${head}<div class="co-res-b">${coins}${body}${dl}${note}</div><div class="co-res-f">${coActs(R)}</div></section>`;
}
/* сцена целиком: дымка, кольцо под сундуком, ореол ступеней света, лучи, столп, сундук с крышкой и замком, пыль, вспышка, монеты,
   карточки, затемнение и самая ценная; шапка, подсказка и итог. Все задержки — от начала показа минус e: перерисовка посреди анимации
   продолжает её с того же места */
function coStageHtml(R, e) {
  e = Math.max(0, Math.round(e || 0));
  const V = CO_VIEW, G = V.geo, T = R.T, anim = R.phase === 'anim', idle = R.phase === 'idle', d = t => `${t - e}ms`;
  const C = coChestGeo(R.box, R.r), A = C.A, mx = Math.round(G.w / 2), gy = G.h - G.ground, top = gy - C.h, my = top + C.seam, cl = mx - C.cx;
  const lv = idle ? [R.r] : R.climb, s = lv.length - 1, lt = k => idle ? 0 : T.lv[k], gild = R.r >= V.gild, H = T.H;
  const lvx = (k, out) => `${k === s && out == null ? ' z' : ''}" data-r="${lv[k]}" style="--l0:${d(lt(k))}${k < s ? `;--l1:${d(lt(k + 1))}` : out != null ? `;--l1:${d(out)}` : ''}`;
  const tex = n => coTex(n), rays = tex('rays'), ring = tex('ring'), haze = tex('haze'), beam = tex('beam'), dust = tex('dust'), flash = tex('flash');
  /* сундук: крышка — 3D, ось у задней кромки; её изнанка светится ступенями света; корпус — со светом снизу; щель, замок */
  const [lx, ly, lw, lh] = C.lid, [bx, by, bw, bh] = C.body, gold = gild && !A;
  const lidArt = A ? `<img src="${A.lid}" alt="" draggable="false">${gild ? `<i class="co-shn co-a" style="--m:url('${A.lidAbs}')"></i>` : ''}` : coSvgPart('lid', R.box, `co${R.host}${R.id}`);
  const bodyArt = A ? `<img src="${A.body}" alt="" draggable="false">${lv.map((x, k) => `<i class="co-lit co-lvx${lvx(k)};--m:url('${A.bodyAbs}')"></i>`).join('')}${gild ? `<i class="co-shn co-a" style="--m:url('${A.bodyAbs}')"></i>` : ''}`
    : coSvgPart('body', R.box, `co${R.host}${R.id}`);
  const K = CO_KINDS[R.box] || CO_KINDS.wander, metal = gold ? CO_GOLD : [K.metal, K.metal2];
  const hops = idle ? [] : lv.slice(1).map((x, k) => `<div class="co-hop co-a" style="--dh:${d(T.lv[k + 1])}">`);
  const chest = `<div class="co-chest co-a${A ? ' art' : ''}" data-g="${gild ? 1 : 0}" style="left:${cl}px;top:${top}px;width:${C.w}px;height:${C.h}px;--wood:${K.wood};--wood2:${K.wood2};--metal:${metal[0]};--metal2:${metal[1]}">
      <div class="co-land co-a">${hops.join('')}<div class="co-shake co-a"><div class="co-recoil co-a"><div class="co-c3" style="perspective:${C.persp}px">
        <div class="co-lid co-a" style="left:${lx}px;top:${ly}px;width:${lw}px;height:${lh}px;transform-origin:50% 100% -${C.depth}px"><div class="co-lidr co-a" style="transform-origin:50% 100% -${C.depth}px">
          <div class="co-lidu${A ? ' art' : ''}" style="height:${C.depth}px${A ? `;--m:url('${A.lidAbs}')` : ''}">${A ? `<img class="co-lui" src="${A.lid}" alt="" draggable="false">` : ''}${lv.map((x, k) => `<i class="co-ulv co-lvx${lvx(k)}"></i>`).join('')}</div>
          <div class="co-lidf">${lidArt}</div></div></div>
        <div class="co-mouth co-a" data-r="${R.b}" style="left:${C.cx - Math.round(C.inner / 2)}px;top:${C.seam}px;width:${C.inner}px"><i class="co-a"></i></div>
        <div class="co-body" style="left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px">${bodyArt}</div>
        <div class="co-bloom co-a" data-r="${R.b}" style="left:${C.cx - Math.round(C.inner / 2)}px;top:${C.seam}px;width:${C.inner}px"><i class="co-a"></i></div>
        ${lv.map((x, k) => `<div class="co-crk co-lvx${lvx(k, idle ? null : T.open)};left:${C.cx - Math.round(C.inner / 2)}px;top:${C.seam}px;width:${C.inner}px"><i class="co-a"></i><b class="co-leak co-a"></b></div>`).join('')}
        <div class="co-lock co-a" style="left:${C.lock[0]}px;top:${C.lock[1]}px;width:${C.lock[2]}px;height:${C.lock[3]}px">${coLockArt(R.box)}<i class="co-kh co-a"></i></div>
      </div></div></div>${hops.map(() => '</div>').join('')}</div>
      ${R.n > 1 ? `<b class="co-n">×${fmt(R.n)}</b>` : ''}<i class="co-mpt" style="left:${C.cx}px;top:${C.seam}px"></i></div>`;
  /* фон сцены: дымка, кольцо под сундуком, ореол каждой ступени света, лучи и столп — после открытия */
  const back = `<div class="co-haze co-a" data-r="${R.r}" style="left:${mx}px;top:${my}px;--hz:${V.haze[R.r - 1]}"><i class="co-a${haze.cls}" style="${haze.st}"></i></div>`
    + (R.r >= V.rune ? `<div class="co-rune co-a" data-r="${R.r}" style="left:${mx}px;top:${gy}px"><i class="co-a${ring.cls}" style="${ring.st}"></i></div>` : '')
    + `<div class="co-dais" style="left:${mx}px;top:${gy}px;width:${Math.round(C.w * G.dais / 1000)}px"></div>`
    + `<div class="co-shd co-a" style="left:${mx}px;top:${gy}px;width:${C.w}px"></div>`
    + lv.map((x, k) => `<div class="co-lv co-lvx${lvx(k)};--ha:${V.halo[x - 1]}"><i class="co-halo co-a" style="left:${mx}px;top:${my}px;--dp:${d(lt(k))}"></i></div>`).join('')
    + (idle ? '' : (R.b >= V.rays ? `<div class="co-rays co-a" data-r="${R.b}" style="left:${mx}px;top:${my}px;--ra:${V.ray[R.b - 1]}"><i class="co-a${rays.cls}" style="${rays.st}"></i></div>` : '')
      + `<div class="co-beam co-a" data-r="${R.b}" style="left:${mx}px;top:${my}px;width:${Math.round(C.inner * G.beam[0] / 1000)}px;height:${Math.round(C.inner * G.beam[1] / 1000)}px;--bm:${V.beam[R.b - 1]}"><i class="${beam.cls.trim()}" style="${beam.st}"></i></div>`);
  /* перед сундуком: пыль приземления, вспышка открытия, монеты, карточки; самая ценная — над затемнением, с лучами и вспышкой */
  const P = V.fx.open[R.b - 1] || V.fx.open[0], hs = coSlots(R, C), hb = hs[hs.length - 1];
  const hx = hb ? hb.x + Math.round(hb.w / 2) : mx, hy = hb ? hb.y + Math.round(hb.h / 2) : my;
  const front = idle ? '' : `<div class="co-puff co-a" style="left:${mx}px;top:${gy}px;--dw:${C.w}px"><i class="co-a${dust.cls} l" style="${dust.st}"></i><i class="co-a${dust.cls} r" style="${dust.st}"></i></div>
    <div class="co-flash co-a" data-r="${R.b}" style="left:${mx}px;top:${my}px;--fs:${P.flash[0]};--tfl:${P.flash[1]}ms"><i class="${flash.cls.trim()}" style="${flash.st}"></i></div>
    ${coCoinsHtml(R, e, C, my, gy)}
    <div class="co-dim co-a" style="--dim:${H.dim}"></div>
    ${hb && R.b >= V.rays ? `<div class="co-hrays co-a" data-r="${R.b}" style="left:${hx}px;top:${hy}px;--ra:${V.ray[R.b - 1]}"><i class="co-a${rays.cls}" style="${rays.st}"></i></div>` : ''}
    ${coCardsHtml(R, e, C, my)}
    ${hb ? `<div class="co-hflash co-a" data-r="${R.b}" style="left:${hx}px;top:${hy}px;--fs:${P.flash[0]};--tfl:${P.flash[1]}ms"><i class="${flash.cls.trim()}" style="${flash.st}"></i></div>` : ''}`;
  const vars = `--d0:${-e}ms;--dg:${d(T.land)};--dc0:${d(T.climb0)};--wait:${Math.max(1, T.lock - T.climb0)}ms;--dk:${d(T.lock)};--do:${d(T.open)};--tlock:${V.lock}ms;--tlid:${V.lid}ms;--tdrop:${V.drop}ms`
    + `;--amp:${V.amp[R.r - 1]};--lift:${V.lift[R.r - 1]};--dh0:${d(T.hero.start)};--dhv:${d(T.hero.hover)};--dhf:${d(T.hero.flip)};--thf:${H.flip}ms;--dhs:${d(T.hero.shown)}`
    + `;--tcam:${Math.max(1, T.hero.shown - T.hero.start + 400)}ms;--zm:${H.zoom};--dhint:${d(V.hint)};--thint:${Math.max(1, T.hero.start - V.hint)}ms`;
  const tap = anim ? ' data-a="coreveal"' : '';
  return `<div class="co-st${anim ? '' : idle ? ' co-idle' : ' co-done'}" data-co-run="${R.id}" data-r="${R.r}" data-box="${R.box}" style="${vars}">
    <div class="co-bg"${tap}></div>
    <div class="co-scene"${tap} style="width:${G.w}px;height:${G.h}px"><div class="co-cam co-a" style="transform-origin:${hx}px ${hy}px">${back}${chest}${front}</div></div>
    ${coTopHtml(R)}${anim ? '<div class="co-hint co-a" aria-hidden="true">Нажмите — быстрее</div>' : ''}${R.phase === 'res' ? coResHtml(R, e) : ''}</div>`;
}

/* ================== окно поверх игры ================== */
Object.assign(OV, {
  co() {
    const R = S.co && S.co.run; if (!R) return '';
    return `<div class="ov co-ov" role="dialog" aria-modal="true" aria-label="${R.n > 1 ? 'Открытие сундуков' : 'Открытие сундука'}">${coStageHtml(R, coNow() - R.t0)}</div>`;
  },
});
/* «Пропустить анимацию»: выбор помнит localStorage, без него всё работает; галочка посреди анимации — итог сразу */
function coSetSkip(on, host) {
  S.co.skip = !!on;
  try { localStorage.setItem(CO_KEY, S.co.skip ? '1' : '0'); } catch (_) { }
  const R = coCur(host);
  if (S.co.skip && coLive(R)) { coReveal(R); return; }
  if (host === 'kit') coKitPaint(); else render();
}
Object.assign(ACT, {
  coreveal() { const R = S.co.run; if (coLive(R)) coTap(R); },   // нажатие на сцену посреди анимации — к следующему моменту, в конце — итог
  coskip(v, t) { coSetSkip(!!(t && t.checked), 'game'); },
});

/* ================== UI-кит: раздел «Открытие сундука» ==================
   Своя сцена в разделе: семь редкостей выбранного вида — проба тем же показом, что в запасах; проба — не выдача (S не меняется).
   Кнопка «С анимацией» пробного открытия раздела «Лутбоксы» играет его сундук на его сиде — предметы те же, что в списке бросков */
const CO_KIT = { run: null, box: 'shards', r: 4, cyc: 3, week: 'Эльфы', win: 'step', n: 0, last: null };
/* проба: те же EnLoot.resolve и roll, что у запасов; awake — чьи осколки идут в прах: 'owned' — коллекция игрока, 'all', 'none' */
function coTrial(spec, count, seedOf, awake) {
  if (!LBX || !window.EnLoot) return null;
  let def; try { def = EnLoot.resolve(LBX, spec); } catch (_) { return null; }
  const log = [];
  for (let i = 0; i < count; i++) {
    const res = EnLoot.roll(def, seedOf(i)), aw = {};
    for (const it of res.items) if (it.kind === 'shard' && (awake === 'all' || (awake === 'owned' && RSI[it.id] && rsHas(RSI[it.id])))) aw[it.id] = true;
    const conv = EnLoot.toDust(LBX, res, aw);
    log.push({ id: 'проба-' + i, cur: conv.cur, items: conv.items });
  }
  CO_KIT.last = { spec, awake };
  return coShow({ key: '', cs: { box: spec.box, r: spec.r, cyc: spec.cyc, win: spec.win, week: spec.week || null }, sum: { n: count, log }, op: '' }, { host: 'kit', trial: true });
}
const coKitSeeds = (spec, n) => i => EnLoot.seedOf(['проба-анимации', spec.box, spec.r, spec.cyc, spec.win, spec.week || '', n, i].join('|'));
function coKitSpec(r) { const K = CO_KIT; return { box: K.box, r, cyc: K.cyc, win: K.win, week: K.box === 'shards' ? K.week : null }; }
function coKitStop() { coStop(CO_KIT.run); CO_KIT.run = null; }
function coKitAct(v) {
  const K = CO_KIT, s = String(v), i = s.indexOf(':'), a = i < 0 ? s : s.slice(0, i), x = i < 0 ? '' : s.slice(i + 1);
  if (a === 'box') { if (LBX && LBX.boxes[x]) { K.box = x; K.last = null; coKitStop(); coKitTabs(); coKitPaint(); coKitBoardPaint(); } return; }
  if (a === 'r') { K.r = Math.min(7, Math.max(1, +x || 1)); coKitTabs(); coKitBoardPaint(); const sp = coKitSpec(K.r); coTrial(sp, 1, coKitSeeds(sp, ++K.n), 'owned'); return; }
  if (a === 'again' || a === 'many') {
    const L = K.last || { spec: coKitSpec(K.r), awake: 'owned' }, n = a === 'many' ? CO_VIEW.kitMany : 1;
    coTrial(L.spec, n, coKitSeeds(L.spec, ++K.n), L.awake); return;
  }
  if (a === 'lb' && typeof LB !== 'undefined') {   // сундук и сид пробного открытия раздела «Лутбоксы»: предметы — те же, что в его списке
    const sp = { box: LB.box, r: LB.r, cyc: LB.cyc, win: LB.win, week: LB.box === 'shards' ? LB.week : null };
    K.box = LB.box; K.r = LB.r; coKitTabs(); coKitBoardPaint();
    coTrial(sp, 1, () => EnLoot.seedOf(LB.seed), LB.awake ? 'all' : 'none');
    const k = document.getElementById('coKit'); if (k && k.scrollIntoView) try { k.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) { }
  }
}
function coKitClose() { coKitStop(); coKitPaint(); }
function coKitTabs() {
  const box = document.getElementById('coKitCtl'); if (!box || !box.querySelectorAll) return;
  box.querySelectorAll('[data-co^="box:"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.co === 'box:' + CO_KIT.box)));
  box.querySelectorAll('[data-co^="r:"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.co === 'r:' + CO_KIT.r)));
}
/* сундук раздела до пробы: закрыт, под замком, дышит светом своей редкости */
function coIdle() {
  const K = CO_KIT;
  return { id: 0, host: 'kit', phase: 'idle', box: K.box, r: K.r, b: K.r, n: 1, cs: { box: K.box, r: K.r, cyc: K.cyc, win: K.win }, items: [], cards: [], cur: {}, trial: true, t0: coNow(),
    climb: [K.r], T: { land: 0, climb0: 0, lv: [0], open: 0, lock: 0, cards: [], H: coHero({ n: 1, b: K.r }), hero: { start: 0, hover: 0, flip: 0, shown: 0 }, end: 0, beats: [] } };
}
function coKitPaint() {
  const el = document.getElementById('coKitStage'); if (!el) return;
  const R = CO_KIT.run || coIdle();
  el.innerHTML = coStageHtml(R, coNow() - R.t0);
}
/* раскадровка: та же сцена, остановленная в свои моменты — анимации на паузе, задержки отсчитаны от начала, поэтому кадр стоит
   ровно в своём моменте. Сундук — выбранного вида и редкости, сид раскадровки постоянный */
const CO_BOARD = [['1 · Предвкушение', 'свет из щели поднимается к самой ценной, крышка подпрыгивает'], ['2 · Замок и крышка', 'замок сорван, крышка откинута, вспышка и столп света'],
  ['3 · Карточки', 'поднимаются из сундука и переворачиваются'], ['4 · Самая ценная', 'приближение, лучи, вспышка её редкости'], ['5 · Итог', 'одной сеткой, редкие сверху']];
function coBoardHtml() {
  if (!LBX || !window.EnLoot) return '';
  const sp = coKitSpec(CO_KIT.r), B = CO_VIEW.board;
  let def; try { def = EnLoot.resolve(LBX, sp); } catch (_) { return ''; }
  const conv = EnLoot.toDust(LBX, EnLoot.roll(def, EnLoot.seedOf(['раскадровка', sp.box, sp.r, sp.cyc, sp.win, sp.week || ''].join('|'))), {});
  const base = coRun({ key: '', cs: sp, sum: { n: 1, log: [{ cur: conv.cur, items: conv.items }] }, op: '' }, 'kit', { trial: true }), T = base.T;
  if (!T.cards.length) return '';
  const s = T.lv.length - 1, lastLv = T.lv[s], wait = lastLv + coPct(T.lock - lastLv, B.wait);
  const card = T.cards.length > 1 ? T.cards[0] + CO_VIEW.fly + coPct(CO_VIEW.flip, B.card) : T.hero.start + coPct(T.H.rise, B.card);
  const at = [wait, T.open + B.open, card, T.hero.shown + B.hero, T.end + B.hold];
  return CO_BOARD.map(([n, d], i) => {
    const R = Object.assign({}, base, { id: ++coSeq, phase: i === CO_BOARD.length - 1 ? 'res' : 'anim', tr: base.t0 + T.end });
    return `<figure class="co-still"><div class="co-frame" aria-hidden="true"><div class="co-fst">${coStageHtml(R, at[i])}</div></div><figcaption><b>${n}</b> — ${d}</figcaption></figure>`;
  }).join('');
}
function coKitBoardPaint() { const el = document.getElementById('coKitBoard'); if (el) el.innerHTML = coBoardHtml(); }
/* нажатия раздела: data-co — пробы и выбор вида; data-a внутри сцены раздела — крестик, нажатие на сцену и галочка */
function coKitBind() {
  const k = document.getElementById('kitGrid');
  if (!k || !k.addEventListener || !k.dataset || k.dataset.coBound) return;
  k.dataset.coBound = '1';
  k.addEventListener('click', e => {
    const t = e.target && e.target.closest ? e.target.closest('[data-co],[data-a]') : null;
    if (!t || !k.contains(t)) return;
    if (t.dataset.co) { e.preventDefault(); coKitAct(t.dataset.co); return; }
    if (!t.closest('#coKit')) return;   // data-a других разделов — не наши
    if (t.dataset.a === 'close') coKitClose();
    else if (t.dataset.a === 'coreveal' && coLive(CO_KIT.run)) coTap(CO_KIT.run);
  });
  k.addEventListener('change', e => { const t = e.target; if (t && t.dataset && t.dataset.a === 'coskip' && t.closest && t.closest('#coKit')) coSetSkip(t.checked, 'kit'); });
}
/* готовность арта — команде: листы режимов (семь редкостей и замок), прежние сундуки вида, замок, текстуры; остальное — заглушка */
function coArtNote() {
  const kinds = Object.keys(CO_ART.chests), R7 = [1, 2, 3, 4, 5, 6, 7];
  const sets = kinds.filter(k => R7.every(r => { const A = coChestArt(k, r); return A && A.set; })), drawn = kinds.filter(k => coChestArt(k, 1));
  const fx = CO_ART.fx.filter(n => coArtOk(`chests/fx-${n}.png`)), names = l => l.map(k => CO_KINDS[k].n).join(', ');
  return `Арт: листы режимов — ${sets.length} из ${kinds.length} видов по семи редкостям${sets.length && sets.length < kinds.length ? ` (${names(sets)})` : ''}, у каждого — свой замок; остальные — прежний сундук вида на все редкости (${drawn.length - sets.length}); замок — ${coArtOk('chests/lock.png') ? 'рисунок' : 'заглушка SVG'}; текстуры света — ${fx.length} из ${CO_ART.fx.length}. Задания — <code>tools/art-gen/jobs/chest-sheets.json</code> и <code>chests.json</code>, слои — <code>chest_layers.py sheets</code>, выгруженные пути — <code>CO_ART.ready</code>.`;
}
function coKitHtml() {
  if (!LBX || !window.EnLoot) return '<section class="k-box" style="grid-column:1/-1"><h3>Открытие сундука</h3><p class="k-note">Нет данных: рядом с index.html должен лежать lootboxes.js.</p></section>';
  const kinds = Object.keys(LBX.boxes).map(k => `<button role="tab" data-co="box:${k}" aria-selected="${CO_KIT.box === k}" title="${LBX.boxes[k].n}">${ic((typeof LB_IC !== 'undefined' && LB_IC[k]) || (CO_KINDS[k] || CO_KINDS.wander).ic)}${(CO_KINDS[k] || { n: k }).n}</button>`).join('');
  const rars = [1, 2, 3, 4, 5, 6, 7].map(r => `<button class="btn sm co-kb" data-r="${r}" data-co="r:${r}" aria-pressed="${CO_KIT.r === r}">${ICON('r' + r, 16, RAR[r])}${RAR[r]}</button>`).join('');
  return `<section class="k-box co-kbox" style="grid-column:1/-1"><h3>Открытие сундука · одна анимация на все сундуки</h3>
    <p class="k-note">Сундук своего вида падает с пылью; свет из щели под крышкой поднимается по редкостям — от нижней ступени окна сундука до самой ценной записи, крышка подпрыгивает, дрожь нарастает. Замок срывается, крышка откидывается назад — вспышка, столп света, с эпической — лучи, с древней — кольца, золото и дрожь. Записи поднимаются карточками рубашкой вверх со шлейфом цвета редкости и переворачиваются; самая ценная — медленно, с приближением и вспышкой своей редкости. Итог — одной сеткой. Нажатие на сцену ведёт к следующему моменту, «Пропустить анимацию» — сразу итог. Пачка — коротко: фонтан искр всех выпавших редкостей и одна карточка. В игре окно открывают «Запасы → Сундуки»: итог выдан до анимации одной операцией с номером, анимация только показывает (§34.1). Здесь — проба на цикле ${ROMAN[CO_KIT.cyc]}, неделя ${typeof zpWeekGen === 'function' ? zpWeekGen(CO_KIT.week) : CO_KIT.week}: проба — не выдача. Числа вида — <code>CO_VIEW</code> в <code>screens/chest-open.js</code>.</p>
    <p class="k-note">${coArtNote()}</p>
    <div class="co-kctl" id="coKitCtl"><div class="tabs" role="tablist" aria-label="Вид сундука">${kinds}</div><div class="co-kr">${rars}<button class="btn sm" data-co="many">Пачкой ×${fmt(CO_VIEW.kitMany)}</button></div></div>
    <div class="co-kit" id="coKit"><div class="co-kst" id="coKitStage"></div><div class="co-fxl" aria-hidden="true"></div></div>
    <p class="k-note">Раскадровка — та же сцена, остановленная в свои моменты; частицы в кадре не видны, они рисуются поверх сцены.</p>
    <div class="co-board" id="coKitBoard"></div></section>`;
}
KIT_EXTRA.push({ html: coKitHtml, paint: () => { coKitBind(); coKitTabs(); coKitPaint(); coKitBoardPaint(); } });

/* ================== сценарии презентации ================== */
/* демо-сундук кладётся в запасы, как его принесли бы Дары, и открывается кнопкой карточки — с номером операции */
function coFlow(d) {
  S.route = 'craft'; S.seg.craft = 'stock'; S.overlay = null;
  const V = zpV(), sp = { box: d.box, r: d.r, cyc: d.cyc, win: d.win, week: d.box === 'shards' ? d.week || null : null };
  V.tab = 'chest';
  for (let i = 0; i < d.count; i++) BAG.addChest(Object.assign({ src: d.src }, sp));
  const key = 'g:' + zpChestKey(sp);
  V.sel.chest = key; V.n = 1;
  zpOpen(key, coNextOp(), d.count > 1 ? Infinity : 1);
}
FLOWS.push(
  ['Сундук · открытие', 'Первородный сундук талисманов: падает с пылью, свет из щели поднимается к самой ценной записи, замок срывается, крышка откидывается — вспышка, столп света, лучи; карточки поднимаются и переворачиваются, самая ценная — с приближением и вспышкой; итог одной сеткой. Нажатие на сцену — к следующему моменту, «Пропустить анимацию» — сразу итог', () => coFlow(CO_DEMO.one)],
  ['Сундуки · пачкой', 'Десять сундуков осколков одним нажатием: коротко — фонтан искр всех выпавших редкостей и одна карточка, самая ценная; затем сводка по редкостям — сколько открыто и что выпало', () => coFlow(CO_DEMO.many)],
);

/* ================== состояние ==================
   S.co: run — текущий показ в окне поверх игры; skip — «Пропустить анимацию» из localStorage */
function coState(s) { s.co = { run: null, skip: coSaved() }; return s; }
const coInitBase = initialState;
initialState = function () { return coState(coInitBase()); };
coState(S);
