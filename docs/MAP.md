# Карта проекта

Что читать и что запускать по каждой системе игры. Координатор по строке системы пишет задание агенту: список чтения и список файлов. Агент по ней видит, где правило, где данные, где экран и чем проверить.

**Как читать строку:**
- **GDD** — действующее правило. Разделы лежат в `docs/gdd/`, файл начинается с номера раздела; указатель — `docs/gdd/README.md`.
- **ADR** — ключевые решения: слова автора и причина. Что в них уже отменено — `docs/decisions/README.md`. «Ждёт сборки» значит, что правило принято, а данные и экраны ещё прежние.
- **Данные** — собранные файлы `design/ui/*.js`; руками их не правят. Правится сборщик после стрелки «←» и запускается по «Порядку сборки» в `tools/content-gen/README.md`. «Расчёт» — описание и таблицы системы в `docs/content/`.
- **Экраны** — скрипт в `design/ui/screens/`, рядом его `.css`. Устройство экранов — `design/ui/screens/README.md`, прототипа — `design/ui/README.md`.
- **Проверки** — что запустить после правки. Перед коммитом — весь прогон `node tools/run-checks.js`; выборочно — словами из путей: `node tools/run-checks.js echo clan`. Экран смотрят ещё и глазами: `node tools/ui-shots/shots.js`, кадры 932 × 430 и 844 × 390.

Пути — от корня репозитория; что они существуют, сверяет `python tools/docs/check_docs.py`.

## Бой и герои

| Система | GDD | Данные ← сборщик; расчёт | Экраны | Проверки | ADR |
|---|---|---|---|---|---|
| **Бой** — ядро, раунды, агро, эффекты, детерминизм | §5, §6, §34, §36 | Ядро `design/ui/battle.js` и эффекты `design/ui/fx.js` пишутся руками: числа боя — в `RULES` ядра | `design/ui/index.html`, `design/ui/screens/battle-scene.js`, `design/ui/screens/battle-cards.js` | `tools/content-gen/abilities/check_core.js`, `tools/content-gen/screens/check_battle_scene.js`, `tools/content-gen/screens/check_battle_cards.js`; после правки правил боя — перемеры, см. «Порядок сборки» | 0005, 0007, 0010, 0014, 0017, 0020, 0039, 0046, 0048 |
| **Способности** — библиотека и наборы героев и врагов | §4 | `design/ui/abilities.js`, `design/ui/kits.js` ← `tools/content-gen/abilities/`; расчёт — `docs/content/библиотека-способностей.md`, `docs/content/распределение-способностей.md` | «Навыки» в книге героя — `design/ui/screens/book-pages.js`; окно карты в бою — `design/ui/screens/battle-scene.js` | `tools/content-gen/abilities/check_core.js`; `python tools/content-gen/abilities/library.py --check`, `python tools/content-gen/abilities/assign.py --check` и `--mut` | 0004, 0015, 0016, 0017, 0050, 0052 |
| **Герои** — состав, источники, доблесть, главы, ордены и сеты | §3, §10, §30 | `design/ui/roster.js`, `design/ui/heroes.js` ← `tools/content-gen/heroes/`; исходник — `docs/content/герои/`; сеты — `tools/content-gen/economy/sets.py`, `docs/content/сет-бонусы.md` | `design/ui/screens/heroes.js`, `design/ui/screens/library.js`, `design/ui/screens/book.js`, `design/ui/screens/book-pages.js`, `design/ui/screens/hero-dev.js` | `tools/content-gen/screens/check_heroes.js`, `tools/content-gen/screens/check_hero_book.js`, `tools/content-gen/screens/check_hero_dev.js`, `tools/content-gen/screens/check_squads.js` | 0006, 0019, 0021, 0022, 0030, 0032, 0035, 0050, 0054 (ждёт сборки) |
| **Возрождение душ** — рулетка, осколки, прах | §15 | Правила — `rules` в `design/ui/roster.js`; данные рулетки — в её экране | `design/ui/screens/roulette.js` | `tools/content-gen/screens/check_roulette.js` | 0028, 0038, 0047 (ждёт сборки) |
| **Экономика и темп** — золото, дух, сроки циклов, правило ×1,7 | §1, §9, §10 | `tools/content-gen/economy/economy.py`, `tools/content-gen/biomes/pace.py`, `tools/content-gen/cycle/climb.py`; расчёт — `docs/content/экономика-золото-дух.md`, `docs/content/переход-цикла.md` | — | `python tools/content-gen/biomes/pace.py --check`, `python tools/content-gen/cycle/climb.py --check` | 0014, 0018, 0031, 0043, 0054 (ждёт сборки) |

## Спуск

| Система | GDD | Данные ← сборщик; расчёт | Экраны | Проверки | ADR |
|---|---|---|---|---|---|
| **Враги и биомы** — колоды этажей, боссы, рунные стражи, фарм | §7, §8, §9, §11 | Мастерская — в ядре `design/ui/battle.js`; биомы 2–4 — `design/ui/biome-foes.js` ← `tools/content-gen/biomes/`; биомы 5–12 — черновик `docs/content/враги-биомов.md`; расчёт — `docs/content/биомы-2-4.md`, `docs/content/биомы-и-фарм.md` | `design/ui/screens/descent.js`, `design/ui/screens/biomes.js` | `tools/content-gen/screens/check_biomes.js`; `python tools/content-gen/biomes/farm.py --check` | 0011, 0013, 0018, 0023, 0028, 0044, 0045, 0048, 0051 (ждёт сборки), 0054 (ждёт сборки) |
| **Обучение** — цикл I по сценарию, уровни Странника 1–10, пропуск | §16, §31 | `design/ui/start.js` ← `tools/content-gen/start/`; расчёт — `docs/content/старт-с-чистого-листа.md` | `design/ui/screens/start.js` | `tools/content-gen/screens/check_start.js`; `node tools/content-gen/start/build.js --check` | 0018, 0038, 0040, 0049, 0050, 0054 (ждёт сборки) |
| **Новый цикл** — переход, рейтинг своего цикла, окно цикла | §1, §2, §3 | `design/ui/cycle.js` ← `tools/content-gen/cycle/`; расчёт — `docs/content/переход-цикла.md` | `design/ui/screens/cycle.js` | `tools/content-gen/screens/check_cycle.js`; `node tools/content-gen/cycle/build.js --check` | 0041, 0043, 0054 (ждёт сборки) |

## Неделя и режимы

| Система | GDD | Данные ← сборщик; расчёт | Экраны | Проверки | ADR |
|---|---|---|---|---|---|
| **Неделя** — три времени, итоги режимов, «Дары» | §1, §23 | Реестр режимов — в экране | `design/ui/screens/week.js` | `tools/content-gen/screens/check_week.js` | 0029, 0041 |
| **Эхо** — лестница недели, призванные враги, Многоликий | §17 | `design/ui/echo-foes.js` ← `tools/content-gen/echo/`; `design/ui/echo-rules.js` ← `tools/content-gen/economy/echo.py`; расчёт — `docs/content/эхо-враги.md`, `docs/content/эхо-экономика.md` | `design/ui/screens/echo.js` | `tools/content-gen/screens/check_echo.js`, `tools/content-gen/screens/check_echo_battle.js`; `python tools/content-gen/economy/echo.py --check` | 0024, 0025, 0030, 0039, 0043, 0047 (ждёт сборки), 0054 (ждёт сборки) |
| **Контракты** | §18 | `design/ui/contracts.js` ← `tools/content-gen/contracts/`; расчёт — `docs/content/контракты.md` | `design/ui/screens/contracts.js` | `tools/content-gen/screens/check_contracts.js` | 0029, 0034 |
| **Ритуалы и рабочие** | §19 | `design/ui/rituals.js` ← `tools/content-gen/rituals/`; расчёт — `docs/content/ритуалы.md` | `design/ui/screens/rituals.js` | `tools/content-gen/screens/check_rituals.js` — идёт около десяти минут | 0029, 0030, 0031 |
| **Арена и Лига** | §20 | `design/ui/arena.js` ← `tools/content-gen/arena/`; расчёт — `docs/content/арена-и-лига.md` | `design/ui/screens/arena.js` | `tools/content-gen/screens/check_arena.js` | 0029, 0030, 0041, 0050 |
| **Клан и клановый босс** | §24, §25 | `design/ui/clan.js` ← `tools/content-gen/clan/`; расчёт — `docs/content/клан.md` | `design/ui/screens/clan.js` | `tools/content-gen/screens/check_clan.js` | 0029, 0030, 0042, 0043 |
| **Событие** | §27 | `design/ui/event.js` ← `tools/content-gen/event/`; расчёт — `docs/content/событие.md` | `design/ui/screens/event.js` | `tools/content-gen/screens/check_event.js` | 0029, 0031, 0042, 0043 |

## Ремесло и вещи

| Система | GDD | Данные ← сборщик; расчёт | Экраны | Проверки | ADR |
|---|---|---|---|---|---|
| **Крафт** — ресурсы, рецепты, дроп, призывы, лавка и рынок | §9, §12, §13, §14 | `design/ui/recipes.js` ← `tools/content-gen/recipes/`; расчёт — `docs/content/ресурсы-рецепты-дроп.md`, каталоги — `docs/content/ресурсы-каталог.md`, `docs/content/рецепты-каталог.md` | `design/ui/screens/craft.js`, `design/ui/screens/crafthall.js`, `design/ui/screens/recipe-book.js`, `design/ui/screens/bag.js`, `design/ui/screens/shop.js`, `design/ui/screens/market.js`; общие запасы — `design/ui/screens/model.js` | `tools/content-gen/recipes/check_recipes.js`, `tools/content-gen/screens/check_craft.js`, `tools/content-gen/screens/check_crafthall.js`, `tools/content-gen/screens/check_recipe_book.js`, `tools/content-gen/screens/check_bag.js`, `tools/content-gen/screens/check_shop.js`; `python tools/content-gen/recipes/tempo.py --check` | 0008, 0023, 0033, 0034, 0037, 0054 (ждёт сборки) |
| **Снаряжение и перековка** | §21, §22 | `design/ui/equipment.js` ← `tools/content-gen/equipment/`; расчёт — `docs/content/снаряжение.md` | `design/ui/screens/equipment.js`, `design/ui/screens/reforge.js` | `tools/content-gen/screens/check_equipment.js`, `tools/content-gen/screens/check_reforge.js` | 0029, 0030, 0037, 0047 (ждёт сборки) |
| **Духовные талисманы** | §26 | `design/ui/talismans.js` ← `tools/content-gen/talismans/`; расчёт — `docs/content/талисманы.md` | `design/ui/screens/talismans.js` | `tools/content-gen/screens/check_talismans.js` | 0028, 0031 |
| **Лутбоксы** — сундуки режимов, окно открытия | §23 | `design/ui/lootboxes.js` ← `tools/content-gen/lootboxes/`; расчёт — `docs/content/лутбоксы.md`; проект лестницы — `docs/content/лестница-лутбоксов.md` | `design/ui/screens/chest-open.js`, `design/ui/screens/bag.js` | `tools/content-gen/lootboxes/check_ui.js`, `tools/content-gen/screens/check_chest_open.js` | 0023, 0028, 0037, 0038, 0039, 0047 (ждёт сборки) |

## Аккаунт и деньги

| Система | GDD | Данные ← сборщик; расчёт | Экраны | Проверки | ADR |
|---|---|---|---|---|---|
| **Странник** — Память, артефакты, облик, профиль и чат | §2, §14, §16 | `design/ui/wanderer.js` ← `tools/content-gen/wanderer/` из таблиц автора в `source-data/` | `design/ui/screens/wanderer.js`, `design/ui/screens/chambers.js`, `design/ui/screens/social.js` | `tools/content-gen/screens/check_wanderer.js`, `tools/content-gen/screens/check_chambers.js`, `tools/content-gen/screens/check_social.js` | 0028, 0030, 0031, 0035, 0054 (ждёт сборки) |
| **Достижения** | §29 | `design/ui/wanderer.js` ← `tools/content-gen/wanderer/achievements.js`, темп — `tools/content-gen/wanderer/pace_inputs.py`; расчёт — `docs/content/достижения.md` | вкладка «Достижения» — `design/ui/screens/wanderer.js` | `tools/content-gen/screens/check_wanderer.js`; `python tools/content-gen/wanderer/pace_inputs.py --check` | 0029, 0031, 0047 (ждёт сборки) |
| **Монетизация** — Лавка Энериума, пропуск, дар дня, ручеёк Энериума | §1, §32 | `design/ui/store.js` ← `tools/content-gen/store/`; `design/ui/pass.js` ← `tools/content-gen/pass/`; ручеёк — `tools/content-gen/economy/enerium.js`; расчёт — `docs/content/монетизация.md`, `docs/content/экономика-энериум.md`, `docs/content/пропуск-и-награды.md` | `design/ui/screens/store.js`, `design/ui/screens/pass.js` | `tools/content-gen/screens/check_store.js`, `tools/content-gen/screens/check_pass.js`; `node tools/content-gen/economy/enerium.js --check` | 0021, 0034, 0036, 0047 (ждёт сборки), 0054 (ждёт сборки) |

## Оболочка и лор

| Система | GDD | Данные ← сборщик; расчёт | Экраны | Проверки | ADR |
|---|---|---|---|---|---|
| **Оболочка и Убежище** — шахта, шапка, проводники, режим «Игрок / Команда» | §28, §33 | Данных нет: вид и размеры — в экранах | `design/ui/index.html`, `design/ui/screens/shell.js`, `design/ui/screens/shelter.js`, `design/ui/screens/talk.js` | `tools/content-gen/screens/check_shell.js`, `tools/content-gen/screens/check_shelter.js`, `tools/content-gen/screens/check_talk.js`, `tools/content-gen/screens/check_player_view.js` | 0029, 0032, 0037, 0045 |
| **Летопись, лор и спойлеры** | §28, §38 — только для команды | `design/ui/chronicle.js` ← `tools/content-gen/lore/`; лестница спойлеров — `tools/content-gen/lore/ladder.js`; лор — `docs/lore/`, расчёт — `docs/content/летопись.md` | `design/ui/screens/chronicle.js` | `tools/content-gen/screens/check_chronicle.js`, `tools/content-gen/tables/check_spoilers.js` | 0008, 0022, 0038, 0054 (ждёт сборки) |

## Арт, таблицы, документы

| Система | Правило | Данные и инструменты | Проверки | ADR |
|---|---|---|---|---|
| **Арт** | Стиль — `art/style/style.md`, опись — `art/README.md`, очередь — `docs/art-queue.md` | Генерация и нарезка — `tools/art-gen/`, порядок — `tools/art-gen/README.md`; выгрузка в прототип — `tools/art-gen/export_ui.py` по `tools/art-gen/ui-art.json` и `tools/art-gen/ui-icons.json`, картинки — `design/ui/assets/art/`; помощники иконок — `design/ui/screens/art-icons.js` | `tools/content-gen/screens/check_icons.js` | 0009, 0012, 0027, 0029, 0033 |
| **Таблицы Excel** | Правда — в данных игры, таблицы пересобираются; оригиналы автора — `source-data/оригиналы-2026-09-26/` | `source-data/*.xlsx` ← `tools/content-gen/tables/`, хеши — `source-data/provenance.json` | `python tools/content-gen/tables/build.py --check` — последним шагом сборки | 0003, 0038 |
| **Документы и решения** | `CLAUDE.md`, «Как работаем»: одно действующее правило | Указатели `docs/decisions/README.md` и `docs/gdd/README.md` ← `tools/docs/adr_index.py`; шапка ADR — по образцу в `tools/docs/adr.py`; состояние — `docs/STATE.md`, путь — `docs/ROADMAP.md`, журнал — `docs/progress/` | `python tools/docs/adr_index.py --check`, `python tools/docs/check_docs.py` | 0001, 0026, 0053 |

## Общее для всех систем

- **Порядок сборки.** Данные зависят друг от друга: после правки сборщика идут по шагам «Порядка сборки» в `tools/content-gen/README.md`, последним шагом — таблицы Excel.
- **Отряд расчётов** — одна фикстура `tools/content-gen/biomes/sim.js`: её берут все калькуляторы.
- **Инварианты** действуют и в прототипе: целые числа, числа — в данных, исход решает «сервер» прототипа, повтор операции ничего не повторяет (`CLAUDE.md`).
- **Тексты игрока** проходят лестницу спойлеров: `tools/content-gen/tables/check_spoilers.js` и `tools/content-gen/screens/check_player_view.js`.
- **Файлы с концами строк CRLF** — `design/ui/index.html` и `tools/art-gen/ui-art.json`: правят инструментом Edit или скриптом, не `sed`.
