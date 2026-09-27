# Генераторы черновиков контента

Скрипты, из которых собраны черновики в `docs/content/` и данные окна «Древо рецептов». Черновики правятся здесь, в исходниках, а не в собранных файлах: иначе следующая сборка затрёт правку.

## Рецепты, ресурсы, дроп

Папка `recipes/`, нужен Node.

- `common.js` — ремёсла, ярусы, параметры дропа. Числа — демонстрация, шансы в базисных пунктах.
- `data1.js`, `data2.js`, `data3.js` — циклы I–II, III–IV, V–VI: биомы, ресурсы, лор.
- `build.js` — схема рецептов цикла и проверки: всё достижимо, не больше шести ячеек и 100 в ячейке.
- `emit.js`, `tables.js` — вывод `design/ui/recipes.js` и таблиц `tables.md`.
- `doc-a.md` … `doc-d.md` — текст документа с местами для таблиц `@@имя@@`.
- `assemble.js` — склейка текста и таблиц в `docs/content/ресурсы-рецепты-дроп.md`.

Сборка:

```bash
cd tools/content-gen/recipes && node build.js && node assemble.js
```

## Герои

Исходник — markdown `docs/content/герои/цикл-N.md`. Оба скрипта читают его и ничего в нём не меняют. Нужен Python 3.
- `heroes/build_heroes.py` собирает `docs/content/герои/герои.csv`, проверяет сеты — 5 героев и бюджет доблести 15 — и печатает распределения по классам, стихиям и расам.
- `heroes/export_ui.py` выгружает героев и сеты в `design/ui/heroes.js` для раздела «Герои» в UI-ките. В выгрузке: витрина, роль, обрывки, главы, бонусы сетов, мотивы дедукции и заметки команды.

```bash
python tools/content-gen/heroes/build_heroes.py
python tools/content-gen/heroes/export_ui.py
```

После правки циклов запускайте оба скрипта.

## Способности

Папка `abilities/`, нужен Python 3.
- `extract.py` выгружает таблицу автора `source-data/Enerium_Способности_элементов.xlsx` в `source.json`. Оригинал не меняется.
- `library.py` собирает библиотеку способностей по ADR-0015: восемь наборов — семь школ и «Без школы» — по восемь видов в трёх ступенях по числу целей, ульты, пассивки и реакции, общий набор фарма. Пишет `library.json` для ядра, черновик `docs/content/библиотека-способностей.md` и `design/ui/abilities.js` — раздел «Библиотека способностей» в UI-ките. Проверяет, что названия не повторяются, каждое из 72 названий таблицы использовано один раз, а контроль, дебафф и бафф у наборов свои.

- `assign.py` распределяет библиотеку по героям из `docs/content/герои/герои.csv` и по врагам Мастерской (ADR-0016). Пишет `kits.json` и черновик `docs/content/распределение-способностей.md`. Проверяет, что двух одинаковых наборов нет. Наборы попадают в карточку героя UI-кита через `heroes/export_ui.py` — запускайте его после `assign.py`.

```bash
python tools/content-gen/abilities/extract.py
python tools/content-gen/abilities/library.py
python tools/content-gen/abilities/assign.py
python tools/content-gen/heroes/export_ui.py
```

## Экономика

`economy/economy.py` — калькулятор к `docs/content/экономика-золото-дух.md`: цена уровней и кругов героя, доход забега, сроки. Числа — данными в начале файла, только целые. Флаг `--sim` перемеряет бой через Node и `design/ui/battle.js`. Нужен Python 3.

```bash
python tools/content-gen/economy/economy.py
```
