"""Темп доблести и то, что сундуки дают сверх модели темпа: рунные ключи, руны пределов и осколки доблести (поручение автора
30.09.2026, п. 6; слово автора 30.09.2026 о рунных ключах, ADR-0033; сундуки КрафБоссов — ADR-0047, п. 1).

Модель темпа (tools/content-gen/economy/economy.py, valor_pace) ведёт обычного от начала цикла II до пятого предела на ключах контрактов
и ключе с босса биома — руна доблести у обычного раз в 9 дней (ADR-0030, ADR-0031). По слову автора рунные ключи падают только с боссов
биома, у донатного сета ключников, в сундуках с малым шансом и за контракты. Сверх модели у обычного остаётся только малый шанс в сундуках:
- сундук странника — бесплатный ряд пропуска и лист «Дар дня» (design/ui/pass.js; отметка — в день входа, обычный входит 6 дней
  из 7) и достижения — верхняя оценка: сундук каждый день, как в циклах I–II (ADR-0029, п. 41), среднее по строкам достижений;
- сундуки КрафБоссов — свой у каждого призванного врага (ADR-0047): день обычного по модели стока и темам — design/ui/lootboxes.js,
  summon.day (собирает lootboxes/build.js): рунные ключи, руны пределов I–V, осколки и руны доблести — по циклу пула;
- крафт напрямую — закрытия мест, призванные враги, рецепты ключей: должно быть ноль, это проверяет и сборщик рецептов (emit.js).
Ожидаемые ключи сундука странника — design/ui/lootboxes.js, ev.

Закон (лестница-лутбоксов.md, раздел 2, закон 4): руны, осколки доблести и ключи всех сундуков вместе — ниже порога темпа в каждом
цикле. Мера — рунные ключи по цене замены у рунных стражей своего цикла (recipes.js, guardians):
- осколок доблести — вход к стражу доблести на осколки за победу; руна доблести — столько осколков, сколько просит её рецепт;
- руна предела — по курсу перековки (сколько младших на одну старшую — рецепт recipes.js): победа у стража пределов стоит вход
  и приносит руны по весам; в рунах старшего предела это сумма вес × курс^−(старший − предел).
Порог — добавка ключей в день, с которой руна доблести у обычного приходит чаще: его ищет прогон valor_pace, где почти все дни —
второй цикл прогона (REF). Цены входа к стражам растут с циклом, поэтому в ключах цикла c порог — × c / REF. Порог не зависит
от сундуков: поиск идёт от нуля. Добавку для таблицы темпа берём большую из циклов II и III — верхняя оценка, как прежде.
До слова автора сверх модели шли ещё ряды пропуска (24 ключа за сезон), лист даров (10 за лист) и крафт — до 1,64 ключа в день: вместе
около 2,8 в день, и руна доблести у обычного приходила раз в 8 дней. Сравнение — в документе, раздел «Темп доблести».

Руническая пыль (п. 7): пыль из ключей и осколки из пыли — против боя со стражем доблести. Обычный упирается в ключи, а не в кап
побед (ADR-0022), лишних ключей у него нет — путь через пыль его темп не меняет; у того, кто упёрся в кап, пыль даёт осколки втрое-
вчетверо дороже боя.

Запуск: python tools/content-gen/recipes/tempo.py — печать и блоки tempo.md для assemble.js; --check — ошибка, если сундуки ускоряют
руну доблести у обычного, в каком-то цикле не ниже порога или крафт даёт рунные ключи напрямую. Только целая арифметика.
Порядок: лутбоксы → tempo.py → снова лутбоксы (их закон 4 читает порог и ключи сундука странника из tempo.md)."""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'content-gen', 'economy'))
import economy as E  # noqa: E402

ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI']
HOURS = 3        # обычный: 3 часа забегов (ADR-0031)
LOGIN = 6        # обычный входит 6 дней из 7: отметка листа даров — в день входа (прогоны контрактов и пропуска)
FEATS_DAY = 100  # достижений в день × 100 — верхняя оценка: в циклах I–II достижение приходит каждый день (ADR-0029, п. 41)
REF = E.FIRST_CYCLE + 1   # второй цикл прогона темпа: в нём проходят почти все дни до пятого предела — к его ценам привязан порог
X6 = 1000000     # summon.day в lootboxes.js — в миллионных


def load():
    js = ("globalThis.window=globalThis;require('./design/ui/recipes.js');require('./design/ui/lootboxes.js');require('./design/ui/pass.js');"
          "const R=globalThis.EN_RECIPES,D=R.drops,L=globalThis.EN_LOOTBOXES,P=globalThis.EN_PASS,A=globalThis.EnPass;"
          "const pick=r=>({id:r.id,cyc:r.cyc,out:r.out,in:r.in});"
          "const chests=(list,c)=>list.flatMap(cell=>cell.filter(x=>x.k==='chest').map(x=>({r:A.chestR(P,c,x),win:x.win||'step'})));"
          "const cyc=[2,3,4,5,6];"
          "require('./design/ui/wanderer.js');const W=globalThis.EN_WANDERER,cnt={};"
          "for(const a of W.ach.list){const k=(W.ach.cats.find(x=>x.id===a.cat)||{}).label;cnt[k]=(cnt[k]||0)+1;}"
          "const feats=L.modes.feats.layers.flatMap(l=>l.rows).map(r=>Object.assign({count:cnt[r.label]||0},r)).filter(r=>r.count>0);"
          "process.stdout.write(JSON.stringify({sink:R.stats.sink,guardians:D.guardians,"
          "dust:R.recipes.filter(r=>r.fam==='dust').map(pick),"
          "keyRecipes:R.recipes.filter(r=>r.out[0]==='rkey').map(r=>r.id),"
          "ev:{wander:L.ev.wander},summon:(L.summon&&L.summon.day)||null,"
          "pass:Object.fromEntries(cyc.map(c=>[c,{free:chests(P.rows.free,c),cal:chests(P.cal.list,c)}])),"
          "season:P.season.days,marks:P.cal.marks,"
          "feats:Object.fromEntries(cyc.map(c=>[c,feats.filter(x=>x.cyc[c]).map(x=>Object.assign({n:x.count},x.cyc[c][0]))]))}))")
    res = subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    if res.returncode:
        sys.exit('tempo.py: не прочитать design/ui/recipes.js, lootboxes.js или pass.js — ' + res.stderr)
    return json.loads(res.stdout)


def dec2(x100):
    return f'{x100 // 100},{x100 % 100:02d}'


def table(head, rows):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '---|' * len(head)]
    out += ['| ' + ' | '.join(str(x) for x in r) + ' |' for r in rows]
    return '\n'.join(out)


def key_price(c, guardians, R):
    """Цена замены у рунных стражей цикла c, в рунных ключах × 10^6: осколок доблести, руна доблести, руны пределов I–V."""
    lim = next(g for g in guardians if g['cyc'] == c and g['kind'] == 'limits')
    val = next(g for g in guardians if g['cyc'] == c and g['kind'] == 'valor')
    shard = val['entryKeys'] * E.BP * X6 // sum(n * bp for n, bp in val['shardsBp'])
    n = len(lim['weightsBp'])
    in_top = sum(lim['runesPerKill'] * w * R['reforge'] ** j for j, w in enumerate(lim['weightsBp']))   # рун старшего предела за победу × BP × курс^(n − 1)
    top = lim['entryKeys'] * E.BP * R['reforge'] ** (n - 1) * X6 // in_top
    return {'shard': shard, 'valor': shard * R['valor_rune'], 'rune': [top // R['reforge'] ** (n - 1 - j) for j in range(n)]}


def craft_keq(day, guardians, R):
    """День обычного у сундуков КрафБоссов (lootboxes.js, summon.day[цикл]) в рунных ключах × 100: ключи, руны пределов, осколки
    и руны доблести. Поток пробуждённых — пул на цикл выше: цена замены — своего цикла пула."""
    keys = runes = valor = 0
    for p in day['parts']:
        P = key_price(p['pc'], guardians, R)
        keys += p['keys']
        runes += sum(q * P['rune'][j] for j, q in enumerate(p['rune'])) // X6
        valor += (p['vshard'] * P['shard'] + p['valor'] * P['valor']) // X6
    k = X6 // 100
    return (keys + k // 2) // k, (runes + k // 2) // k, (valor + k // 2) // k


def keys_of(ev, c, r, win):
    """Ожидаемые рунные ключи одного сундука × 100 (lootboxes.js, ev[цикл][окно][редкость − 1].keys)."""
    w = ev[str(c)].get(win) or ev[str(c)]['step']
    return w[r - 1].get('keys', 0)


def main():
    d = load()
    rows = {r['cyc']: r for r in d['sink']}
    wander = d['ev']['wander']
    if not d['summon']:
        sys.exit('tempo.py: в design/ui/lootboxes.js нет summon.day — собрать tools/content-gen/lootboxes/build.js')
    add_by, tot = {}, {}
    t1 = []
    R = E.rx()
    split = E.RB_SPLIT_BP
    base = E.valor_pace(HOURS)
    # порог: с какой добавки ключей в день руна доблести у обычного выходит чаще; от сундуков не зависит — поиск от нуля
    lo, hi = 0, 5000
    while E.valor_pace(HOURS, keys_add_x100=hi)['days_per_rune'] >= base['days_per_rune'] and hi < 20000:
        hi *= 2
    while hi - lo > 10:
        mid = (lo + hi) // 2
        if E.valor_pace(HOURS, keys_add_x100=mid)['days_per_rune'] < base['days_per_rune']:
            hi = mid
        else:
            lo = mid

    def limit_of(c):
        """Порог в ключах цикла c: цены входа к стражам — × цикл."""
        return hi * c // REF
    for c in range(2, 7):
        p = d['pass'][str(c)]
        pass_x100 = sum(keys_of(wander, c, x['r'], x['win']) for x in p['free']) // d['season']
        cal_x100 = sum(keys_of(wander, c, x['r'], x['win']) for x in p['cal']) * LOGIN // (7 * d['marks'])
        fs = d['feats'][str(c)]   # сундук достижения — среднее по строкам, вес строки — сколько в ней достижений (§29: ~50 / ~22 / ~22)
        feats_x100 = sum(keys_of(wander, c, x['r'], x['win']) * x['n'] for x in fs) // sum(x['n'] for x in fs) * FEATS_DAY // 100
        day = d['summon'].get(str(c))
        if not day:
            sys.exit(f'tempo.py: в lootboxes.js нет дня обычного у сундуков КрафБоссов для цикла {ROMAN[c]} (summon.day)')
        craft_x100, runes_x100, valor_x100 = craft_keq(day, d['guardians'], R)
        direct = rows[c]['runeKeysX100']
        total = pass_x100 + cal_x100 + feats_x100 + craft_x100 + runes_x100 + valor_x100 + direct
        add_by[c] = tot[c] = total
        price = E.avg_price_x100(c)
        wins_x100 = total * 100 // price
        shards_x100 = wins_x100 * (E.BP - split) // E.BP * R['shards_x100'] // 100
        t1.append([ROMAN[c], dec2(direct), dec2(pass_x100 + cal_x100), dec2(feats_x100), dec2(craft_x100), dec2(runes_x100), dec2(valor_x100),
                   dec2(total), dec2(limit_of(c)), f'{total * 100 // limit_of(c)} %', dec2(wins_x100), dec2(shards_x100)])
    add = max(add_by[2], add_by[3])
    chest = E.valor_pace(HOURS, keys_add_x100=add)
    out = []
    # 1. рунные ключи, руны и осколки доблести сверх модели по циклам — в рунных ключах своего цикла
    out.append('<!-- tempo-keys -->')
    out.append(table(['Цикл', 'Крафт напрямую', 'Сундук странника: пропуск и лист даров', 'Сундук странника: достижения, верхняя оценка',
                      'Сундуки КрафБоссов: ключи', 'руны пределов, в ключах', 'осколки и руны доблести, в ключах',
                      'Всего ключей-эквивалентов в день', 'Порог цикла', 'Занято порога', 'Побед сверху, 7 : 3', 'Осколков доблести сверху'], t1))
    out.append('<!-- tempo-valor -->')
    out.append(table(['Прогон valor_pace, обычный 3 ч', 'Пятый предел, день', 'Побед у стража доблести в день', 'Дней на руну доблести',
                      'Рун доблести к пятому пределу'],
                     [['модель: контракты и босс биома', base['limit5'], dec2(base['val_x100']), base['days_per_rune'], base['runes_at_limit5']],
                      [f'с сундуками: +{dec2(add)} ключа в день', chest['limit5'], dec2(chest['val_x100']), chest['days_per_rune'],
                       chest['runes_at_limit5']],
                      [f'порог: +{dec2(hi)} ключа в день в ценах цикла {ROMAN[REF]}', '—', '—', E.valor_pace(HOURS, keys_add_x100=hi)['days_per_rune'], '—']]))
    # цена замены у стражей по циклам — чем меряются руны и осколки доблести сундуков
    out.append('<!-- tempo-price -->')
    t3 = []
    for c in range(2, 7):
        P = key_price(c, d['guardians'], R)
        t3.append([ROMAN[c], dec2(P['shard'] * 100 // X6), dec2(P['valor'] * 100 // X6)] + [dec2(x * 100 // X6) for x in P['rune']])
    out.append(table(['Цикл', 'Осколок доблести, ключей', 'Руна доблести', 'Руна предела I', 'II', 'III', 'IV', 'V'], t3))
    # 2. пыль против стража: рунных ключей на осколок
    val = {g['cyc']: g for g in d['guardians'] if g['kind'] == 'valor'}
    key_dust = next(r for r in d['dust'] if r['id'] == 'r_rdust')
    t2 = []
    for c in range(1, 7):
        g = val[c]
        per_win_x100 = sum(n * bp for n, bp in g['shardsBp']) // 100
        guard_x100 = g['entryKeys'] * 100 * 100 // per_win_x100            # рунных ключей на осколок у стража × 100
        rd = next((r for r in d['dust'] if r['id'] == f'r_vs{c}_dust'), None)
        if not rd:
            continue
        dust_in = next(q for i, q in rd['in'] if i == 'rdust')
        keys_per_dust_x100 = key_dust['in'][0][1] * 100 * 100 // key_dust['out'][1]   # рунных ключей на единицу пыли × 100 × 100
        dust_x100 = dust_in * keys_per_dust_x100 // rd['out'][1] // 100               # рунных ключей на осколок через пыль × 100
        t2.append([ROMAN[c], g['entryKeys'], dec2(per_win_x100), dec2(guard_x100), f"{dust_in} пыли → {rd['out'][1]}", dec2(dust_x100),
                   f'×{dec2(dust_x100 * 100 // guard_x100)}'])
    out.append('<!-- tempo-dust -->')
    out.append(table(['Цикл', 'Вход к стражу доблести, ключей', 'Осколков за победу', 'Ключей на осколок у стража',
                      'Пыль в осколки', 'Ключей на осколок через пыль', 'Дороже боя'], t2))
    out.append('<!-- tempo-inline -->')
    out.append('\n'.join([f'tempoBase: {base["days_per_rune"]}', f'tempoCraft: {chest["days_per_rune"]}', f'tempoAdd: {dec2(add)}',
                          f'tempoLimit: {dec2(hi)}', f'tempoLimit5: {base["limit5"]}', f'tempoRef: {REF}',
                          'tempoWorst: ' + max((tot[c] * 100 // limit_of(c), ROMAN[c]) for c in tot)[1]]))
    text = '\n'.join(out) + '\n'
    with open(os.path.join(HERE, 'tempo.md'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print(f'Руна доблести у обычного: модель — раз в {base["days_per_rune"]} дн., с сундуками (+{dec2(add)} ключа-эквивалента в день) — '
          f'раз в {chest["days_per_rune"]} дн.; темп сдвинется с +{dec2(hi)} ключа в день в ценах цикла {ROMAN[REF]}.')
    print('Сундуки по циклам, ключей-эквивалентов в день из порога: '
          + ', '.join(f'{ROMAN[c]} — {dec2(tot[c])} из {dec2(limit_of(c))}' for c in sorted(tot)) + '.')
    if '--check' in sys.argv:
        bad = []
        if chest['days_per_rune'] < base['days_per_rune']:
            bad.append('ключи, руны и осколки доблести сундуков ускоряют руну доблести у обычного')
        over = [c for c in sorted(tot) if tot[c] >= limit_of(c)]
        if over:
            bad.append('руны, осколки доблести и ключи сундуков не ниже порога темпа в циклах ' + ', '.join(
                f'{ROMAN[c]} ({dec2(tot[c])} из {dec2(limit_of(c))})' for c in over) + ' — закон 4 сундуков КрафБоссов (ADR-0047)')
        if d['keyRecipes'] or any(rows[c]['runeKeysX100'] for c in range(2, 7)):
            bad.append('крафт даёт рунные ключи напрямую: ' + ', '.join(d['keyRecipes']) + ' — по слову автора их нет (ADR-0033)')
        if bad:
            sys.exit('tempo.py: ' + '; '.join(bad))


if __name__ == '__main__':
    main()
