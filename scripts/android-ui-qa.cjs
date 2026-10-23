/* ADB harness for synthetic, authorized emulator QA. It never installs, resets or clears app data. */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const adbPath = process.env.CICURE_QA_ADB || 'C:\\Users\\PEDRO\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const device = process.env.CICURE_QA_DEVICE || 'emulator-5554';
const packageName = 'com.pedrotescaro.cicura';
const artifacts = path.resolve('.artifacts/android-qa');
fs.mkdirSync(artifacts, { recursive: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function adb(args, binary = false) {
  try { return execFileSync(adbPath, ['-s', device, ...args], { encoding: binary ? undefined : 'utf8', timeout: 25000, maxBuffer: 32 * 1024 * 1024, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch { throw new Error('A operação ADB não foi concluída. Nenhum comando ou dado de entrada foi incluído no erro.'); }
}
function decode(value) { return value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); }
async function dump() {
  adb(['shell', 'uiautomator', 'dump', '/sdcard/cicure-qa.xml']);
  const xml = adb(['shell', 'cat', '/sdcard/cicure-qa.xml']);
  const nodes = [...xml.matchAll(/<node\b([^>]+)>/g)].map(match => {
    const attrs = Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(pair => [pair[1], decode(pair[2])]));
    const box = attrs.bounds?.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    return { ...attrs, box: box ? box.slice(1).map(Number) : null };
  });
  return { xml, nodes };
}
function matching(nodes, text, options = {}) {
  const exact = options.exact !== false;
  return nodes.filter(node => node.box && node['enabled'] !== 'false' && [node.text, node['content-desc']].some(value => value && (exact ? value === text : value.includes(text))) && (!options.className || node.class === options.className));
}
async function tapText(text, options = {}) {
  const { nodes } = await dump();
  const choices = matching(nodes, text, options);
  const found = choices[options.index ?? 0];
  if (!found) throw new Error(`Elemento não encontrado: ${text}`);
  const [left, top, right, bottom] = found.box;
  adb(['shell', 'input', 'tap', String(Math.round((left + right) / 2)), String(Math.round((top + bottom) / 2))]);
  await sleep(options.wait ?? 450);
  return found;
}
async function hasText(text, options = {}) { return matching((await dump()).nodes, text, options).length > 0; }
async function waitFor(text, options = {}) {
  const until = Date.now() + (options.timeout ?? 15000);
  while (Date.now() < until) { if (await hasText(text, options)) return; await sleep(500); }
  throw new Error(`A tela esperada não apareceu: ${text}`);
}
async function enterField(label, value, options = {}) {
  const { nodes } = await dump();
  const fields = matching(nodes, label, { ...options, className: 'android.widget.EditText' });
  const field = fields[options.index ?? 0];
  if (!field) throw new Error(`Campo não encontrado: ${label}`);
  const [left, top, right, bottom] = field.box;
  adb(['shell', 'input', 'tap', String(Math.round((left + right) / 2)), String(Math.round((top + bottom) / 2))]);
  await sleep(350);
  const focused = (await dump()).nodes.find(node => node.class === 'android.widget.EditText' && node.focused === 'true');
  if (!focused || focused['content-desc'] !== label) throw new Error(`O campo não recebeu foco: ${label}`);
  if (options.clear !== false) {
    adb(['shell', 'input', 'keycombination', 'KEYCODE_CTRL_LEFT', 'KEYCODE_A']);
    adb(['shell', 'input', 'keyevent', 'KEYCODE_DEL']);
  }
  if (/[^\x20-\x7E]/.test(value) || value.includes('%s')) throw new Error('Use somente dados sintéticos ASCII neste auxiliar de entrada ADB.');
  const remoteQuoted = "'" + value.replace(/'/g, "'\\''").replace(/ /g, '%s') + "'";
  adb(['shell', 'input', 'text', remoteQuoted]);
  await sleep(250);
}
async function swipeUp() {
  const output = adb(['shell', 'wm', 'size']);
  const size = output.match(/Override size: (\d+)x(\d+)/) || output.match(/Physical size: (\d+)x(\d+)/);
  const width = Number(size?.[1] || 1080), height = Number(size?.[2] || 2400);
  adb(['shell', 'input', 'swipe', String(Math.round(width * 0.5)), String(Math.round(height * 0.76)), String(Math.round(width * 0.5)), String(Math.round(height * 0.28)), '350']);
  await sleep(250);
}
async function scrollTo(text, options = {}) {
  for (let index = 0; index < (options.maxSwipes ?? 10); index++) { if (await hasText(text, options)) return; await swipeUp(); }
  throw new Error(`Elemento não apareceu após rolar: ${text}`);
}
async function back() { adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK']); await sleep(350); }
async function hideKeyboard() {
  if (/mInputShown=true/.test(adb(['shell', 'dumpsys', 'input_method']))) await back();
}
async function launch() { adb(['shell', 'monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1']); await sleep(1800); }
async function restart() { adb(['shell', 'am', 'force-stop', packageName]); await launch(); }
async function snapshot(name) {
  if (!/^[a-z0-9-]+$/i.test(name)) throw new Error('Nome de evidência inválido.');
  const { xml, nodes } = await dump();
  const png = path.join(artifacts, `${name}.png`);
  fs.writeFileSync(png, adb(['exec-out', 'screencap', '-p'], true));
  fs.writeFileSync(path.join(artifacts, `${name}.xml`), xml.replace(/<node\b[^>]+>/g, tag => /password="true"/.test(tag) ? tag.replace(/\btext="[^"]*"/, 'text="[oculto]"') : tag));
  return { png, nodes: nodes.filter(node => node.text || node['content-desc']).map(node => ({ text: node.password === 'true' ? '[oculto]' : node.text, label: node['content-desc'], bounds: node.bounds, class: node.class, clickable: node.clickable })) };
}
async function login(accountFile = path.join(artifacts, 'account.json')) {
  const account = JSON.parse(fs.readFileSync(accountFile, 'utf8'));
  if (!account.email || !account.password) throw new Error('Conta sintética não configurada.');
  await enterField('E-mail', account.email);
  await hideKeyboard();
  await sleep(700);
  await enterField('Senha', account.password);
  await hideKeyboard();
  await tapText('Entrar');
  await waitFor('Pacientes', { exact: false, timeout: 25000 });
  return { authenticated: true };
}
module.exports = { adb, dump, tapText, hasText, waitFor, enterField, swipeUp, scrollTo, back, hideKeyboard, launch, restart, snapshot, login, sleep };
if (require.main === module) (async () => {
  const [action = 'state', ...args] = process.argv.slice(2);
  if (action === 'state') console.log(JSON.stringify(await snapshot(args[0] || 'current'), null, 2));
  else if (action === 'tap') await tapText(args[0], { exact: args[1] !== 'partial' });
  else if (action === 'field') await enterField(args[0], args[1]);
  else if (action === 'scroll') await scrollTo(args[0], { exact: args[1] !== 'partial' });
  else if (action === 'back') await back();
  else if (action === 'launch') await launch();
  else if (action === 'restart') await restart();
  else if (action === 'login') console.log(JSON.stringify(await login(args[0])));
  else throw new Error('Ação desconhecida.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
