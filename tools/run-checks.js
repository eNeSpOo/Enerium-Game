/* Полный прогон проверок проекта — перед коммитом (CLAUDE.md, «Как работаем»).
   Что идёт: все check*.js под tools/ и сборщики с --check — шаги 13–14 «Порядка сборки» в tools/content-gen/README.md.
   Запуск: node tools/run-checks.js                — всё;
           node tools/run-checks.js wanderer echo  — только команды, в пути которых есть любое из слов.
   Команды идут по одной: прогон дольше, зато не душит машину. Строка на команду — «ок» или «УПАЛО» и последняя строка вывода,
   у упавшей — ещё хвост вывода. Код выхода 1, если упала хоть одна.
   Новые check*.js находятся сами; новый сборщик с --check — дописать в BUILDERS и в шаг 13 README. */
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const PY = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const TIMEOUT_MS = 10 * 60 * 1000;   // одна команда — не дольше десяти минут
const TAIL = 15;                     // строк хвоста у упавшей команды

/* сборщики с --check — в порядке шага 13 README, последним — шаг 14 (таблицы Excel). Третьим полем — свой флаг вместо --check:
   --mut у сборщика наборов — проверка мутацией: законы Н1–Н9 (ADR-0050) ловят каждую из поломок; у проверки документов
   tools/docs/check_docs.py — законы Д1–Д8 о шапках ADR, ссылках и карте (ADR-0053) */
const BUILDERS = [
  [PY, 'tools/content-gen/abilities/library.py'],
  [PY, 'tools/content-gen/abilities/library.py', '--mut'],   // законы описаний О1–О4 (ADR-0052) ловят каждую поломку; число из данных меняет текст
  [PY, 'tools/content-gen/abilities/assign.py'],
  [PY, 'tools/content-gen/abilities/assign.py', '--mut'],
  ['node', 'tools/content-gen/foes/ladder.js'],             // общая лестница врагов (ADR-0051): законы Л1–Л5 и свежесть снимка
  ['node', 'tools/content-gen/foes/ladder.js', '--mut'],    // каждую поломку лестницы ловит свой закон
  ['node', 'tools/content-gen/tables/check_spoilers.js', '--mut'],   // лестница спойлеров: раскрытие — с цикла VI (ADR-0054)
  [PY, 'tools/content-gen/recipes/tempo.py'],
  ['node', 'tools/content-gen/lootboxes/build.js'],
  ['node', 'tools/content-gen/contracts/build.js'],
  ['node', 'tools/content-gen/event/build.js'],
  ['node', 'tools/content-gen/clan/build.js'],
  ['node', 'tools/content-gen/rituals/build.js'],
  ['node', 'tools/content-gen/arena/build.js'],
  ['node', 'tools/content-gen/equipment/build.js'],
  ['node', 'tools/content-gen/talismans/build.js'],
  ['node', 'tools/content-gen/wanderer/build.js'],
  ['node', 'tools/content-gen/pass/build.js'],
  ['node', 'tools/content-gen/store/build.js'],
  ['node', 'tools/content-gen/lore/build.js'],
  ['node', 'tools/content-gen/economy/enerium.js'],
  ['node', 'tools/content-gen/start/build.js'],
  [PY, 'tools/content-gen/biomes/pace.py'],
  [PY, 'tools/content-gen/biomes/farm.py'],
  [PY, 'tools/content-gen/economy/echo.py'],
  [PY, 'tools/content-gen/contracts/capacity.py'],
  [PY, 'tools/content-gen/clan/capacity.py'],
  [PY, 'tools/content-gen/wanderer/pace_inputs.py'],
  [PY, 'tools/content-gen/cycle/climb.py'],
  ['node', 'tools/content-gen/cycle/build.js'],
  [PY, 'tools/content-gen/tables/build.py'],
  [PY, 'tools/docs/adr_index.py'],
  [PY, 'tools/docs/check_docs.py'],
  [PY, 'tools/docs/check_docs.py', '--mut'],
].map(([cmd, file, flag]) => [cmd, file, flag || '--check']);

function findChecks(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '__pycache__' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) findChecks(p, acc);
    else if (/^check.*\.js$/.test(e.name)) acc.push(path.relative(ROOT, p).split(path.sep).join('/'));
  }
  return acc;
}

const words = process.argv.slice(2);
const all = findChecks(path.join(ROOT, 'tools')).sort().map(f => ['node', f]).concat(BUILDERS);
const runs = words.length ? all.filter(c => words.some(w => c.join(' ').includes(w))) : all;
if (!runs.length) { console.log(`Нет команд со словами: ${words.join(', ')}`); process.exit(1); }

let bad = 0;
const t0 = Date.now();
for (const c of runs) {
  const missing = !fs.existsSync(path.join(ROOT, c[1]));
  const r = missing ? null : spawnSync(c[0] === 'node' ? process.execPath : c[0], c.slice(1),
    { cwd: ROOT, encoding: 'utf8', timeout: TIMEOUT_MS, maxBuffer: 1 << 26, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  const out = missing ? 'нет файла' : ((r.stdout || '') + (r.stderr || '') + (r.error ? `\n${r.error.message}` : '')).trimEnd();
  const ok = !missing && r.status === 0;
  if (!ok) bad++;
  const lines = out.split(/\r?\n/).filter(s => s.trim());
  console.log(`${ok ? 'ок   ' : 'УПАЛО'} ${c.join(' ')} :: ${(lines[lines.length - 1] || '').slice(0, 160)}`);
  if (!ok) console.log(lines.slice(-TAIL).map(s => '      ' + s).join('\n'));
}
console.log(`\nКоманд ${runs.length}, прошло ${runs.length - bad}, упало ${bad}; ${Math.round((Date.now() - t0) / 1000)} с.`);
process.exit(bad ? 1 : 0);
