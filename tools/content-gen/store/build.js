/* Лавка Энериума — калькулятор и сборщик витрины: GDD §32 (витрины: пропуск, разовые наборы, комплекты Энериума, подписки
   с ежедневной выдачей, лимитированные предложения; курс и два правила ×2), §1.2 и §36.1 (за деньги — больше возможностей, не обход
   игры; плательщик быстрее не больше ×1,7; души только фармятся — кроме разовых наборов), §9.3 (Энериум), §36.16 (сервер решает,
   повтор ничего не выдаёт); ADR-0021, ADR-0030 (облик не продаётся), ADR-0033, ADR-0034, ADR-0036, ADR-0047 (курс), ADR-0054 (×2).
   Числа — демонстрация.

   Слово автора 30.09.2026, ночь — ответ на ADR-0034:
   «Я Вижу это как 5 стартовых наборов, все с х2 и 5 градаций, покупая 1 - открывается 2 ,и т.д. И собственно градации по самому
   количеству ресурсов. Расчитанно на не донатеров от 100р на средних от 500+ и на 2500+, Так же наборы малого, среднего, большого,
   огромного и великого энериума, подписки дающие энериум раз в день, всего 3 штуки, боевой пропуск, лимитированные предложения,
   в общем нужно будет продумать монетизацию, с условием оптимальных цен для игрока как на западном сегменте, так и в России.»
   «…реклама за просмотр которой тоже будет даться энериум, на её не много, от 10 в день и смотреть или нет игрок решит сам вместе
   с попапом.» «Я Думаю нужно Боевой пропуск делать за деньги, это основная подписочная система…»

   Слово автора 02.10.2026 (ADR-0047) — курс: «1 рубль = 1 Энериум, обесценивать донат прямо в 0 нет смысла, ибо если давать Энериума
   много за небольшую сумму, значит обесценивать его вовсе, донат это альтернативный путь прохождения игры, а удовольствие это дорогое.»
   Слово автора 06.10.2026 (ADR-0054) — ×2: «…это должно быть на выбор игрока - то есть именно он решает какой набор будет х2 но только
   самая первая покупка, касается только разовых наборов, какие они будут именно мы их сделаем когда будет готова вся игра и просчитана
   вся экономика, сейчас смысла нет. На комплекты Энериума будет действовать х2 на каждый набор но только 1 раз на 1 набор.»
   Прежнее «пять стартовых наборов цепочкой, все ×2, купил ступень — открылась следующая» отменено; состав разовых наборов — прежний,
   автор определит его после экономики.

   Что считает и проверяет:
   1. Сетка цен — одна ступень, две валюты: рубли для платёжных систем России, доллары для App Store и Google Play. Коридор рубля к доллару.
   2. Курс автора — 1 рубль = 1 Энериум (RATE): база каждого комплекта Энериума — ровно номинал его рублёвой цены, Энериум разового
      набора — не выгоднее курса. Номинал — цена до ценовой точки: 249 ₽ → 250.
   3. Пять разовых наборов — прежние «стартовые»: каждый — раз за игру, в любом порядке. Удвоение получает только самая первая покупка
      разового набора, набор выбирает игрок. Рунные ключи и души за деньги — только здесь; все пять вместе в худшем случае — удвоен
      самый большой — не больше LAWS.onceDays дней дохода обычного игрока в цикле II, плательщик с ними — не больше ×1,7.
   4. Пять комплектов Энериума: больше — не хуже курс, первая покупка каждого — ×2, один раз на комплект.
   5. Три выдачи — Энериум раз в сутки 30 дней, письмом во Входящие, не сгорает, сама не продлевается.
   6. Платный ряд пропуска — за деньги; его Энериум (design/ui/pass.js, rows.paid) — от ×1 до ×2 базового курса цены.
   7. Лимитированные предложения: когда открываются, сколько живут, сколько раз, что внутри — не выгоднее первой покупки ×2.
   8. Реклама за Энериум: награда за ролик, дневной потолок.
   9. Арт: задания tools/art-gen/jobs/store.json, выбранные картинки, траты, выгружено ли в прототип.

   Пишет:
   - design/ui/store.js — данные прототипа (window.EN_STORE) и алгоритм «сервера» (window.EnStore из rules.js), руками не править;
   - docs/content/монетизация.md — только таблицы между метками «<!-- @таблица имя -->» и «<!-- /таблица имя -->»; текст — ручной.
   Читает: design/ui/pass.js (платный ряд), design/ui/contracts.js (рунные ключи обычного в неделю), tools/content-gen/contracts/capacity.json
   (души обычного в день, длина цикла II), design/ui/roster.js (цены донатных героев и прокрутки — для сравнения), tools/art-gen/jobs/store.json,
   art/generated/manifest.json, design/ui/assets/art/store/ (что выгружено).
   Любая ошибка — файлы не пишутся. Пересборка даёт те же байты.
   Порядок: после пропуска (node tools/content-gen/pass/build.js), до калькулятора Энериума (economy/enerium.js) — шаг 9.
   Запуск: node tools/content-gen/store/build.js           — собрать и записать;
           node tools/content-gen/store/build.js --check   — только проверить, что файлы свежие;
           node tools/content-gen/store/build.js --print   — таблицы в консоль. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SR = require('./rules.js');
const ROOT = path.join(__dirname, '..', '..', '..');
const FILES = {
  rules: path.join(__dirname, 'rules.js'),
  pass: path.join(ROOT, 'design', 'ui', 'pass.js'),
  contracts: path.join(ROOT, 'design', 'ui', 'contracts.js'),
  roster: path.join(ROOT, 'design', 'ui', 'roster.js'),
  cap: path.join(ROOT, 'tools', 'content-gen', 'contracts', 'capacity.json'),
  jobs: path.join(ROOT, 'tools', 'art-gen', 'jobs', 'store.json'),
  manifest: path.join(ROOT, 'art', 'generated', 'manifest.json'),
  assets: path.join(ROOT, 'design', 'ui', 'assets', 'art'),
  out: path.join(ROOT, 'design', 'ui', 'store.js'),
  doc: path.join(ROOT, 'docs', 'content', 'монетизация.md'),
};

/* ================================ ДАННЫЕ ================================ */

const BP = 10000;
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

/* Области оплаты. Цену показывает и берёт платформа игрока: RuStore и платёжные системы России — в рублях, App Store и Google Play
   на Западе — в долларах, дальше платформа сама переводит доллар в местные валюты по своей сетке */
const REGIONS = { ru: { n: 'Россия', cur: 'rub' }, us: { n: 'Запад', cur: 'usd' } };

/* Сетка цен: одна ступень — одна цена в двух валютах, товар один. usd — центы. Рубль — около 83 за доллар ступени: при курсе
   80–95 ₽ за доллар русский игрок платит не больше западного. Вход — 99 ₽ и $0,99: слово автора «не донатеров от 100р».
   Ступени — привычные точки обоих рынков: …9 ₽ и …,99 $ */
const TIERS = {
  r99: { rub: 99, usd: 99 },
  r159: { rub: 159, usd: 199 },
  r249: { rub: 249, usd: 299 },
  r349: { rub: 349, usd: 399 },
  r399: { rub: 399, usd: 499 },
  r499: { rub: 499, usd: 599 },
  r749: { rub: 749, usd: 899 },
  r999: { rub: 999, usd: 1199 },
  r2490: { rub: 2490, usd: 2999 },
  r4990: { rub: 4990, usd: 5999 },
};

/* Курс автора — базовый курс витрины: 1 рубль = 1 Энериум (слово автора 02.10.2026, ADR-0047; было около 2 за рубль, ADR-0036).
   Курс считается по номиналу ступени — цене до ценовой точки: 249 ₽ → 250 Энериума, 2 490 ₽ → 2 500. Цены за Энериум — прокрутка,
   донатные герои, друза — и ручеёк бесплатного игрока курс не меняет: за то же плательщик платит вдвое больше рублей */
const RATE = { rub: 1, en: 1 };

/* Пять разовых наборов — прежние «стартовые». Каждый — раз за игру, покупаются в любом порядке: замка «купил ступень — открылась
   следующая» больше нет (ADR-0054, п. 1). x — удвоение самой первой покупки разового набора: какой набор удвоить, выбирает игрок,
   один раз на игру; удваивается весь состав. Прежнее «все пять с ×2» отменено: всем старт не бустится.
   Состав — прежний (имена, цены, ключи, души): автор определит разовые наборы, когда готова вся игра и просчитана экономика.
   get — состав без удвоения. Ключи и души за деньги — только здесь (слово автора 30.09.2026, ADR-0033, ADR-0034). Энериум набора —
   по курсу автора: 100 / 250 / 500 / 1 000 / 2 500 за 99 / 249 / 499 / 999 / 2 490 ₽ (было 150 / 500 / 1 000 / 2 000 / 5 000
   по курсу около 2 за рубль); ключи и души — сверх него. Состав не растёт с циклом: набор ждут в начале пути.
   Души — 150 / 300 / 450 / 600 / 1 200 (было 200 / 400 / 600 / 800 / 1 500, затем 150 / 300 / 450 / 650 / 1 300): с раундами
   по типу врага (ADR-0039) обычный в цикле II добывал 883 души в день вместо 1 001, с ритуалом этажа 11,5 с (ADR-0043) — 794, и прежние
   5 700 душ пяти удвоенных наборов были больше закона — 7 дней его душ (LAWS.onceDays).
   В данных прототипа наборы лежат под прежним ключом chain, поле — steps: их читают таблицы Excel (tables/collect.js, texts.js)
   и проверка обучения (screens/check_start.js) */
const ONCE = {
  id: 'start', n: 'Разовые наборы', x: 2,
  steps: [
    { id: 'start1', n: 'Котомка странника', tier: 'r99', get: [['keys', 5], ['souls', 150], ['enerium', 100]] },
    { id: 'start2', n: 'Дорожный ларец', tier: 'r249', get: [['keys', 10], ['souls', 300], ['enerium', 250]] },
    { id: 'start3', n: 'Окованный ларец', tier: 'r499', get: [['keys', 15], ['souls', 450], ['enerium', 500]] },
    { id: 'start4', n: 'Реликварий', tier: 'r999', get: [['keys', 20], ['souls', 600], ['enerium', 1000]] },
    { id: 'start5', n: 'Сокровищница', tier: 'r2490', get: [['keys', 30], ['souls', 1200], ['enerium', 2500]] },
  ],
};
/* Сегменты автора — на кого рассчитаны разовые наборы: набор по счёту и его цена около порога автора */
const SEGMENTS = [
  { id: 's', n: 'не донатеры', from: 100, step: 1 },
  { id: 'm', n: 'средние', from: 500, step: 3 },
  { id: 'l', n: 'крупные', from: 2500, step: 5 },
];

/* Пять комплектов Энериума — имена автора по порядку. en — база по курсу автора: номинал цены; bonusBp — прибавка к ней; firstX —
   удвоение первой покупки этого комплекта: у каждого комплекта своё, один раз на комплект (ADR-0054, п. 1). Покупать можно сколько
   угодно: объём покупки Энериума не ограничен (§1.2). Малый — базовый курс витрины: 250 Энериума за 249 ₽, без прибавки.
   Было 500 / 1 000 / 2 000 / 5 000 / 10 000 — около 2 Энериума за рубль (ADR-0036); прибавки 0–40 % — прежние */
const PACKS = [
  { id: 'en1', n: 'Малый набор Энериума', tier: 'r249', en: 250, bonusBp: 0, firstX: 2 },
  { id: 'en2', n: 'Средний набор Энериума', tier: 'r499', en: 500, bonusBp: 1000, firstX: 2 },
  { id: 'en3', n: 'Большой набор Энериума', tier: 'r999', en: 1000, bonusBp: 2000, firstX: 2 },
  { id: 'en4', n: 'Огромный набор Энериума', tier: 'r2490', en: 2500, bonusBp: 3000, firstX: 2 },
  { id: 'en5', n: 'Великий набор Энериума', tier: 'r4990', en: 5000, bonusBp: 4000, firstX: 2 },
];

/* Три выдачи — Энериум раз в сутки (слово автора «подписки дающие энериум раз в день, всего 3 штуки»). Покупка — daily сразу, дальше —
   письмом во Входящие в каждые серверные сутки: письмо не сгорает, пропущенный день ничего не отнимает. Сама не продлевается: игрок
   покупает 30 дней, и только. Повторная покупка прибавляет дни, но не больше maxDays вперёд. Все три можно держать разом.
   10 / 23 / 50 в сутки — по курсу автора (было 20 / 45 / 100) */
const SUBS = [
  { id: 'sub1', n: 'Малая выдача', tier: 'r159', daily: 10, days: 30, maxDays: 90 },
  { id: 'sub2', n: 'Ежедневная выдача', tier: 'r349', daily: 23, days: 30, maxDays: 90 },
  { id: 'sub3', n: 'Великая выдача', tier: 'r749', daily: 50, days: 30, maxDays: 90 },
];

/* Платный ряд пропуска — за деньги (слово автора 30.09.2026: «Боевой пропуск делать за деньги, это основная подписочная система»).
   Продаётся на сезон: прогресс не продаётся, только второй ряд наград (§32). Что в ряду — design/ui/pass.js, rows.paid */
const PASS = { id: 'pass', n: 'Платный ряд пропуска', tier: 'r399' };

/* Лимитированные предложения. Лимитированное — значит, курс первой покупки ×2 или ×1,5 снова доступен ненадолго, в особый момент пути.
   Внутри — только Энериум: ни ключей, ни душ (они — только в разовых наборах), ни героев, ни облика, ни силы, которой нет в игре.
   when — что открывает: cycle — новый цикл аккаунта, week — неделя расы, date — праздник календаря сервера. life — секунды жизни или
   'week' — до недельной отсечки. limit — сколько раз за открытие. Срок — строкой с датой; попапов у предложений нет — только витрина.
   Энериум — по курсу автора: «Дар пути» 500 / 1 000 / 2 000, «Лавка недели» 750, «Праздничный дар» 1 500 (было вдвое больше) */
const OFFERS = {
  kinds: {
    path: { n: 'Дар пути', when: 'cycle', life: 259200, limit: 1, what: 'открывается с новым циклом аккаунта, раз за цикл' },
    week: { n: 'Лавка недели', when: 'week', life: 'week', limit: 1, what: 'открывается с неделей расы, до недельной отсечки' },
    fest: { n: 'Праздничный дар', when: 'date', life: 604800, limit: 2, what: 'открывается в праздник календаря сервера' },
  },
  list: [
    { id: 'path2', of: 'path', cycle: 2, tier: 'r249', get: [['enerium', 500]] },
    { id: 'path3', of: 'path', cycle: 3, tier: 'r499', get: [['enerium', 1000]] },
    { id: 'path4', of: 'path', cycle: 4, tier: 'r499', get: [['enerium', 1000]] },
    { id: 'path5', of: 'path', cycle: 5, tier: 'r999', get: [['enerium', 2000]] },
    { id: 'path6', of: 'path', cycle: 6, tier: 'r999', get: [['enerium', 2000]] },
    { id: 'week', of: 'week', tier: 'r499', get: [['enerium', 750]] },
    { id: 'fest', of: 'fest', tier: 'r999', get: [['enerium', 1500]] },
  ],
  maxActive: 3,          // открытых предложений у игрока разом — не больше
};

/* Реклама за Энериум (слово автора: «от 10 в день и смотреть или нет игрок решит сам вместе с попапом»). Ролик — только по выбору
   игрока: попап спрашивает, награда — за досмотренный ролик, её засчитывает сервер по подтверждению рекламной сети. sec — длина
   ролика, как её обещает попап. Курс её не трогает: 5 за ролик — число автора */
const ADS = { perView: 5, dayCap: 2, sec: 30 };

/* Законы и пороги проверок */
const LAWS = {
  rubPerUsd: [75, 100],   // коридор: рублей за доллар ступени — русский игрок не платит больше западного при курсе от 100 ₽/$
  /* ценовые точки: цена даёт остаток по модулю — …9 ₽ или …90 ₽, …,99 $. Номинал ступени — цена до точки: 249 ₽ → 250, 2 490 ₽ → 2 500 */
  point: { rub: [[10, 9], [100, 90]], usd: [[100, 99]] },
  onceSets: 5, onceX: 2,  // разовых наборов — пять; удвоение самой первой покупки — ×2, одно на игру (ADR-0054, п. 1)
  onceDays: 7,            // все разовые наборы, удвоен самый большой, — не больше недели дохода обычного игрока в цикле II по ключам и по душам
  x17: 170,               // плательщик со всеми разовыми наборами к концу цикла II — не больше ×1,7 обычного по ключам и душам (§1.2)
  segTolBp: 500,          // цена набора сегмента — не дороже порога автора и не дешевле его на 5 %
  packs: 5, packX: 2,     // комплектов Энериума — пять; первая покупка каждого — ×2, один раз на комплект (ADR-0054, п. 1)
  subs: 3,
  subMinBp: 15000,        // выдача — не хуже ×1,5 базового курса: верность раз в день выгоднее разовой покупки
  offerMaxBp: 20000,      // предложение — не выгоднее ×2 базового курса: как первая покупка, не больше
  onceEnMaxBp: 10000,     // Энериум разового набора без удвоения — не выгоднее курса автора; ключи и души — сверх
  passEn: [10000, 20000], // Энериум платного ряда — от ×1 до ×2 базового курса цены ряда: окупает себя, но не дороже выдачи
  offerLifeMax: 604800,   // предложение живёт не дольше недели
  ads: [10, 15],          // Энериума за рекламу в день: «от 10», «не много»
  adsCapMax: 5,           // роликов в сутки — не больше
};

/* Демо-аккаунт — один календарь (ADR-0031, п. 17): 11-й день цикла II. Ничего не куплено; открыто предложение недели — до недельной
   отсечки; «Дар пути» цикла II прожил свои 72 часа в начале цикла и закрыт */
const DEMO = { region: 'ru', offers: ['week'] };

/* Арт: задание tools/art-gen/jobs/store.json → путь выгрузки в прототип (design/ui/assets/art/…), размер и поле кадра */
const ART = [
  { key: 'start1', job: 'st-starter', cell: 'start1', to: 'store/start-1.png', use: 'разовый набор I — «Котомка странника»' },
  { key: 'start2', job: 'st-starter', cell: 'start2', to: 'store/start-2.png', use: 'разовый набор II — «Дорожный ларец»' },
  { key: 'start3', job: 'st-starter', cell: 'start3', to: 'store/start-3.png', use: 'разовый набор III — «Окованный ларец»' },
  { key: 'start4', job: 'st-starter', cell: 'start4', to: 'store/start-4.png', use: 'разовый набор IV — «Реликварий»' },
  { key: 'start5', job: 'st-starter', cell: 'start5', to: 'store/start-5.png', use: 'разовый набор V — «Сокровищница»' },
  { key: 'seal', job: 'st-starter', cell: 'seal', to: 'store/pass-seal.png', use: 'печать платного ряда пропуска' },
  { key: 'en1', job: 'st-packs', cell: 'en1', to: 'store/pack-1.png', use: 'малый набор Энериума' },
  { key: 'en2', job: 'st-packs', cell: 'en2', to: 'store/pack-2.png', use: 'средний набор Энериума' },
  { key: 'en3', job: 'st-packs', cell: 'en3', to: 'store/pack-3.png', use: 'большой набор Энериума' },
  { key: 'en4', job: 'st-packs', cell: 'en4', to: 'store/pack-4.png', use: 'огромный набор Энериума' },
  { key: 'en5', job: 'st-packs', cell: 'en5', to: 'store/pack-5.png', use: 'великий набор Энериума' },
  { key: 'ad', job: 'st-packs', cell: 'ad', to: 'store/ad.png', use: 'Энериум за рекламу — попап и карточка' },
  { key: 'sub1', job: 'st-subs', cell: 'sub1', to: 'store/sub-1.png', use: 'малая выдача' },
  { key: 'sub2', job: 'st-subs', cell: 'sub2', to: 'store/sub-2.png', use: 'ежедневная выдача' },
  { key: 'sub3', job: 'st-subs', cell: 'sub3', to: 'store/sub-3.png', use: 'великая выдача' },
  { key: 'path', job: 'st-subs', cell: 'path', to: 'store/offer-path.png', use: 'предложение «Дар пути»' },
  { key: 'week', job: 'st-subs', cell: 'week', to: 'store/offer-week.png', use: 'предложение «Лавка недели»' },
  { key: 'fest', job: 'st-subs', cell: 'fest', to: 'store/offer-fest.png', use: 'предложение «Праздничный дар»' },
  { key: 'hall', job: 'st-hall', to: 'store/hall.jpg', use: 'зал Лавки Энериума — фон витрины' },
];

/* ================================ РАСЧЁТ ================================ */

const loadJs = (file, name) => { const c = { window: {} }; c.window = c; vm.createContext(c); vm.runInContext(fs.readFileSync(file, 'utf8'), c); return c[name]; };
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const dec = (num, den, d = 1) => { if (!den) return '0'; const p = 10 ** d, v = Math.round(num * p / den) / p; return String(v).replace('.', ','); };
const rub = n => `${fmt(n)} ₽`;
const usd = c => `$${Math.floor(c / 100)},${String(c % 100).padStart(2, '0')}`;
const KIND = { keys: 'рунные ключи', souls: 'души', enerium: 'Энериум', dust: 'прах душ' };

function build() {
  const err = [], warn = [];
  const PS = loadJs(FILES.pass, 'EN_PASS'), CT = loadJs(FILES.contracts, 'EN_CONTRACTS'), RS = loadJs(FILES.roster, 'EN_ROSTER');
  const CAP = JSON.parse(fs.readFileSync(FILES.cap, 'utf8'));
  if (!PS || !CT || !RS) return { err: ['нет данных: pass.js, contracts.js или roster.js'], warn };

  const D = { bp: BP, rate: RATE, regions: REGIONS, tiers: TIERS, chain: ONCE, segments: SEGMENTS, packs: PACKS, subs: SUBS, pass: PASS, offers: OFFERS, ads: ADS };
  const tierOf = id => TIERS[id] || null;
  const tierIds = Object.keys(TIERS);
  /* номинал ступени — цена до ценовой точки: 249 ₽ → 250, 2 490 ₽ → 2 500, $2,99 → $3,00; null — цена не на точке */
  const nominal = (v, cur) => { const p = LAWS.point[cur].find(([m, r]) => v % m === r); return p ? v + p[0] - p[1] : null; };

  /* --- 1. сетка цен: целые, по возрастанию, на ценовых точках, рубль к доллару — в коридоре --- */
  let prev = null;
  for (const id of tierIds) {
    const T = TIERS[id];
    if (!Number.isInteger(T.rub) || !Number.isInteger(T.usd) || T.rub <= 0 || T.usd <= 0) { err.push(`ступень ${id}: цена не целая или не больше нуля`); continue; }
    if (prev && (T.rub <= prev.rub || T.usd <= prev.usd)) err.push(`ступень ${id}: цены не растут`);
    /* рублей за доллар = rub × 100 / usd — в коридоре: rub × 100 ≥ lo × usd и ≤ hi × usd */
    if (T.rub * 100 < LAWS.rubPerUsd[0] * T.usd || T.rub * 100 > LAWS.rubPerUsd[1] * T.usd) err.push(`ступень ${id}: ${rub(T.rub)} и ${usd(T.usd)} — ${dec(T.rub * 100, T.usd)} ₽ за доллар, вне коридора ${LAWS.rubPerUsd.join('–')}`);
    if (nominal(T.usd, 'usd') == null) err.push(`ступень ${id}: ${usd(T.usd)} — не точка …,99 $`);
    if (nominal(T.rub, 'rub') == null) err.push(`ступень ${id}: ${rub(T.rub)} — не точка …9 ₽ или …90 ₽`);
    prev = T;
  }
  const used = new Set();
  const useTier = (id, who) => { if (!tierOf(id)) err.push(`${who}: нет ступени ${id}`); else used.add(id); };
  if (err.length) return { err, warn };

  /* --- 2. курс автора: 1 рубль = 1 Энериум --- */
  if (!Number.isInteger(RATE.rub) || !Number.isInteger(RATE.en) || RATE.rub <= 0 || RATE.en <= 0) return { err: ['курс автора: не целое или не больше нуля'], warn };
  /* сколько Энериума даёт курс автора за ступень: номинал её рублёвой цены × курс */
  const byRate = T => Math.floor(nominal(T.rub, 'rub') * RATE.en / RATE.rub);
  const rateTxt = `${RATE.rub} рубль = ${RATE.en} Энериум`;
  /* базовый курс витрины — малый комплект Энериума без первой покупки: Энериума на рубль и на цент. От него считаются «×2» и выгода —
     от настоящего товара, а не от выдуманной цены (§32.4). Законом ниже он обязан быть курсом автора */
  const base = PACKS[0], baseT = base ? tierOf(base.tier) : null;
  if (!baseT) return { err: ['нет малого набора Энериума или его ступени — базового курса витрины'], warn };
  const baseEn = SR.packEn(D, base.id).n;
  /* rate ≤ k × base: en / price ≤ k/BP × baseEn / basePrice  ⇔  en × basePrice × BP ≤ k × baseEn × price */
  const cmp = (en, T, k, cur) => en * baseT[cur] * BP - k * baseEn * T[cur];   // ≤ 0 — не выгоднее ×k/BP базового курса
  const both = f => ['rub', 'usd'].every(f);

  /* --- 3. разовые наборы: пять, раз за игру, удвоение — одной самой первой покупке --- */
  if (ONCE.steps.length !== LAWS.onceSets) err.push(`разовых наборов ${ONCE.steps.length}, а по слову автора — ${LAWS.onceSets}`);
  if (ONCE.x !== LAWS.onceX) err.push(`разовые наборы: первая покупка — ×${ONCE.x}, а по слову автора — ×${LAWS.onceX}`);
  const keysDay = CT.econ[2] ? Math.floor(CT.econ[2].o.keys / 7) : 0, soulsDay = CAP.cycles[2] ? Math.floor(CAP.cycles[2].o.souls / 100) : 0;
  const c2Days = CAP.cycleDays['2'];
  if (!keysDay || !soulsDay || !c2Days) err.push('нет дохода обычного в цикле II: contracts.js (econ[2].o.keys) или capacity.json (cycles[2].o.souls, cycleDays)');
  const KINDS3 = ['keys', 'souls', 'enerium'];
  /* sum — все наборы без удвоения; top — самый большой набор по каждому ресурсу: ему в худшем случае достаётся удвоение */
  const onceSum = { keys: 0, souls: 0, enerium: 0 }, onceTop = { keys: 0, souls: 0, enerium: 0 }, oncePrice = { rub: 0, usd: 0 };
  const onceUsd100 = [];   // Энериум набора в долларах к курсу малого комплекта, сотые: свойство сетки цен, не курса автора
  let prevPrice = 0;
  ONCE.steps.forEach((s, i) => {
    useTier(s.tier, s.n);
    const T = tierOf(s.tier); if (!T) return;
    if (T.rub <= prevPrice) err.push(`разовый набор ${i + 1}: цена не выше предыдущего`);
    prevPrice = T.rub;
    for (const [k, n] of s.get) {
      if (!KINDS3.includes(k)) { err.push(`разовый набор ${i + 1}: вид «${k}» — только рунные ключи, души и Энериум`); continue; }
      if (!Number.isInteger(n) || n <= 0) { err.push(`разовый набор ${i + 1}: ${k} — ${n}`); continue; }
      onceSum[k] += n; onceTop[k] = Math.max(onceTop[k], n);
    }
    for (const k of KINDS3) if (!s.get.some(x => x[0] === k)) err.push(`разовый набор ${i + 1}: нет ${KIND[k]} — градации по количеству ресурсов`);
    if (i) {
      const P = ONCE.steps[i - 1];
      for (const [k, n] of s.get) { const p = (P.get.find(x => x[0] === k) || [0, 0])[1]; if (n <= p) err.push(`разовый набор ${i + 1}: ${KIND[k]} не больше, чем в ${i}-м — градация по количеству`); }
    }
    /* Энериум набора без удвоения — не выгоднее курса автора: en × BP ≤ onceEnMaxBp × Энериум номинала цены. С удвоением самой первой
       покупки выходит не выгоднее ×x курса — как первая покупка комплекта Энериума. Закон — в рублях, в валюте слова автора */
    const en = (s.get.find(x => x[0] === 'enerium') || [0, 0])[1];
    if (en * BP > LAWS.onceEnMaxBp * byRate(T)) err.push(`разовый набор ${i + 1}: ${fmt(en)} Энериума за ${rub(T.rub)} — выгоднее курса автора «${rateTxt}» (${fmt(byRate(T))})`);
    onceUsd100.push(Math.floor(en * nominal(baseT.usd, 'usd') * 100 / (baseEn * nominal(T.usd, 'usd'))));
    oncePrice.rub += T.rub; oncePrice.usd += T.usd;
  });
  /* сегменты автора: цена набора — около порога, не дороже его */
  for (const G of SEGMENTS) {
    const s = ONCE.steps[G.step - 1], T = s && tierOf(s.tier);
    if (!T) { err.push(`сегмент «${G.n}»: нет набора ${G.step}`); continue; }
    if (T.rub > G.from || T.rub * BP < G.from * (BP - LAWS.segTolBp)) err.push(`сегмент «${G.n}»: набор ${G.step} — ${rub(T.rub)}, а порог автора — от ${rub(G.from)}`);
  }
  /* худший случай горлышка: игрок купил все наборы, а удвоение отдал самому большому. По закону градаций самый большой по ключам,
     душам и Энериуму — один и тот же набор; считаем по каждому ресурсу отдельно, чтобы закон держался и без этого совпадения */
  const onceMax = Object.fromEntries(KINDS3.map(k => [k, onceSum[k] + onceTop[k] * (ONCE.x - 1)]));
  const onceTopSet = ONCE.steps.reduce((a, s) => ((s.get.find(x => x[0] === 'souls') || [0, 0])[1] > (a.get.find(x => x[0] === 'souls') || [0, 0])[1] ? s : a), ONCE.steps[0]);
  /* неделя обычного — потолок всех разовых наборов по ключам и душам; плательщик с ними к концу цикла II — не больше ×1,7 */
  const onceKeysDays100 = keysDay ? Math.floor(onceMax.keys * 100 / keysDay) : 0, onceSoulsDays100 = soulsDay ? Math.floor(onceMax.souls * 100 / soulsDay) : 0;
  if (onceMax.keys > keysDay * LAWS.onceDays) err.push(`разовые наборы: ${onceMax.keys} рунных ключей, если удвоен самый большой набор, — больше ${LAWS.onceDays} дней ключей обычного цикла II (${keysDay} в день)`);
  if (onceMax.souls > soulsDay * LAWS.onceDays) err.push(`разовые наборы: ${onceMax.souls} душ, если удвоен самый большой набор, — больше ${LAWS.onceDays} дней душ обычного цикла II (${soulsDay} в день)`);
  const x17 = {
    keys: keysDay ? Math.floor((keysDay * c2Days + onceMax.keys) * 100 / (keysDay * c2Days)) : 0,
    souls: soulsDay ? Math.floor((soulsDay * c2Days + onceMax.souls) * 100 / (soulsDay * c2Days)) : 0,
  };
  if (x17.keys > LAWS.x17 || x17.souls > LAWS.x17) err.push(`разовые наборы: к концу цикла II плательщик — ×${dec(x17.keys, 100, 2)} по ключам и ×${dec(x17.souls, 100, 2)} по душам, больше ×1,7`);

  /* --- 4. комплекты Энериума: пять, по возрастанию, база — по курсу автора, курс не хуже, первая покупка ×2 — раз на комплект --- */
  if (PACKS.length !== LAWS.packs) err.push(`наборов Энериума ${PACKS.length}, а у автора — ${LAWS.packs}: малый, средний, большой, огромный, великий`);
  ['Малый', 'Средний', 'Большой', 'Огромный', 'Великий'].forEach((w, i) => { if (!PACKS[i] || !PACKS[i].n.startsWith(w)) err.push(`набор ${i + 1}: не «${w} набор Энериума» — имена автора по порядку`); });
  PACKS.forEach((p, i) => {
    useTier(p.tier, p.n);
    const T = tierOf(p.tier); if (!T) return;
    for (const v of [p.en, p.bonusBp, p.firstX]) if (!Number.isInteger(v) || v < 0) err.push(`${p.n}: не целое ${v}`);
    if (p.firstX !== LAWS.packX) err.push(`${p.n}: первая покупка — ×${p.firstX}, а по слову автора — ×${LAWS.packX}, один раз на комплект`);
    if (p.en !== byRate(T)) err.push(`${p.n}: база ${fmt(p.en)} Энериума за ${rub(T.rub)} — не по курсу автора «${rateTxt}»: надо ${fmt(byRate(T))}`);
    if (!i && p.bonusBp) err.push(`${p.n}: прибавка ${p.bonusBp / 100} % — а малый набор обязан быть базовым курсом витрины, без прибавки`);
    if (i) {
      const q = PACKS[i - 1], Q = tierOf(q.tier), a = SR.packEn(D, p.id).n, b = SR.packEn(D, q.id).n;
      if (T.rub <= Q.rub) err.push(`${p.n}: цена не выше, чем у «${q.n}»`);
      if (p.bonusBp < q.bonusBp) err.push(`${p.n}: прибавка меньше, чем у «${q.n}»`);
      /* курс не хуже предыдущего в обеих валютах: a / T ≥ b / Q */
      if (!both(cur => a * Q[cur] >= b * T[cur])) err.push(`${p.n}: курс хуже, чем у «${q.n}» — больше набор, не хуже курс`);
    }
  });

  /* --- 5. выдача: три, 30 дней, курс — не хуже ×1,5 базового, дней вперёд — не меньше одной покупки --- */
  if (SUBS.length !== LAWS.subs) err.push(`выдач ${SUBS.length}, а у автора — ${LAWS.subs}`);
  for (const s of SUBS) {
    useTier(s.tier, s.n);
    const T = tierOf(s.tier); if (!T) continue;
    for (const v of [s.daily, s.days, s.maxDays]) if (!Number.isInteger(v) || v <= 0) err.push(`${s.n}: не целое или не больше нуля ${v}`);
    if (s.maxDays < s.days) err.push(`${s.n}: вперёд можно меньше одной покупки`);
    const en = s.daily * s.days;
    if (!both(cur => cmp(en, T, LAWS.subMinBp, cur) >= 0)) err.push(`${s.n}: ${en} Энериума за ${s.days} дней — хуже ×${LAWS.subMinBp / BP} базового курса`);
  }

  /* --- 6. платный ряд пропуска: за деньги; Энериум ряда — от ×1 до ×2 базового курса цены --- */
  useTier(PASS.tier, PASS.n);
  const paidEn = (PS.rows && PS.rows.paid ? PS.rows.paid : []).reduce((a, c) => a + c.filter(x => x.k === 'enerium').reduce((b, x) => b + (x.n || 0), 0), 0);
  const passT = tierOf(PASS.tier);
  if (PS.price != null) err.push('pass.js: у платного ряда цена в Энериуме — пропуск продаётся за деньги (слово автора 30.09.2026); пересобрать pass/build.js');
  if (passT && !both(cur => cmp(paidEn, passT, LAWS.passEn[0], cur) >= 0 && cmp(paidEn, passT, LAWS.passEn[1], cur) <= 0)) err.push(`платный ряд: ${paidEn} Энериума за ${rub(passT.rub)} — вне ×${LAWS.passEn[0] / BP}…×${LAWS.passEn[1] / BP} базового курса`);
  if ((PS.rows && PS.rows.paid || []).some(c => c.some(x => x.k === 'keys' || x.k === 'souls'))) err.push('платный ряд: рунные ключи или души — за деньги они только в разовых наборах');

  /* --- 7. предложения --- */
  for (const [k, K] of Object.entries(OFFERS.kinds)) {
    if (!['cycle', 'week', 'date'].includes(K.when)) err.push(`предложение ${k}: when — ${K.when}`);
    if (K.life !== 'week' && (!Number.isInteger(K.life) || K.life <= 0 || K.life > LAWS.offerLifeMax)) err.push(`предложение ${k}: живёт ${K.life} с — дольше недели или не целое`);
    if (!Number.isInteger(K.limit) || K.limit < 1) err.push(`предложение ${k}: limit ${K.limit}`);
  }
  for (const o of OFFERS.list) {
    useTier(o.tier, `предложение ${o.id}`);
    const T = tierOf(o.tier); if (!T) continue;
    if (!OFFERS.kinds[o.of]) err.push(`предложение ${o.id}: нет вида ${o.of}`);
    for (const [k, n] of o.get) {
      if (k !== 'enerium') err.push(`предложение ${o.id}: «${k}» — в предложениях только Энериум: ключи и души — разовыми наборами, облик и герои не продаются`);
      if (!Number.isInteger(n) || n <= 0) err.push(`предложение ${o.id}: ${n}`);
    }
    const en = o.get.filter(x => x[0] === 'enerium').reduce((a, x) => a + x[1], 0);
    if (!both(cur => cmp(en, T, LAWS.offerMaxBp, cur) <= 0)) err.push(`предложение ${o.id}: выгоднее ×${LAWS.offerMaxBp / BP} базового курса — как первая покупка, не больше`);
    if (o.of === 'path' && !(o.cycle >= 2 && o.cycle <= 6)) err.push(`предложение ${o.id}: цикл ${o.cycle}`);
  }
  for (let c = 2; c <= 6; c++) if (OFFERS.list.filter(o => o.of === 'path' && o.cycle === c).length !== 1) err.push(`«Дар пути»: у цикла ${ROMAN[c]} не одно предложение`);
  if (!Number.isInteger(OFFERS.maxActive) || OFFERS.maxActive < 1) err.push('предложения: maxActive');
  for (const id of DEMO.offers) if (!OFFERS.list.some(o => o.id === id)) err.push(`демо: нет предложения ${id}`);

  /* --- 8. реклама --- */
  const adsDay = ADS.perView * ADS.dayCap;
  if (!Number.isInteger(ADS.perView) || !Number.isInteger(ADS.dayCap) || ADS.perView <= 0 || ADS.dayCap <= 0) err.push('реклама: не целое');
  if (adsDay < LAWS.ads[0] || adsDay > LAWS.ads[1]) err.push(`реклама: ${adsDay} Энериума в день — вне ${LAWS.ads.join('–')} («от 10 в день», «не много»)`);
  if (ADS.dayCap > LAWS.adsCapMax) err.push(`реклама: ${ADS.dayCap} роликов в сутки — больше ${LAWS.adsCapMax}`);

  /* --- ключи и души за деньги — только в разовых наборах --- */
  for (const p of PACKS) if (p.keys || p.souls) err.push(`${p.n}: ключи или души`);
  for (const t of tierIds) if (!used.has(t)) warn.push(`ступень ${t} не используется`);
  if (err.length) return { err, warn };

  /* --- арт: задания, выбранные картинки, траты, выгружено ли --- */
  const JOBS = fs.existsSync(FILES.jobs) ? JSON.parse(fs.readFileSync(FILES.jobs, 'utf8')) : { jobs: [] };
  const MAN = JSON.parse(fs.readFileSync(FILES.manifest, 'utf8'));
  const items = Array.isArray(MAN) ? MAN : (MAN.items || []);
  const art = { rows: [], cost: 0, n: 0 };
  const seenJob = new Set();
  for (const A of ART) {
    const job = JOBS.jobs.find(j => j.id === A.job);
    if (!job) { err.push(`арт: нет задания ${A.job} в tools/art-gen/jobs/store.json`); continue; }
    const got = items.filter(x => x.job === A.job && x.category === job.category);
    if (!seenJob.has(A.job)) { for (const x of got) { art.cost += x.cost_usd || 0; art.n++; } seenJob.add(A.job); }
    const pick = got.length ? got[got.length - 1] : null;
    const out = fs.existsSync(path.join(FILES.assets, ...A.to.split('/')));
    art.rows.push(Object.assign({}, A, { title: job.title, from: pick ? pick.file.replace(/^art\/generated\//, '') : '', tries: got.length, out }));
  }
  art.cost = Math.round(art.cost * 10000) / 10000;
  const artData = { ready: art.rows.filter(r => r.out).map(r => r.to), map: Object.fromEntries(ART.map(A => [A.key, A.to])) };

  /* --- данные прототипа --- */
  const data = Object.assign({
    meta: { builder: 'tools/content-gen/store/build.js', rules: 'tools/content-gen/store/rules.js',
      sources: ['GDD §32', 'GDD §1.2', 'GDD §9.3', 'GDD §36', 'ADR-0034', 'ADR-0036', 'ADR-0047', 'ADR-0054', 'design/ui/pass.js', 'design/ui/contracts.js', 'tools/content-gen/contracts/capacity.json'] },
  }, D, {
    demo: DEMO,
    art: artData,
    econ: {
      base: { en: baseEn, rub: baseT.rub, usd: baseT.usd },
      /* разовые наборы: цена всех пяти; sum — состав всех без удвоения; max — худший случай: удвоение досталось самому большому (top) */
      chain: { rub: oncePrice.rub, usd: oncePrice.usd, sum: onceSum, max: onceMax, top: onceTopSet.id, keysDays100: onceKeysDays100, soulsDays100: onceSoulsDays100, x17 },
      income: { keysDay, soulsDay, c2Days },
      passEn: paidEn, adsDay,
    },
  });
  const walk = (x, where) => { if (typeof x === 'number' && !Number.isInteger(x)) err.push(`данные: не целое ${x} — ${where}`); else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, where + '.' + k); };
  walk(Object.assign({}, data, { meta: null }), 'EN_STORE');

  /* ================================ ТАБЛИЦЫ ================================ */
  const TBL = {};
  const head = cols => ['| ' + cols.join(' | ') + ' |', '| ' + cols.map(() => '---').join(' | ') + ' |'];
  const cells = xs => '| ' + xs.join(' | ') + ' |';
  const both2 = T => `${rub(T.rub)} · ${usd(T.usd)}`;
  const getTxt = (list, x = 1) => list.map(([k, n]) => `${KIND[k]} ${fmt(n * x)}`).join(', ');
  const perRub = (en, T) => dec(en * 100, T.rub, 0);              // Энериума на 100 ₽
  const perUsd = (en, T) => dec(en * 100, T.usd, 0);              // Энериума на $1
  const low = t => t[0].toLowerCase() + t.slice(1);
  const who = id => [
    ...ONCE.steps.filter(s => s.tier === id).map(s => `разовый набор ${ROMAN[ONCE.steps.indexOf(s) + 1]}`),
    ...PACKS.filter(p => p.tier === id).map(p => low(p.n)),
    ...SUBS.filter(s => s.tier === id).map(s => low(s.n)),
    ...(PASS.tier === id ? ['платный ряд пропуска'] : []),
    ...OFFERS.list.filter(o => o.tier === id).map(o => `«${OFFERS.kinds[o.of].n}»${o.cycle ? ' цикла ' + ROMAN[o.cycle] : ''}`),
  ].join(', ');
  let T;

  // сетка цен
  T = head(['Ступень', 'Россия', 'Запад', 'Рублей за доллар ступени', 'Что стоит столько']);
  for (const id of tierIds) { const X = TIERS[id]; T.push(cells([id, rub(X.rub), usd(X.usd), dec(X.rub * 100, X.usd, 1), who(id) || '—'])); }
  TBL.tiers = T.join('\n');

  // разовые наборы
  const enOf = s => (s.get.find(x => x[0] === 'enerium') || [0, 0])[1];
  T = head(['Набор', 'Имя', 'Цена', 'Состав', `Если куплен первым — ×${ONCE.x}`, 'Энериума на 100 ₽ / на $1', 'Для кого']);
  ONCE.steps.forEach((s, i) => {
    const X = tierOf(s.tier), G = SEGMENTS.find(g => g.step === i + 1);
    T.push(cells([ROMAN[i + 1], `«${s.n}»`, both2(X), getTxt(s.get), `**${getTxt(s.get, ONCE.x)}**`, `${perRub(enOf(s), X)} / ${perUsd(enOf(s), X)}`, G ? `${G.n} — от ${rub(G.from)}` : '']));
  });
  T.push(cells(['Все пять', '', both2(oncePrice), getTxt(KINDS3.map(k => [k, onceSum[k]])), `×${ONCE.x} достался набору ${ROMAN[ONCE.steps.indexOf(onceTopSet) + 1]} — худший случай: ${getTxt(KINDS3.map(k => [k, onceMax[k]]))}`, '', '']));
  TBL.once = T.join('\n');

  T = head(['Закон разовых наборов', 'Порог', 'Сейчас']);
  T.push(cells([`×${ONCE.x} — только самой первой покупке разового набора`, 'один раз на игру, набор выбирает игрок', 'удваивается весь состав; остальные четыре набора приходят как есть']));
  T.push(cells(['Порядок покупки', 'любой, каждый набор — раз за игру', 'замка «купил набор — открылся следующий» нет']));
  T.push(cells(['Рунные ключи всех пяти, удвоен самый большой, — дней дохода обычного, цикл II', `не больше ${LAWS.onceDays}`, `${dec(onceKeysDays100, 100, 1)} (${keysDay} в день)`]));
  T.push(cells(['Души всех пяти, удвоен самый большой, — дней дохода обычного, цикл II', `не больше ${LAWS.onceDays}`, `${dec(onceSoulsDays100, 100, 1)} (${fmt(soulsDay)} в день)`]));
  T.push(cells([`Плательщик со всеми пятью, удвоен самый большой, к концу цикла II (${c2Days} дней) — ключи / души`, '×1,7', `×${dec(x17.keys, 100, 2)} / ×${dec(x17.souls, 100, 2)}`]));
  T.push(cells(['Энериум набора без удвоения', `не выгоднее курса автора: ${rateTxt}`, `${ONCE.steps.map(s => fmt(enOf(s))).join(' / ')} — по курсу; ключи и души — сверх`]));
  {
    /* в долларах курс набора задаёт сетка цен, а не курс автора: показываем, где он расходится с курсом малого комплекта */
    const off = ONCE.steps.map((s, i) => [ROMAN[i + 1], onceUsd100[i], tierOf(s.tier)]).filter(x => x[1] !== 100);
    T.push(cells(['Энериум набора в долларах — к курсу малого набора Энериума', 'по ступени сетки цен', off.length
      ? off.map(([r, v, X]) => `×${dec(v, 100, 2)} у набора ${r}: его ступень — ${rub(X.rub)} и ${usd(X.usd)}, ${dec(X.rub * 100, X.usd, 0)} ₽ за доллар`).join('; ') + '; у остальных — ×1'
      : '×1 у всех пяти']));
  }
  T.push(cells(['Ключи и души за деньги', 'только в разовых наборах', 'в наборах Энериума, выдаче, пропуске и предложениях — нет']));
  TBL.onceLaws = T.join('\n');

  // комплекты Энериума
  T = head(['Набор', 'Цена', 'База по курсу', 'Прибавка', 'Энериум', `Первая покупка ×${LAWS.packX} — раз на набор`, 'Энериума на 100 ₽ / на $1']);
  for (const p of PACKS) { const X = tierOf(p.tier), e = SR.packEn(D, p.id); T.push(cells([p.n, both2(X), fmt(p.en), p.bonusBp ? `+${p.bonusBp / 100} %` : '—', fmt(e.n), fmt(e.first), `${perRub(e.n, X)} / ${perUsd(e.n, X)}`])); }
  TBL.packs = T.join('\n');

  // выдача
  T = head(['Выдача', 'Цена за 30 дней', 'В сутки', 'За 30 дней', 'Энериума на 100 ₽ / на $1', 'К базовому курсу', 'Вперёд — не больше']);
  for (const s of SUBS) { const X = tierOf(s.tier), en = s.daily * s.days; T.push(cells([s.n, both2(X), fmt(s.daily), fmt(en), `${perRub(en, X)} / ${perUsd(en, X)}`, `×${dec(en * baseT.rub, baseEn * X.rub, 2)}`, `${s.maxDays} дней`])); }
  TBL.subs = T.join('\n');

  // пропуск
  T = head(['Что', 'Значение']);
  T.push(cells(['Платный ряд — цена за сезон', `${both2(passT)} — за деньги, не за Энериум`]));
  T.push(cells(['Энериум платного ряда за сезон', `${fmt(paidEn)} — ×${dec(paidEn * baseT.rub, baseEn * passT.rub, 2)} базового курса цены: ряд окупает себя Энериумом, остальное — сверху`]));
  T.push(cells(['Ещё в платном ряду', '60 % валюты бесплатного ряда по каждому виду и три сундука странника — docs/content/пропуск-и-награды.md']));
  T.push(cells(['Чего нет', 'очков и ступеней, облика, героев, рунных ключей и душ']));
  TBL.pass = T.join('\n');

  // предложения
  T = head(['Предложение', 'Когда открывается', 'Живёт', 'Сколько раз', 'Цена', 'Внутри', 'К базовому курсу']);
  for (const o of OFFERS.list) {
    const K = OFFERS.kinds[o.of], X = tierOf(o.tier), en = o.get.filter(x => x[0] === 'enerium').reduce((a, x) => a + x[1], 0);
    const life = K.life === 'week' ? 'до недельной отсечки' : K.life % 86400 === 0 ? `${K.life / 86400} суток` : `${K.life / 3600} ч`;
    T.push(cells([`${K.n}${o.cycle ? ' · цикл ' + ROMAN[o.cycle] : ''}`, K.what, life, String(K.limit), both2(X), getTxt(o.get), `×${dec(en * baseT.rub, baseEn * X.rub, 2)}`]));
  }
  TBL.offers = T.join('\n');

  // реклама
  T = head(['Что', 'Значение']);
  T.push(cells(['Награда за ролик', `${ADS.perView} Энериума — за досмотренный ролик до ${ADS.sec} секунд`]));
  T.push(cells(['Роликов в сутки', `до ${ADS.dayCap} — одинаково для всех (§1.2: дневные капы одинаковы)`]));
  T.push(cells(['Энериума в день', `до ${adsDay} — сверх ручейка игрой`]));
  T.push(cells(['Как', 'только по выбору игрока: попап спрашивает, «Не сейчас» — без последствий; награду засчитывает сервер по подтверждению рекламной сети']));
  TBL.ads = T.join('\n');

  // для сравнения: что стоит Энериум
  T = head(['Трата Энериума', 'Цена', 'Базовым курсом — рублей / долларов']);
  const inRub = en => Math.ceil(en * baseT.rub / baseEn), inUsd = en => Math.ceil(en * baseT.usd / baseEn);
  const spend = [['Прокрутка «Возрождения душ»', RS.rules.spin], ['Первый донатный герой цикла', RS.rules.stub.donatPrice[0]], ['Весь донатный сет цикла', RS.rules.stub.donatPrice.reduce((a, v) => a + v, 0)], ['Друза Энериума', 10000]];
  for (const [n, en] of spend) T.push(cells([n, fmt(en), `${rub(inRub(en))} / ${usd(inUsd(en))}`]));
  TBL.worth = T.join('\n');

  // арт
  T = head(['Что', 'Лист · клетка', 'Файл в art/generated/', 'Выгрузка в design/ui/assets/art/', 'Выгружено']);
  for (const r of art.rows) T.push(cells([r.use, r.cell ? `${r.job} · ${r.cell}` : r.job, r.from ? '`' + r.from + '`' : '—', '`' + r.to + '`', r.out ? 'да' : 'нет — заглушка CSS']));
  T.push(cells(['Всего', '', `${art.n} запросов`, `$${String(art.cost.toFixed(3)).replace('.', ',')}`, '']));
  TBL.art = T.join('\n');

  return { data, tables: TBL, err, warn, oncePrice, onceSum, onceMax, x17, keysDay, soulsDay, baseEn, paidEn, art };
}

/* ================================ ВЫВОД ================================ */

function render(data) {
  const rules = fs.readFileSync(FILES.rules, 'utf8').replace(/\r\n/g, '\n');
  const head = `/* Лавка Энериума — данные прототипа «Свет снизу». Собирает tools/content-gen/store/build.js: сетка цен, пять разовых наборов,
   пять комплектов Энериума, три выдачи, платный ряд пропуска, лимитированные предложения, реклама за Энериум. Руками не править:
   пересборка затрёт правку. Числа — демонстрация, только целые; цены — рубли и центы доллара.
   rate — курс автора: 1 рубль = 1 Энериум (ADR-0047); tiers — ступени цен;
   chain — разовые наборы, прежние «стартовые» (ключ данных прежний): steps — наборы, get — состав без удвоения, x — удвоение самой
   первой покупки разового набора, одно на игру, набор выбирает игрок (ADR-0054); порядок покупки — любой;
   packs — комплекты Энериума: en — база по курсу, bonusBp — прибавка, firstX — удвоение первой покупки, раз на комплект;
   subs, pass, offers, ads — витрина; art — пути картинок и выгруженные (ready); demo — демо-аккаунт; econ — итоги расчёта.
   Обоснование — docs/content/монетизация.md.
   В игре что продаётся, по какой цене и что придёт, решает сервер: платёж проводит платформа, сервер проверяет квитанцию и выдаёт товар
   один раз (§32, §36.16). Ниже данных — алгоритм tools/content-gen/store/rules.js как есть. */\n`;
  return head + 'window.EN_STORE = ' + JSON.stringify(data) + ';\n' + rules;
}
const markA = k => `<!-- @таблица ${k} — вывод tools/content-gen/store/build.js, руками не править -->`, markB = k => `<!-- /таблица ${k} -->`;
function withTables(doc, tables) {
  const nl = doc.includes('\r\n') ? '\r\n' : '\n';
  for (const [k, t] of Object.entries(tables)) {
    const a = doc.indexOf(markA(k)), b = doc.indexOf(markB(k));
    if (a < 0 || b < a) return null;
    doc = doc.slice(0, a + markA(k).length) + nl + nl + t.replace(/\n/g, nl) + nl + nl + doc.slice(b);
  }
  return doc;
}

module.exports = { build, render, withTables, markA, markB, FILES, RATE, TIERS, ONCE, SEGMENTS, PACKS, SUBS, PASS, OFFERS, ADS, LAWS, DEMO, ART };

if (require.main === module) {
  const R = build();
  for (const w of R.warn) console.log('предупреждение: ' + w);
  if (process.argv.includes('--print')) {
    if (R.err.length) console.log('ОШИБКИ:\n' + R.err.join('\n'));
    for (const [k, t] of Object.entries(R.tables || {})) console.log(`\n### ${k}\n\n${t}`);
    process.exit(R.err.length ? 1 : 0);
  }
  if (R.err.length) { console.log('ОШИБКИ:\n' + R.err.join('\n')); process.exit(1); }
  const js = render(R.data);
  const docOld = fs.existsSync(FILES.doc) ? fs.readFileSync(FILES.doc, 'utf8') : null;
  const docNew = docOld ? withTables(docOld, R.tables) : null;
  if (process.argv.includes('--check')) {
    const okJs = fs.existsSync(FILES.out) && fs.readFileSync(FILES.out, 'utf8') === js, okDoc = !!docNew && docNew === docOld;
    console.log(okJs && okDoc ? 'Свежие: store.js и таблицы документа совпадают со сборкой.' : `Устарели: ${[!okJs && 'design/ui/store.js', !okDoc && 'docs/content/монетизация.md'].filter(Boolean).join(', ')} — пересобрать.`);
    process.exit(okJs && okDoc ? 0 : 1);
  }
  fs.writeFileSync(FILES.out, js);
  if (docNew) fs.writeFileSync(FILES.doc, docNew);
  else console.log(`предупреждение: в ${path.relative(ROOT, FILES.doc)} нет меток таблиц — таблицы не вставлены`);
  const C = R.onceMax;
  console.log(`Собрано: курс ${RATE.rub} ₽ = ${RATE.en} Энериум, малый набор — ${fmt(R.baseEn)}; разовые наборы ${fmt(R.oncePrice.rub)} ₽, удвоен самый большой — ключи ${C.keys}, души ${fmt(C.souls)}, Энериум ${fmt(C.enerium)}; к концу цикла II плательщик ×${dec(R.x17.keys, 100, 2)} по ключам, ×${dec(R.x17.souls, 100, 2)} по душам. Энериум платного ряда — ${R.paidEn}. Арт: ${R.art.n} запросов, $${R.art.cost}.`);
}
