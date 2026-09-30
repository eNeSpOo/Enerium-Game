/* Кадры прототипа без окна браузера — безголовый Chrome по протоколу DevTools (CDP).
   Зачем: панель браузера в приложении скрыта, когда автор не смотрит, и её снимки устаревают; проверки считают вёрстку арифметикой
   и не видят, например, обрезанный текст. Этот инструмент снимает настоящий кадр устройства прототипа.

   Запуск: node tools/ui-shots/shots.js <spec.json> <папка вывода> [порт]
   - прототип должен отвечать на http://localhost:8765/ (сервер превью «ui-prototype» из .claude/launch.json);
   - Chrome берётся из C:/Program Files/Google/Chrome/Application/chrome.exe, профиль — временный, во временной папке системы, профиль автора не трогается;
   - если на порту уже есть безголовый Chrome, скрипт подключается к нему, иначе запускает свой и закрывает в конце.
   spec — массив кадров: [{ "name": "hb-skills", "dev": "932" | "844", "js": "…код состояния…; render();", "wait": 1800 }]
   Кадр — PNG устройства (.p-device) в deviceScaleFactor 2. Строка отчёта отмечает BAD-MARKUP, если в #game есть undefined, NaN или [object. */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const [, , spec, outDir, portArg] = process.argv;
if (!spec || !outDir) { console.log('node tools/ui-shots/shots.js <spec.json> <папка вывода> [порт]'); process.exit(2); }
const shots = JSON.parse(fs.readFileSync(spec, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const PORT = +portArg || 9333;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const prof = path.join(require('os').tmpdir(), 'enerium-ui-shots-chrome');   // временный профиль вне репозитория
const sleep = ms => new Promise(r => setTimeout(r, ms));
let chrome = null;
const spawnChrome = () => spawn(CHROME, [`--remote-debugging-port=${PORT}`, '--headless=new', '--window-size=1600,1000', '--hide-scrollbars',
  `--user-data-dir=${prof}`, '--no-first-run', '--no-default-browser-check', '--remote-allow-origins=*', 'about:blank'], { stdio: 'ignore' });
const pageWs = async () => { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); const p = l.find(t => t.type === 'page'); return p && p.webSocketDebuggerUrl; };
async function target() {
  try { const w = await pageWs(); if (w) return w; } catch (_) { chrome = spawnChrome(); }
  for (let i = 0; i < 80; i++) { try { const w = await pageWs(); if (w) return w; } catch (_) { } await sleep(250); }
  throw new Error('Chrome не ответил на порту ' + PORT);
}
(async () => {
  let ws;
  try {
    ws = new WebSocket(await target());
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0; const wait = new Map();
    ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } };
    const cmd = (method, params = {}) => new Promise(res => { const i = ++id; wait.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async expr => { const r = await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result && r.result.result ? r.result.result.value : null; };
    await cmd('Page.enable'); await cmd('Runtime.enable');
    await cmd('Network.enable'); await cmd('Network.setCacheDisabled', { cacheDisabled: true });   // у стилей нет штампа версии: иначе долгоживущий Chrome покажет старые
    await cmd('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 2, mobile: false });
    /* ждём, пока прототип поднимется: без кэша ~90 скриптов и сотни картинок грузятся дольше фиксированной паузы; сервер превью под
       нагрузкой иногда отказывает в соединении — тогда страница без скриптов, и её грузим заново (до трёх раз) */
    let up = false;
    for (let t = 0; t < 3 && !up; t++) {
      await cmd('Page.navigate', { url: 'http://localhost:8765/' });
      for (let i = 0; i < 60; i++) { await sleep(500); if (await ev(`typeof S !== 'undefined' && typeof render === 'function' && !!document.querySelector('.p-device')`)) { up = true; break; } }
    }
    if (!up) throw new Error('прототип не поднялся за три загрузки');
    await sleep(800);
    const log = [];
    for (const s of shots) {
      const dev = s.dev || '932';
      const r = await ev(`(async () => { try {
        const b = [...document.querySelectorAll('button')].find(x => new RegExp('${dev}\\\\s*×').test(x.textContent)); if (b) b.click();
        await new Promise(r => setTimeout(r, 200));
        ${s.js}
        await new Promise(r => setTimeout(r, ${+s.wait || 1200}));
        const d = document.querySelector('.p-device').getBoundingClientRect();
        const g = document.getElementById('game'); const bad = g && /undefined|NaN|\\[object/.test(g.innerHTML);
        return { x: d.left + scrollX, y: d.top + scrollY, w: d.width, h: d.height, bad };
      } catch (e) { return { err: String(e && e.stack || e) }; } })()`);
      if (!r || r.err) { log.push(`${s.name}: ОШИБКА ${r && r.err}`); continue; }
      const shot = await cmd('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 }, captureBeyondViewport: true });
      fs.writeFileSync(path.join(outDir, s.name + '.png'), Buffer.from(shot.result.data, 'base64'));
      log.push(`${s.name}: ${Math.round(r.w)}×${Math.round(r.h)}${r.bad ? ' BAD-MARKUP' : ''}`);
    }
    console.log(log.join('\n'));
  } catch (e) { console.log('Сбой:', e && e.message); process.exitCode = 1; }
  finally { try { ws && ws.close(); } catch (_) { } if (chrome) chrome.kill(); }
})();
