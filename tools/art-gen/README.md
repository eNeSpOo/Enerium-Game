# Генерация арта через Gemini API

Скрипт рисует арт в стиле автора (`art/style/style.md`) по заданиям из `jobs/`. Картинки ложатся в `art/generated/<категория>/`, каждая — с записью в `art/generated/manifest.json`: файл, категория, промт, референсы, модель, дата, параметры, токены, цена.

## Ключ

`GEMINI_API_KEY` — в файле `.env` в корне репозитория. Файл в `.gitignore`. Скрипт ключ не печатает. Без ключа работает только `--dry-run`.

## Запуск

Python 3.11 с `requests`, `Pillow`, `numpy`.

```
python tools/art-gen/gen.py jobs/refs-6.json --dry-run          # промты и цена без запросов
python tools/art-gen/gen.py jobs/refs-6.json                    # все задания на моделях из файла
python tools/art-gen/gen.py jobs/refs-6.json --only hero-ilmerra --models pro
python tools/art-gen/gallery.py                                 # пересобрать art/generated/gallery.html
```

Повторный запуск не перезаписывает: рядом появится `…__pro-v2`.

## Задания

`jobs/*.json` — данные, а не код:
- `style` — общий стиль;
- `categories` — формат, пропорции, размер, референсы стиля, нужна ли прозрачность;
- `jobs` — предмет: `id`, категория, название, источник в репозитории, описание.

Промт = стиль + формат категории + предмет + правило фона + запреты.

## Модели и цены

**Решение автора (ADR-0009):** основная — Nano Banana 2 (`nb2`), Pro — точечно для сложных сцен (`--models pro`), Lite не берём. Если в файле заданий нет списка моделей, скрипт берёт `default` из `models.json`. Файл `jobs/refs-6.json` — сравнение трёх моделей, поэтому в нём все три.

Проверено 26.09.2026 по [прайсу](https://ai.google.dev/gemini-api/docs/pricing) и списку моделей этого ключа. Числа — в `models.json`.

| Псевдоним | Модель | 1K | 2K | 4K |
|---|---|---|---|---|
| `pro` | Nano Banana Pro, `gemini-3-pro-image` | $0,134 | $0,134 | $0,24 |
| `nb2` | Nano Banana 2, `gemini-3.1-flash-image` | $0,067 | $0,101 | $0,151 |
| `lite` | Nano Banana 2 Lite, `gemini-3.1-flash-lite-image` | $0,034 | — | — |

- Пакетный режим (Batch API) вдвое дешевле, ответ — до 24 часов.
- Бесплатного уровня у моделей картинок нет.
- Nano Banana (`gemini-2.5-flash-image`) устарела, отключение 02.10.2026. Imagen этому ключу не выдаётся.
- Факт по счётчикам токенов чуть выше прайса: Pro добавляет размышления, около $0,01.

**Квоты.** Google больше не публикует общие числа. Лимиты зависят от уровня проекта и видны в AI Studio, на странице лимитов проекта. Уровни:
- Tier 1 — привязан платёжный аккаунт, потолок трат $250;
- Tier 2 — оплачено $100 и прошло 3 дня, потолок $2 000;
- Tier 3 — оплачено $1 000 и прошло 30 дней.

## Прозрачность

Модели рисуют шахматку вместо альфы. Поэтому категории с `cutout`:
1. генерируются на ровном пурпурном ключе `#FF00FF` (правило `cutout_rule` в задании);
2. исходник сохраняется как `….raw.jpg` или `….raw.png`;
3. `cutout.py` вырезает ключ, восстанавливает цвет полупрозрачного края и снимает пурпурный отсвет;
4. проверка пишется в манифест: углы прозрачные, доля прозрачного, остаток ключа на объекте, ровность фона исходника. Шахматку ловит последняя: у нарисованной шахматки рамка исходника не совпадает с ключом.

Галерея показывает прозрачные картинки на тёмном и на светлом фоне.


## Иконки сеткой

Мелкие иконки рисуем листом, а не по одной. У задания листа есть `grid` — `[столбцы, строки]` — и `cells` — `[id, имя файла]` по строкам сверху, в строке слева направо. Модель рисует клетки на пурпурных швах `#FF00FF`; `grid_slice.py` находит швы, режет клетки и срезает кайму шва:

```
python tools/art-gen/gen.py jobs/spell-icons-fire.json
python tools/art-gen/grid_slice.py jobs/spell-icons-fire.json spell-fire-active art/generated/spell-icons/spell-fire-active__nb2.jpg
```

- Лист 3:2 4K — сетка 6×4, клетка около 790 px. Лист 1:1 2K — сетка 4×4, клетка около 485 px. Лист 21:9 4K — сетка 7×3, клетка около 840 px. Малый лист 1:1 1K — сетка 2×2, клетка около 480 px. Иконке в игре хватает 256 px.
- Клетки — WebP в `art/generated/<категория>/<id задания>/`. Опись `cells.json`: лист, рамка каждой клетки, остаток пурпура.
- Если швы не нашлись, скрипт режет на равные доли и предупреждает. Такой лист смотрим глазами.
- Фиолетовый свет (Тьма, эпическая редкость) скрипт считает пурпуром шва: предупреждение «пурпура в клетке» у таких клеток ложное.
- Названий в промте нет: иначе модель подписывает клетки.

Каждый лист смотрим сами — целиком и на доске в игровых размерах:

```
python tools/art-gen/icon_board.py art/generated/spell-icons/spell-earth-active/cells.json --out доска.png
python tools/art-gen/icon_board.py <cells.json> <cells.json> --cols 8 --sizes 96,48,32 --out доска.png
```

Рамки доски — как в интерфейсе: активка — железо, ульта — золото, пассивка — круг, реакция — ржавая кромка, снаряжение — цвет редкости.

**Слабая клетка** — шум без предмета, непонятная форма, повтор соседа, надпись — перерисовывается малым листом: задание с «fix» в id (`jobs/spell-icons-fix.json`, `tal-fix` в `jobs/talisman-icons.json`). На одном малом листе можно собрать клетки разных наборов, если у каждой клетки палитра названа в скобках. Лист целиком повторяем не больше двух раз. Клетку, поправленную обработкой, кладём рядом как `<имя>.fix.webp` — она заменяет исходную.

**Выгрузка в прототип:**

```
python tools/art-gen/ui_icons.py                                        # опись ui-icons.json: итоговая клетка на каждую иконку
python tools/art-gen/export_ui.py --spec ui-icons.json --no-stamp --quiet
```

`ui_icons.py` берёт клетки больших листов, поверх — клетки листов переделки и `.fix.webp`, и проверяет, что иконка есть у каждой способности библиотеки, линейки талисмана и шаблона снаряжения. `export_ui.py` читает обе описи — `ui-art.json` (арт экранов) и `ui-icons.json` (иконки сеткой); `--spec` выгружает одну. Иконки — WebP 256 px в `design/ui/assets/art/spells`, `tal`, `gear`; пути строят помощники `abArt`, `talIcon`, `eqIcon` (`design/ui/screens/art-icons.js`). Проверка — `node tools/content-gen/screens/check_icons.js`.

Задания сеткой: способности — `jobs/spell-icons-<школа>.json`, фарм с «Тысячей птиц» и «способность скрыта» — `jobs/spell-icons-farm.json`; талисманы — `jobs/talisman-icons.json`; снаряжение — `jobs/equip-icons.json`; ресурсы — `jobs/res-icons-<цикл>.json` и переделка `jobs/res-icons-fix.json`, их собирает `res_jobs.py` из поля `art` предметов `design/ui/recipes.js`. Язык иконок и уроки — `art/style/style.md`.

Светлая палитра даёт насыщенный конус света снизу — мяту вместо «белого с прозеленью». Полосу оттенков приглушает `hue_fix.py` без новой генерации: клетка с конусом получает рядом `<имя>.fix.webp`, выгрузка берёт его.

```
python tools/art-gen/res_jobs.py                                                  # задания ресурсов из recipes.js
python tools/art-gen/hue_fix.py "art/generated/res-icons/res-I-*/cells.json" --dry-run   # какие клетки поправит
```

## Залы и вещи «Ремесла»

Задание — `jobs/craft-hall.json`: пять залов окон (21:9 2K), стол, гнездо, пьедестал, горн, помост, уголок, печать Этриона, подушка, табличка, прилавок, навес, лист рамок иконки предмета, лист частиц, пергамент, гримуар. Нарезка и геометрия — `craft_layers.py`:

```
python tools/art-gen/craft_layers.py frames art/generated/cr-sheet/cr-frames__nb2.png 4 2 res key boss made call rune karst city --tone call:74:60,made:88:85,res:118:100,city:135:105,rune:112:100
python tools/art-gen/craft_layers.py sheet art/generated/cr-sheet/cr-fx__nb2.png 3 2 ember glint shard mote smoke ash
python tools/art-gen/craft_layers.py corners art/generated/cr-part/cr-corner__nb2.png
python tools/art-gen/craft_layers.py disc art/generated/cr-disc/cr-table__nb2.png art/generated/cr-disc/cr-socket__nb2.png art/generated/cr-disc/cr-core__nb2.png art/generated/cr-disc/cr-hearth__nb2.png
python tools/art-gen/craft_layers.py wide art/generated/cr-part/cr-dais__nb2.png art/generated/cr-part/cr-seal__nb2.png art/generated/cr-part/cr-cushion__nb2.png art/generated/cr-strip/cr-plate__nb2.png
python tools/art-gen/craft_layers.py book art/generated/cr-book/cr-grim__nb2.png 430 950
python tools/art-gen/shelf_layers.py strip art/generated/cr-strip/cr-counter__nb2.png art/generated/cr-strip/cr-awning__nb2.png
python tools/art-gen/shelf_layers.py tile art/generated/cr-texture/cr-vellum__nb2.jpg
python tools/art-gen/export_ui.py --spec ui-art.json --no-stamp
```

- `frames` — лист рамок: у каждой рамки тело (квадрат без рогов и зубцов) приводится к 200 из 256 px холста, окно — в ‰ тела; углы холста — точка альфы 9, чтобы выгрузка не срезала поле. `--tone` — поправка тона (кость и латунь модель рисует слишком ярко). Рамки предмета по виду сняты словом автора 30.09.2026: рамка одна на все предметы и рисуется CSS (`design/ui/screens/art-icons.css`, «Рамка предмета»), прототип картинки `craft/frame-*.png` не берёт.
- `disc` — круглая вещь сверху в квадрат по центру; `hole` — прозрачная середина (пьедестал), ‰ радиуса.
- `book` — страница для `border-image` из разворота гримуара: корешок и лента вырезаются, шов сглаживается; срезы страницы — `CR_ART.page`.
- Выгрузка — `ui-art.json` → `design/ui/assets/art/craft/`, пути — `CR_ART.ready` в `design/ui/screens/crafthall.js`. Проверка — `node tools/content-gen/screens/check_crafthall.js`.

## Книга рецептов Мастерской

Задание — `jobs/recipe-book.json`: раскрытый гримуар во всё окно (21:9 2K, ключ пурпурный), три полосы древнего листа найденного рецепта — короткая, средняя, длинная, каждая своим заданием в своём холсте (21:9 и 4:1, ключ чёрный: светлая бумага на чёрном режется чисто), девять обрывков сеткой 3 × 3. Урок: три полосы на одном квадратном холсте модель рисует слишком высокими (2,7–3,5 : 1); пропорцию полосы задаёт холст и доля пустого фона сверху и снизу.

```
python tools/art-gen/rbook_layers.py                                  # нарезка, геометрия и размеры выгрузки — печатает JSON
python tools/art-gen/export_ui.py --spec ui-art.json --no-stamp
```

- Полосы и обрывки обрезаются по альфе больше 8 — так же, как режет поля `export_ui.py`: рамка картинки и выгрузки одна. Размер выгрузки подбирается так, чтобы высота в целых px дала пропорцию рисунка точнее всего: ничто не тянется неравномерно.
- Книга: полупрозрачная кромка обложки перекрашивается в тёмную кожу (ключ оставлял зелёный отлив); поле страниц — внутри двойной золотой линейки, `RB_ART.book.page`.
- Выгрузка — `design/ui/assets/art/rbook/`, пути и размеры — `RB_ART` в `design/ui/screens/recipe-book.js`. Проверка — `node tools/content-gen/screens/check_recipe_book.js`: размер файла — как в `RB_ART`.

## Страницы книги героя

Задания — `jobs/hero-book-pages.json` (лист восьми рамок значков 4 × 2 на чёрном ключе: активная, ульта, пассивка, реакция, место снаряжения, талисман, буквица, замок; лист закладок и кнопок 2 × 2 на пурпурном) и `jobs/hero-book-ink.json` (шесть чернильных виньеток пером на белом, без вырезки). Нарезка и выгрузка:

```
python tools/art-gen/craft_layers.py frames art/generated/pg-sheet/pg-frames__nb2.png 4 2 act ult pas react gear tal cap lock --tone ult:86:78,cap:86:78
python tools/art-gen/craft_layers.py sheet art/generated/pg-parts/pg-parts__nb2.png 2 2 tab tab-on btn btn2
python tools/art-gen/page_layers.py tongue art/generated/pg-parts/pg-parts__nb2-tab.png art/generated/pg-parts/pg-parts__nb2-tab-on.png
python tools/art-gen/page_layers.py ink art/generated/pg-ink/pg-ink__nb2.jpg 3 2 head div corner cartouche tail wreath
python tools/art-gen/export_ui.py --no-stamp
```

- `ink` — белое уходит в прозрачность с восстановлением цвета чернил («цвет в альфу»): на пергаменте разворота остаются одни чернила, шум бумаги — в ноль; виньетки режутся по пятнам, близкие точки пера — одна виньетка.
- `tongue` — из вырезанной закладки-«папки» — верхний язычок до плеч; срезы `border-image` — от краёв язычка.
- Окна рамок, срезы и полосы — `PG_ART` в `design/ui/screens/book-pages.js`, выгрузка — `ui-art.json` → `design/ui/assets/art/pages/`. Не выгружены: рамка места снаряжения (толстая кромка съедает значок в 40 px — лунку рисует CSS), замок (нормализация рамки ломает дужку), уголок страницы.

## Покои Странника

Задание — `jobs/wanderer-chambers.json`: пять залов вкладок «Странника» (21:9 2K), рама зеркала Памяти, ниша колонки, уголок, герб, табличка, карниз, лист медальонов тем достижений, лист артефактов реликвария (5 × 4 на пурпурных швах), частицы, базальт и холодный пергамент. Нарезка:

```
python tools/art-gen/chambers_layers.py mirror art/generated/cb-frame/cb-mirror__nb2.png
python tools/art-gen/chambers_layers.py clean art/generated/cb-part/cb-corner__nb2.png art/generated/cb-part/cb-crest__nb2.png art/generated/cb-strip/cb-plate__nb2.png
python tools/art-gen/chambers_layers.py crop art/generated/cb-strip/cb-plate__nb2.clean.png 96 256 1490 410
python tools/art-gen/chambers_layers.py strip art/generated/cb-strip/cb-ledge__nb2.raw.jpg 226 346
python tools/art-gen/craft_layers.py corners art/generated/cb-part/cb-corner__nb2.clean.png
python tools/art-gen/craft_layers.py wide art/generated/cb-part/cb-crest__nb2.clean.png
python tools/art-gen/craft_layers.py sheet art/generated/cb-sheet/cb-medals__nb2.png 4 3 descent guard craft echo week wand heroes valor souls first myst wreath
python tools/art-gen/craft_layers.py sheet art/generated/cb-fx/cb-fx__nb2.png 3 2 sand glint sliver time gold mist
python tools/art-gen/grid_slice.py jobs/wanderer-chambers.json cb-arts art/generated/cb-icons/cb-arts__nb2.jpg
python tools/art-gen/shelf_layers.py tile art/generated/cb-texture/cb-basalt__nb2.jpg
python tools/art-gen/shelf_layers.py tile art/generated/cb-texture/cb-vellum__nb2-v2.jpg
python tools/art-gen/export_ui.py --spec ui-art.json --no-stamp
```

- `mirror` — рама для `border-image` из девяти частей: углы C × C как есть, стороны — образец сразу за углом, сведённый в бесшовную петлю, низ — отражённый верх (у подножия модель рисует кристаллы); стекло вырезано по толщине рамы — где кончается бархат, ищем по цвету. Рядом — `.glass.jpg`, само стекло. Геометрия — `CB_ART.mirror`: срез угла в px выгрузки, толщина рамы — ‰ угла.
- `clean` — оставить только крупные пятна альфы: крошки песка вокруг вещи на чёрном ключе — прочь.
- `strip` — полоса во всю ширину из исходника без вырезки, концы сведены в бесшовную петлю (карниз).
- Выгрузка — `ui-art.json` → `design/ui/assets/art/chambers/`, пути — `CB_ART.ready` в `design/ui/screens/chambers.js`, иконки артефактов и медальоны — `WN_ART.icons` в `design/ui/screens/wanderer.js`. Проверка — `node tools/content-gen/screens/check_chambers.js`.

## Лавка Энериума

Задание — `jobs/store.json` (правило автора для донатных окон — «дорого-богато»): три листа вещей 3 × 2 на чёрном ключе и зал 21:9 2K. Листы: стартовые наборы I–V и печать платного ряда, пять наборов Энериума и знак рекламы, три чаши выдачи и три предложения. Вся витрина — четыре запроса, $0,41. Нарезка и выгрузка:

```
python tools/art-gen/gen.py jobs/store.json --dry-run
python tools/art-gen/gen.py jobs/store.json --budget 1
python tools/art-gen/craft_layers.py sheet art/generated/st-sheet/st-starter__nb2.png 3 2 start1 start2 start3 start4 start5 seal
python tools/art-gen/craft_layers.py sheet art/generated/st-sheet/st-packs__nb2.png 3 2 en1 en2 en3 en4 en5 ad
python tools/art-gen/craft_layers.py sheet art/generated/st-sheet/st-subs__nb2.png 3 2 sub1 sub2 sub3 path week fest
python tools/art-gen/export_ui.py --spec ui-art.json --no-stamp
```

- **Язык вещей:** рунные ключи — тёмное железо с ушком-колесом, души — бледно-голубое пламя в стекле, Энериум — зелёные кристаллы времени; богатство растёт слева направо: котомка, ларец, окованный ларец, реликварий, сокровищница; у Энериума — горсть, мешочек, шкатулка, сундук, друза. Все три листа вышли с первого раза.
- **Арт в пьедестале лежит по коробке** (`position:absolute`): процент высоты у элемента сетки не держится, картинка вылезает на подпись.
- Выгрузка — `ui-art.json` → `design/ui/assets/art/store/`, пути — `EN_STORE.art` (`tools/content-gen/store/build.js`, `ART`); сборщик берёт список выгруженного из папки сам. Проверка — `node tools/content-gen/screens/check_store.js`.

## Убежище и оболочка

Задание — `jobs/shelter.json`: кромка оболочки (полоса во всю ширину, ключ black), вывеска дела и рама главной кнопки «Спуститься» (`border-image`, ключ magenta), лист мелких вещей 3 × 3 (узел стыка, гнездо картинки раздела, ромб, заклёпка, цепь, ушко, кристаллы, завиток, уголок), фонарь переднего плана (ключ black-glow), кованое железо (плитка). Сцену Убежища — фон, проводников и мебель — дал автор (§28.1): их не перерисовываем. Нарезка:

```
python tools/art-gen/shelf_layers.py strip art/generated/sh-strip/sh-edge__nb2.png
python tools/art-gen/shelter_layers.py rot art/generated/sh-strip/sh-edge__nb2.strip.png
python tools/art-gen/craft_layers.py wide art/generated/sh-plate/sh-sign__nb2.png art/generated/sh-plate/sh-cta__nb2.png
python tools/art-gen/shelter_layers.py sign art/generated/sh-plate/sh-sign__nb2.trim.png 262:362,1150:1250 60 640
python tools/art-gen/shelter_layers.py despill art/generated/sh-plate/sh-sign__nb2.trim.plate.png 160
python tools/art-gen/shelter_layers.py tone art/generated/sh-plate/sh-sign__nb2.trim.plate.edge.png 86 80
python tools/art-gen/shelter_layers.py tone art/generated/sh-plate/sh-cta__nb2.trim.png 84 78
python tools/art-gen/craft_layers.py sheet art/generated/sh-parts/sh-parts__nb2.png 3 3 knot frame diamond rivet chain ring crystal flourish corner
python tools/art-gen/shelf_layers.py tile art/generated/sh-tex/sh-iron__nb2.jpg
python tools/art-gen/export_ui.py --spec ui-art.json --no-stamp
```

- `sign` — у вывески ушки для цепей стоят над рамкой в растягиваемой середине: `border-image` размазал бы их по всей длине. Ушки стираются, полоса рамки под ними заменяется чистой полосой того же уровня, верх срезается; цепи рисует интерфейс.
- `despill` — на пурпурном ключе модель обводит контур сиреневой кромкой света и зелёной дымкой: дымка — прочь, сиреневое у самого края — прочь, глубже — в серое той же яркости.
- `tone` — старое золото модель рисует ярче палитры: яркость и насыщенность ниже.
- `rot` — кромка для шахты: полоса, повёрнутая против часовой, свет карста — справа, к экрану.
- Из листа мелких вещей в выгрузку пошли узел, гнездо, ромб, цепь, завиток и уголок; заклёпка, ушко и кристаллы — в запасе (у кристаллов на чёрном ключе тёмный ореол — `shelter_layers.py unhalo`).
- Срезы `border-image` — px выгрузки: `SH_ART.sign`, `SH_ART.cta` в `design/ui/screens/shelter.js`. Выгрузка — `ui-art.json` → `design/ui/assets/art/shelter/` и `shell/`. Проверка — `node tools/content-gen/screens/check_shelter.js`: размеры рисунков на диске сверяются с описью.
- 01.10.2026 оболочка стала тонкой (слова автора: «линии… слишком толстые… рамки тоже толстые»): кромки `edge`, `edge-v`, узел и гнездо разделов сняты с выгрузки, их рисует CSS одной нитью; в выгрузке остались ромб и железо.

## Оболочка и «Спуск»: значки кнопок

Задание — `jobs/shell-descent.json`: один лист 3 × 3 на 1K (ключ black-glow) — колокол Входящих, «Дар дня», «Пропуск», «Чат», замок закрытого раздела, бестиарий, этажи, босс биома, рунный страж. Значок — предмет крупно, толстые простые формы, читается с 20 px; рамку и состояние кнопки даёт интерфейс. Лист 1K за $0,07 вышел с первого раза: клетки около 340 px, значку в 128 px хватает.

```
python tools/art-gen/gen.py jobs/shell-descent.json --dry-run
python tools/art-gen/gen.py jobs/shell-descent.json --budget 0.2
python tools/art-gen/craft_layers.py sheet art/generated/sd-sheet/sd-glyphs__nb2.png 3 3 bell gift pass chat lock best floors boss guard
python tools/art-gen/export_ui.py --spec ui-art.json --no-stamp
```

- Выгрузка — `ui-art.json` → `design/ui/assets/art/shell/ico-<имя>.png`, 128 px, `fit: 100`. Пути — `SHL_ART.ico` и `SHL_ART.ready` (`design/ui/screens/shell.js`); флаг `shla-ico` ставится, только когда выгружены все пять значков кнопок оболочки, — иначе у всех SVG. «Спуск» берёт свои знаки оттуда же (`DS_DATA.ico`, `shlIco`).
- Проверки — `check_shelter.js` (пути на диске и в описи, флаги) и `check_shell.js` (раздел 10: толщины, портрет, состояния кнопок).

## Сундуки режимов

Задание — `jobs/chest-sheets.json`: на режим (вид сундука `EN_LOOTBOXES`) лист 4 × 2 на 21:9 4K — семь редкостей сундука и его навесной замок на ровном пурпуре, без швов. Образец — прежний сундук этого режима из `jobs/chests.json`. Нарезка и выгрузка:

```
python tools/art-gen/gen.py jobs/chest-sheets.json --only chs-keys --budget 0.2
python tools/art-gen/chest_layers.py sheets --only chs-keys --preview <папка вне репозитория>
python tools/art-gen/chest_layers.py spec                   # опись в ui-art.json и геометрия для CO_ART.sets
python tools/art-gen/export_ui.py --spec ui-art.json --no-stamp
```

- `sheets` — вырезка пурпура из исходника `…raw.jpg` с защитой середины: фон — сильный ключ, связанный с краем листа, и закрытые окна от 300 px (просвет верёвочной ручки); край и ореол кристалла — проекцией на отрезок «цвет рисунка рядом — ключ», фиолетовый камень эпической клетки (`protect`, по умолчанию клетка 4) непрозрачен; тонкие линии сетки во всю высоту или ширину — в ключ. Затем белая наклейка прочь, восемь пятен по строкам (`craft_layers.cut`), у каждого сундука — шов (сам; поправка — `seams` в разделе `layers.sheets`), корпус и крышка. Выход — `art/generated/chest-sheet/<лист>/r1…r7.png`, `.lid.png`, `.body.png`, `lock.png` и `layers.json`; превью — каждый сундук закрытым и с поднятой крышкой, на тёмном и светлом.
- `spec` — в `ui-art.json` на сундук: корпус и крышка WebP (сундук 960 px в ширину), плитка 256 px — закрытый сундук целиком; на режим — замок 240 px. Печатает `CO_ART.sets` для `design/ui/screens/chest-open.js`: масштаб сцены (сундук около 236 px, как прежний), размер замка, по редкостям рамка, шов, крышка и корпус в px сундука. Пути выгрузки — `chests/<вид>/r<редкость>-body.webp`, `-lid.webp`, `r<редкость>.webp`, `lock.webp`; их список — `CO_ART.ready`.
- Прототип берёт лист режима своей редкости; нет слоя — прежний сундук вида (`CO_ART.chests`), нет и его — заглушка SVG. Плитка сундука в запасах и наградах — `zpChestPic(вид, редкость)` в `screens/bag.js`, в экранах режимов — `chestPic` из `index.html`. Проверка — `node tools/content-gen/screens/check_chest_open.js`: геометрия — как в `layers.json` и PNG слоёв, сундук в сцене — 200–272 px, пути выгружены, плитки — своей редкости.
- Ответ 4K часто рвётся посреди приёма («[SSL] record layer failure»; у curl со Schannel — «server closed abruptly»): листы — по одному, одна попытка (`gen.RETRIES = 0`). 01.10.2026 после пополнения API нарисованы `chs-talisman` и `chs-craft` — все семь видов сундука теперь листами.
- **Шов не нашёлся сам** — у тёмного лака шкатулки строки корпуса темнее шва: поправка `seams` в разделе `layers.sheets` (px от верха вырезанного сундука), середина тёмной полосы между накладками крышки и корпуса.
- **Правка одной клетки** (`patch` в разделе `layers.sheets`): вырезка вокруг детали на пурпуре уходит модели правкой (`jobs/chest-fix.json`, 1K), её ответ при каждой нарезке вклеивается по мягкому эллипсу (`chest_layers.py`, `apply_patch`: `box` — вырезка в px сундука, `ellipse` — середина и полуоси, `feather` — край). Альфа, шов и рамка сундука не меняются — геометрия `CO_ART.sets` прежняя. Так древний реликварий Эхо (r5) получил в кристалле язык пламени вместо узора, похожего на «S».

## Бой AAA: рамки-квадраты, медальоны эффектов, спрайты, HUD, иконки боя

Задача «Бой AAA» (ADR-0046), всё 01.10.2026 с первого раза, $2,58 вместе с рамками и вторым заходом. Порядок — dry-run, затем запуск с `--budget`, нарезка, выгрузка:

```
python tools/art-gen/gen.py jobs/battle-frames-square.json --budget 1.5      # 11 рамок 1:1 1K
python tools/art-gen/frame_square.py art/generated/battle-frames-square/bfs-*__nb2.png
python tools/art-gen/gen.py jobs/battle-status-icons.json --budget 0.5      # медальоны: два листа 6 × 4, 3:2 4K
python tools/art-gen/grid_slice.py jobs/battle-status-icons.json st-sheet-1 <лист>   # и st-sheet-2
python tools/art-gen/gen.py jobs/battle-vfx.json --budget 0.6               # спрайты на чёрном: vfx-core, vfx-school, vfx-flip
python tools/art-gen/grid_slice.py jobs/battle-vfx.json <лист> <файл>       # каждый лист
python tools/art-gen/vfx_layers.py                                          # альфа из яркости, спрайты, ленты, углы снарядов
python tools/art-gen/gen.py jobs/battle-hud.json --budget 0.6               # медальон раунда, плашка, гербы, рама окна
python tools/art-gen/hud_layers.py                                          # рама без застёжки посередине
python tools/art-gen/gen.py jobs/battle-ability-icons.json --budget 0.2     # иконки боя: лист 3 × 2, 3:2 1K
python tools/art-gen/grid_slice.py jobs/battle-ability-icons.json bab-sheet art/generated/battle-ability-icons/bab-sheet__nb2.jpg
python tools/art-gen/gen.py jobs/battle-frames-square-fix.json --budget 0.15  # рамка стража без насечек — правка исходника
python tools/art-gen/battle_frame.py art/generated/battle-frames-square/bfs-rune-v2__nb2.png
python tools/art-gen/frame_square.py art/generated/battle-frames-square/bfs-rune-v2__nb2.png
python tools/art-gen/gen.py jobs/ability-icons-unique.json --budget 1.0   # уникальные способности: три листа
python tools/art-gen/grid_slice.py jobs/ability-icons-unique.json <лист> art/generated/ability-icons-unique/<лист>__nb2.jpg
python tools/art-gen/export_ui.py --spec ui-art.json --no-stamp --quiet
```

- **Рамки-квадраты** (`frame_square.py`): окно ищет `battle_frame.py`; тело — боковые планки и нижняя плита, верхняя планка дорисована из боковой (нарезка border-image тянет только ровное), венец — всё выше окна. Выгрузка — `bframes-sq/<тип>.png` (тело, 200 px), `<тип>-crest.png` (венец), `<тип>-full.png` (рамка целиком, 320 px — окно сведений и баннер); геометрия — `BS_FRAME` в `design/ui/screens/battle-scene.js`. Фон пришёл белым (`bfs-host`) — вырезать по белому, затем `cutout.remove_key`.
- **Медальоны эффектов** — по пять эффектов восьми школ (урон и лечение со временем, контроль, дебафф, бафф) и восемь особых; выгрузка `st/<имя>.webp` 128 px, ключи — `BS_DATA.st`. Слабая клетка — малым листом 1 × 1 (`jobs/battle-status-fix.json`, 1K, лист-образец в refs): «Старение» Времени вышло теми же песочными часами, что «Остановка», — перерисовано солнечными часами; нарисованный обод клетки срезан полем `crop` описи.
- **Спрайты эффектов** рисуются на чёрном, без пурпура внутри (`vfx_layers.py`): альфа из яркости — свет на арене тот же, что на чёрном, без каймы; квадрат с точкой альфы 9 в углах, иначе выгрузка обрежет поля и спрайт растянется. Ленты flipbook — 7 кадров строки подряд, 1344 × 192. Угол головы снаряда — `VFX_ART.turn` в `design/ui/fx.js`. Выгрузка `vfx/<имя>.webp`, список — `VFX_ART.ready`.
- **HUD** — `bhud/round.png`, `plaque.png`, `panel.png` (нарезка рамы 115 70 115 70), `victory.webp`, `defeat.webp` (гербы на чёрном с ключом black-glow).
- **Правка рамки** (`jobs/battle-frames-square-fix.json`): исходник `…raw.jpg` уходит модели правкой с рамкой листа «Edit the attached picture», в negative — «no tally marks, no notches, no dots in a row»; окно и плита те же, геометрия `BS_FRAME` — новой нарезкой.
- **Иконки уникальных способностей** — `jobs/ability-icons-unique.json`: всё, чего нет в библиотеке (опись — по настоящим боям всех режимов), манерой иконок способностей (style, negative, refs и рамка листа — из `spell-icons-none.json`). Строка листа — один Убер-босс: две активки, пассивка или реакция, две ульты; свет — школы босса. Выгрузка `abu/<имя>.webp` 256 px, таблица id → имя — `BS_ART.abUnique`; проверка сверяет её с клетками задания.
- **Иконки боя** — `jobs/battle-ability-icons.json`, та же манера, что у иконок способностей (style, negative и рамка листа — из `spell-icons-none.json`): обычная атака по виду удара ядра (melee, arrow, magic), по всем, удар стража, отнимающий раунд, и «возвращённое лицо» Многоликого. Выгрузка `bab/<имя>.webp` 256 px — своя папка: в `spells/` только библиотека (`check_icons.js`). Пути — `BS_ART.abIcons`.
- Проверка — `node tools/content-gen/screens/check_battle_scene.js`: файлы на диске и в `ui-art.json` с исходником, лента — столько кадров, сколько в данных.

## Арены этажей

Задача «Переход между этажами» (ADR-0048, слова автора 02.10.2026): этажи биома сменяют арены одного места — по четыре на биом 1–4, нынешняя и три новых участка. Задание — `jobs/arena-floors.json`, 12 картинок 21:9 2K, `--dry-run` — $1,21. Нарисованы 02.10.2026: все 12 с первого раза, $1,24.

```
python tools/art-gen/gen.py jobs/arena-floors.json --dry-run
python tools/art-gen/gen.py jobs/arena-floors.json --only arena-b1-2,arena-b2-2,arena-b3-2,arena-b4-2 --budget 0.5   # пилот: по одной на биом
python tools/art-gen/gen.py jobs/arena-floors.json --only <остальные> --budget 1
python tools/art-gen/arena_floors.py spec                  # опись ui-art.json: arena-bN-K.jpg 1688 × 716 из последней картинки задания
python tools/art-gen/arena_floors.py spec --pick arena-b2-3=arenas/arena-b2-3__nb2-v2.jpg   # свой вариант
python tools/art-gen/export_ui.py --spec ui-art.json --no-stamp
python tools/art-gen/arena_floors.py ready                 # BS_ART.arenaReady в design/ui/screens/battle-scene.js
```

- **Образец каждой арены — нынешняя арена её биома** (`refs` задания): то же место — камера строго сверху, масштаб, зоны, темнота, палитра, материал пола и свет, — но свой участок, свои предметы и места. Рамка категории просит не копировать предметы образца; сюжет участка — из записей сказителя и облика врагов биома (`docs/lore/мастерская-форм-текст.md`, `docs/content/враги-биомов.md`): у Мастерской — месильня, стена набросков, сушильня с холодной печью; у леса — логово у корней, грибная прогалина, стоянка егерей; у Библиотеки — читальня, погрызенный стеллаж, зал больших часов; у Стоун-Хейма — рудничный двор, литейный двор, пошлинный пост.
- Раскладка — как у нынешних арен: четверти карт — ровный пол, детали — в средней половине у верхнего и нижнего края, середина спокойная, края — тонкая полоса не больше 7 % высоты; пол уходит за левый и правый край (поход едет зеркальными копиями арены). Свет и запреты — как у арен биомов: никаких костей, надписей, людей и зверей; в Мастерской огня нет и печь холодная.
- Этаж берёт арену своего биома по номеру: (этаж − 1) по кругу из готовых (`BS_ART.arenas`, `arenaReady`). Нет выгруженной — этаж берёт следующую готовую.
- **Урок:** с образцом в `refs` модель правит сам образец — пол, трещины и источники света остаются на прежних местах, меняются предметы у верхнего и нижнего края. Место читается как то же самое, участок — как другой; на этаже видна именно смена предметов.
- **Порядок 02.10.2026:** `--dry-run`, один запрос — проверка доступа, пилот по одной арене на биом и взгляд глазами, затем остальные восемь. Утром того же дня API отвечал HTTP 400 по региону — см. `docs/art-queue.md`.
- На взгляд автора — `arena-b3-3` (панцирь каменного жука вышел с лапами) и `arena-b1-3` (глиняные рука и спина из стены); перерисовать одну — `gen.py jobs/arena-floors.json --only <id>`, затем `arena_floors.py spec --pick …` и выгрузка.
- Проверка — `node tools/content-gen/screens/check_battle_scene.js`: готовые арены — на диске и в описи, выгруженные — в `arenaReady`.

## Враги крафта Этриона

Задание — `jobs/craft-bosses.json`, портреты 4:5 1K по «Глубокому промту персонажа»; пробная пятёрка — `jobs`, остальные — `backlog` без генерации. Выгрузка — `ui-art.json`: `foes/<id босса>.jpg` 464 × 576; путь в прототипе — `ECH.craftArt` в `design/ui/screens/echo.js` (эхо боссов биомов 1–4 — готовые портреты боссов биомов, пробуждённый — портрет своего босса). Проверка — `node tools/content-gen/screens/check_echo.js`.
