"""Темп доблести и рунные ключи сверх модели темпа (поручение автора 30.09.2026, п. 6; слово автора 30.09.2026 о рунных ключах, ADR-0033).

Модель темпа (tools/content-gen/economy/economy.py, valor_pace) ведёт обычного от начала цикла II до пятого предела на ключах контрактов
и ключе с босса биома — руна доблести у обычного раз в 9 дней (ADR-0030, ADR-0031). По слову автора рунные ключи падают только с боссов
биома, у донатного сета ключников, в сундуках с малым шансом и за контракты. Сверх модели у обычного остаётся только малый шанс в сундуках:
- сундук странника — бесплатный ряд пропуска и лист «Дар дня» (design/ui/pass.js; отметка — в день входа, обычный входит 6 дней
  из 7) и достижения — верхняя оценка: сундук каждый день, как в циклах I–II (ADR-0029, п. 41), среднее по строкам достижений;
- сундук крафтового босса — победа над призванным врагом: призывов в день — модель стока (recipes.js, stats.sink), редкость — цикл + 1;
- крафт напрямую — закрытия мест, призванные враги, рецепты ключей: должно быть ноль, это проверяет и сборщик рецептов (emit.js).
Ожидаемые ключи одного сундука — design/ui/lootboxes.js, ev. Добавку для темпа берём большую из циклов II и III — верхняя оценка, как прежде.
До слова автора сверх модели шли ещё ряды пропуска (24 ключа за сезон), лист даров (10 за лист) и крафт — до 1,64 ключа в день: вместе
около 2,8 в день, и руна доблести у обычного приходила раз в 8 дней. Сравнение — в документе, раздел «Темп доблести».

Руническая пыль (п. 7): пыль из ключей и осколки из пыли — против боя со стражем доблести. Обычный упирается в ключи, а не в кап
побед (ADR-0022), лишних ключей у него нет — путь через пыль его темп не меняет; у того, кто упёрся в кап, пыль даёт осколки втрое-
вчетверо дороже боя.

Запуск: python tools/content-gen/recipes/tempo.py — печать и блоки tempo.md для assemble.js; --check — ошибка, если сундуки ускоряют
руну доблести у обычного или крафт даёт рунные ключи напрямую. Только целая арифметика."""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'content-gen', 'economy'))
import economy as E  # noqa: E402

ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI']
HOURS = 3        # обычный: 3 часа забегов (ADR-0031)
LOGIN = 6        # обычный входит 6 дней из 7: отметка листа даров — в день входа (прогоны контрактов и пропуска)
FEATS_DAY = 100  # достижений в день × 100 — верхняя оценка: в циклах I–II достижение приходит каждый день (ADR-0029, п. 41)


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
          "ev:{wander:L.ev.wander,craft:L.ev.craft},"
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


def keys_of(ev, c, r, win):
    """Ожидаемые рунные ключи одного сундука × 100 (lootboxes.js, ev[цикл][окно][редкость − 1].keys)."""
    w = ev[str(c)].get(win) or ev[str(c)]['step']
    return w[r - 1].get('keys', 0)


def main():
    d = load()
    rows = {r['cyc']: r for r in d['sink']}
    wander, craft_ev = d['ev']['wander'], d['ev']['craft']
    add_by = {}
    t1 = []
    R = E.rx()
    split = E.RB_SPLIT_BP
    for c in range(2, 7):
        p = d['pass'][str(c)]
        pass_x100 = sum(keys_of(wander, c, x['r'], x['win']) for x in p['free']) // d['season']
        cal_x100 = sum(keys_of(wander, c, x['r'], x['win']) for x in p['cal']) * LOGIN // (7 * d['marks'])
        fs = d['feats'][str(c)]   # сундук достижения — среднее по строкам, вес строки — сколько в ней достижений (§29: ~50 / ~22 / ~22)
        feats_x100 = sum(keys_of(wander, c, x['r'], x['win']) * x['n'] for x in fs) // sum(x['n'] for x in fs) * FEATS_DAY // 100
        craft_x100 = rows[c]['summonsX100'] * keys_of(craft_ev, c, min(7, c + 1), 'step') // 100
        direct = rows[c]['runeKeysX100']
        total = pass_x100 + cal_x100 + feats_x100 + craft_x100 + direct
        add_by[c] = total
        price = E.avg_price_x100(c)
        wins_x100 = total * 100 // price
        shards_x100 = wins_x100 * (E.BP - split) // E.BP * R['shards_x100'] // 100
        t1.append([ROMAN[c], dec2(direct), dec2(pass_x100 + cal_x100), dec2(feats_x100), dec2(craft_x100), dec2(total), dec2(wins_x100),
                   dec2(shards_x100)])
    add = max(add_by[2], add_by[3])
    base = E.valor_pace(HOURS)
    chest = E.valor_pace(HOURS, keys_add_x100=add)
    # порог: с какой добавки ключей в день руна доблести у обычного выходит чаще
    lo, hi = add, 5000
    while E.valor_pace(HOURS, keys_add_x100=hi)['days_per_rune'] >= base['days_per_rune'] and hi < 20000:
        hi *= 2
    while hi - lo > 10:
        mid = (lo + hi) // 2
        if E.valor_pace(HOURS, keys_add_x100=mid)['days_per_rune'] < base['days_per_rune']:
            hi = mid
        else:
            lo = mid
    out = []
    # 1. рунные ключи сверх модели по циклам
    out.append('<!-- tempo-keys -->')
    out.append(table(['Цикл', 'Крафт напрямую', 'Сундук странника: пропуск и лист даров', 'Сундук странника: достижения, верхняя оценка',
                      'Сундук крафтового босса', 'Всего ключей в день', 'Побед сверху, 7 : 3', 'Осколков доблести сверху'], t1))
    out.append('<!-- tempo-valor -->')
    out.append(table(['Прогон valor_pace, обычный 3 ч', 'Пятый предел, день', 'Побед у стража доблести в день', 'Дней на руну доблести',
                      'Рун доблести к пятому пределу'],
                     [['модель: контракты и босс биома', base['limit5'], dec2(base['val_x100']), base['days_per_rune'], base['runes_at_limit5']],
                      [f'с сундуками: +{dec2(add)} ключа в день', chest['limit5'], dec2(chest['val_x100']), chest['days_per_rune'],
                       chest['runes_at_limit5']],
                      [f'порог: +{dec2(hi)} ключа в день', '—', '—', E.valor_pace(HOURS, keys_add_x100=hi)['days_per_rune'], '—']]))
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
                          f'tempoLimit: {dec2(hi)}', f'tempoLimit5: {base["limit5"]}']))
    text = '\n'.join(out) + '\n'
    with open(os.path.join(HERE, 'tempo.md'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print(f'Руна доблести у обычного: модель — раз в {base["days_per_rune"]} дн., с ключами сундуков (+{dec2(add)} в день) — '
          f'раз в {chest["days_per_rune"]} дн.; темп сдвинется с +{dec2(hi)} ключа в день.')
    if '--check' in sys.argv:
        bad = []
        if chest['days_per_rune'] < base['days_per_rune']:
            bad.append('ключи сундуков ускоряют руну доблести у обычного')
        if d['keyRecipes'] or any(rows[c]['runeKeysX100'] for c in range(2, 7)):
            bad.append('крафт даёт рунные ключи напрямую: ' + ', '.join(d['keyRecipes']) + ' — по слову автора их нет (ADR-0033)')
        if bad:
            sys.exit('tempo.py: ' + '; '.join(bad))


if __name__ == '__main__':
    main()
