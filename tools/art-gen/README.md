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

Задания сеткой: способности — `jobs/spell-icons-<школа>.json`, фарм с «Тысячей птиц» и «способность скрыта» — `jobs/spell-icons-farm.json`; талисманы — `jobs/talisman-icons.json`; снаряжение — `jobs/equip-icons.json`. Язык иконок и уроки — `art/style/style.md`.

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

- `frames` — лист рамок: у каждой рамки тело (квадрат без рогов и зубцов) приводится к 200 из 256 px холста, окно — в ‰ тела (`CR_ART.frames`); углы холста — точка альфы 9, чтобы выгрузка не срезала поле. `--tone` — поправка тона (кость и латунь модель рисует слишком ярко).
- `disc` — круглая вещь сверху в квадрат по центру; `hole` — прозрачная середина (пьедестал), ‰ радиуса.
- `book` — страница для `border-image` из разворота гримуара: корешок и лента вырезаются, шов сглаживается; срезы страницы — `CR_ART.page`.
- Выгрузка — `ui-art.json` → `design/ui/assets/art/craft/`, пути — `CR_ART.ready` в `design/ui/screens/crafthall.js`. Проверка — `node tools/content-gen/screens/check_crafthall.js`.
