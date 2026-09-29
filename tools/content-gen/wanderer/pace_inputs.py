# -*- coding: utf-8 -*-
"""Темп достижений: входы из калькуляторов экономики — мост для achievements-pace.js, как capacity.json у контрактов (черновик).

Берёт из sets.py и economy.py через importlib и их не меняет:
- цикл I — счётчики обучения за биом 2 (sets.tutor_b2, таблица С1), награды обучения золотом (economy.account_gold)
  и дух цепочки обучения (economy.TUTORIAL_SPIRIT);
- победы у рунных стражей в день, циклы II и III, у каждого профиля — sets.kills_avg по принятому варианту ключей (С8а);
- дни до рун на пределы I–V отряду пяти — economy.pace_of: победы у стражей по дням из ключей (вариант Б), как в прогоне темпа
  (biomes/pace.py) и таблице Т11 экономики; прежде — sets.rune_days_sets при средних победах цикла II (С8б);
- героев за золото по дням с начала цикла II до конца цикла III — sets.gold_buy по принятой цене (С10), пятёрка обучения входит.
sets.py читает ключи контрактов из design/ui/contracts.js: после пересборки контрактов или калькуляторов — перезапустить.

    python tools/content-gen/wanderer/pace_inputs.py           # записать pace-inputs.json рядом
    python tools/content-gen/wanderer/pace_inputs.py --check   # только сверить, что pace-inputs.json свежий

Числа — демонстрация, все целые: победы в день — в сотых (× 100), как в sets.py.
"""
import importlib.util
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location('sets', HERE.parent / 'economy' / 'sets.py')
S = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(S)
E = S.E                                      # калькулятор экономики — тот же экземпляр, что у сет-бонусов
OUT = HERE / 'pace-inputs.json'
PROFILES = {'o': 'обычный', 'e': 'увлечённый'}   # профили прогона достижений → профили калькуляторов


def build():
    days = {p: S.cycle_days(h) for p, h in E.PROFILES}
    tut = S.tutor_b2()
    heroes, inc = S.gold_heroes(), S.gold_income(days)
    price = S.GOLD_VARIANTS[0]                     # принятая цена героев за золото: +30 % линейно (ADR-0023)
    data = {
        'meta': {
            'builder': 'tools/content-gen/wanderer/pace_inputs.py',
            'sources': ['tools/content-gen/economy/sets.py', 'tools/content-gen/economy/economy.py', 'design/ui/contracts.js'],
            'x': 100,
            'note': 'guards — победы у рунных стражей в день × 100 по циклам; limitSquad — день цикла II, когда у отряда пяти руны на предел I–V; '
                    'heroGold — героев за золото к концу дня: 0 — обучение, дальше — дни с начала цикла II',
            'keyVariant': S.KEY_VARIANTS[S.KEY_PICK][0], 'goldVariant': price[0],
        },
        'cycleI': {'floors': tut['floors'] // 100, 'elites': tut['el'] // 100, 'bosses': tut['boss'] // 100,
                   'gold': tut['gold'] // 100, 'spirit': tut['spirit'] // 100,
                   'accountGold': E.account_gold(), 'tutorialSpirit': E.TUTORIAL_SPIRIT},
        # вход к стражам пределов и доблести — × цикл, доля побед у стража пределов: принятый вариант ключей (ADR-0023, вариант Б)
        'keyEntry': list(S.KEY_VARIANTS[S.KEY_PICK][3:5]), 'limitShareBp': S.RB_SPLIT_BP,
        'guards': {}, 'limitSquad': {}, 'heroGold': {},
    }
    for k, p in PROFILES.items():
        data['guards'][k] = {str(c): S.kills_avg(S.KEY_PICK, days[p], c, prof=p) for c in (2, 3)}
        data['limitSquad'][k] = [int(d) for d in E.pace_of(dict(E.PROFILES)[p])['runes']]
        data['heroGold'][k] = [sum(b.values()) for b, _, _ in S.gold_buy(price, inc[p], heroes)]
    return data


def render(data):
    return json.dumps(data, ensure_ascii=False, indent=1) + '\n'


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    text = render(build())
    if '--check' in sys.argv:
        ok = OUT.exists() and OUT.read_text(encoding='utf-8') == text
        print('pace-inputs.json свежий' if ok else 'pace-inputs.json устарел — перезапустить: python tools/content-gen/wanderer/pace_inputs.py')
        sys.exit(0 if ok else 1)
    OUT.write_text(text, encoding='utf-8')
    print(f'Записано: {OUT.relative_to(HERE.parents[2])}. Теперь: node tools/content-gen/wanderer/build.js')
