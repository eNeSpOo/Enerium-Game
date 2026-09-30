"""Темп доблести при крафте (поручение автора 30.09.2026, п. 6): не ломает ли крафт темп ADR-0030 и ADR-0031 —
руна доблести у обычного раз в 9 дней.

Откуда берутся лишние рунные ключи у обычного: закрытия крафтовых мест (шанс CRAFT.biome.runeKeyBp), победы над призванными
(крафтовые боссы, эхо боссов биомов, боссы городов) и рецепты ключей. Их в день считает модель стока (sink.js → recipes.js,
stats.sink[].runeKeysX100). Калькулятор экономики (tools/content-gen/economy/economy.py, valor_pace) ведёт обычного от начала цикла II
до пятого предела; добавку ключей он берёт одной строкой в день — берём большую из циклов II и III, это верхняя оценка: время крафтовых
биомов забрано у обычных, и ключей с их боссов на деле меньше.

Руническая пыль (п. 7): пыль из ключей и осколки из пыли — против боя со стражем доблести. Обычный упирается в ключи, а не в кап
побед (ADR-0022), лишних ключей у него нет — путь через пыль его темп не меняет; у того, кто упёрся в кап, пыль даёт осколки втрое-
вчетверо дороже боя.

Запуск: python tools/content-gen/recipes/tempo.py — печать и блоки tempo.md для assemble.js; --check — ошибка, если руна доблести
у обычного с крафтом выходит чаще, чем без него. Только целая арифметика."""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'content-gen', 'economy'))
import economy as E  # noqa: E402

ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI']
HOURS = 3   # обычный: 3 часа забегов (ADR-0031)


def load():
    js = ("globalThis.window=globalThis;require('./design/ui/recipes.js');const R=globalThis.EN_RECIPES,D=R.drops;"
          "const pick=r=>({id:r.id,cyc:r.cyc,out:r.out,in:r.in});"
          "process.stdout.write(JSON.stringify({sink:R.stats.sink,guardians:D.guardians,"
          "dust:R.recipes.filter(r=>r.fam==='dust').map(pick)}))")
    res = subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    if res.returncode:
        sys.exit('tempo.py: не прочитать design/ui/recipes.js — ' + res.stderr)
    return json.loads(res.stdout)


def dec2(x100):
    return f'{x100 // 100},{x100 % 100:02d}'


def table(head, rows):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '---|' * len(head)]
    out += ['| ' + ' | '.join(str(x) for x in r) + ' |' for r in rows]
    return '\n'.join(out)


def main():
    d = load()
    rows = {r['cyc']: r for r in d['sink']}
    base = E.valor_pace(HOURS)
    add = max(rows[2]['runeKeysX100'], rows[3]['runeKeysX100'])
    craft = E.valor_pace(HOURS, keys_add_x100=add)
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
    R = E.rx()
    split = E.RB_SPLIT_BP
    out = []
    # 1. добавка ключей по циклам и темп
    t1 = []
    for c in range(2, 7):
        r = rows[c]
        price = E.avg_price_x100(c)
        wins_x100 = r['runeKeysX100'] * 100 // price
        shards_x100 = wins_x100 * (E.BP - split) // E.BP * R['shards_x100'] // 100
        t1.append([ROMAN[c], dec2(r['runeKeysX100']), dec2(price), dec2(wins_x100), dec2(shards_x100)])
    out.append('<!-- tempo-keys -->')
    out.append(table(['Цикл', 'Рунных ключей от крафта в день', 'Ключей на победу (7 : 3)', 'Побед в день сверху, не выше капа',
                      'Осколков доблести в день сверху'], t1))
    out.append('<!-- tempo-valor -->')
    out.append(table(['Прогон valor_pace, обычный 3 ч', 'Пятый предел, день', 'Побед у стража доблести в день', 'Дней на руну доблести',
                      'Рун доблести к пятому пределу'],
                     [['без крафта', base['limit5'], dec2(base['val_x100']), base['days_per_rune'], base['runes_at_limit5']],
                      [f'с крафтом: +{dec2(add)} ключа в день', craft['limit5'], dec2(craft['val_x100']), craft['days_per_rune'],
                       craft['runes_at_limit5']],
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
    out.append('\n'.join([f'tempoBase: {base["days_per_rune"]}', f'tempoCraft: {craft["days_per_rune"]}', f'tempoAdd: {dec2(add)}',
                          f'tempoLimit: {dec2(hi)}', f'tempoLimit5: {base["limit5"]}']))
    text = '\n'.join(out) + '\n'
    with open(os.path.join(HERE, 'tempo.md'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print(f'Руна доблести у обычного: без крафта — раз в {base["days_per_rune"]} дн., с крафтом (+{dec2(add)} ключа в день) — '
          f'раз в {craft["days_per_rune"]} дн.; темп сдвинется с +{dec2(hi)} ключа в день.')
    if '--check' in sys.argv and craft['days_per_rune'] < base['days_per_rune']:
        sys.exit('tempo.py: крафт ускоряет руну доблести у обычного')


if __name__ == '__main__':
    main()
