const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium, request } = require('playwright');
(async () => {
  const { owner } = JSON.parse(fs.readFileSync(process.env.MANHUNT_TEST_FIXTURE_PATH, 'utf8'));
  const backend = process.env.MANHUNT_BACKEND || 'http://localhost:8080';
  const app = process.env.MANHUNT_APP_URL || 'http://localhost:5173';
  const api = await request.newContext({ baseURL: backend });
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const errors = [];
  const contexts = [];
  let csrf, template, game;
  async function post(path, data = {}) {
    const r = await api.post('/api/v1' + path, { headers: { 'X-CSRF-Token': csrf || '' }, data });
    assert.ok(r.ok(), `${path}: ${r.status()} ${await r.text()}`); return r.json();
  }
  async function state() { return (await (await api.get(`/api/v1/sessions/${game.id}/admin-state`)).json()).session; }
  async function until(fn, message) { const end = Date.now() + 22000; while (Date.now() < end) { if (await fn()) return; await new Promise(r => setTimeout(r, 150)); } throw new Error(message); }
  async function player(name, role, longitude) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, geolocation: { latitude: 52.55, longitude }, permissions: ['geolocation'] }); contexts.push(ctx);
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(app); await page.getByRole('button', { name: 'Setup', exact: true }).click();
    await page.getByRole('button', { name: 'Standort und Benachrichtigungen freigeben' }).click();
    await page.getByRole('button', { name: 'Setup schließen' }).click();
    await page.getByLabel('Spielcode', { exact: true }).fill(game.code);
    await page.getByRole('button', { name: /Spiel beitreten/ }).click();
    await page.getByLabel('Dein Name im Spiel').fill(name);
    assert.equal(await page.getByText('DIE STADT IST DEIN SPIELFELD', { exact: true }).count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), 'Name/role step should fit the mobile viewport');
    await page.getByRole('radio', { name: role === 'hunter' ? /Jäger/ : /Gejagter/ }).check();
    await page.getByRole('button', { name: 'Los geht’s', exact: true }).click();
    await page.getByRole('heading', { name: game.name, exact: true }).waitFor();
    await page.getByRole('button', { name: 'Ich bin bereit', exact: true }).click();
    await page.getByRole('button', { name: 'Bereit ✓ · Zurücknehmen', exact: true }).waitFor();
    assert.equal(await page.locator('.player-marker').count(), 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    return page;
  }
  try {
    csrf = (await post('/auth/login', owner)).csrfToken;
    const rules = (await (await api.get('/api/v1/templates/options')).json()).rules;
    Object.assign(rules, { firstSilentPingSeconds: 8, silentPingIntervalSeconds: 15, clusterEnabled: false, hunterLocationUses: 2, regenerationUses: 2, fakePingUses: 2 });
    template = (await post('/templates', { name: 'Mobile App Test', rules, field: { type: 'Polygon', coordinates: [[[13.4,52.5],[13.5,52.5],[13.5,52.6],[13.4,52.6],[13.4,52.5]]] } })).template;
    game = (await post(`/templates/${template.id}/sessions`)).session;
    const runner = await player('Mobile Runner', 'runner', 13.45), hunter = await player('Mobile Hunter', 'hunter', 13.452);
    await post(`/sessions/${game.id}/start`);
    await runner.getByText(/Jagd in/).waitFor();
    await runner.getByRole('button', { name: 'Boni und Fangbestätigungen öffnen' }).click();
    await runner.getByRole('button', { name: 'Jägerpositionen erfragen', exact: true }).click();
    await runner.getByRole('button', { name: 'Aktionen schließen' }).click();
    await runner.locator('.hunter-snapshot-marker').waitFor();
    const eye = runner.getByRole('button', { name: 'Jäger-Momentaufnahme ein- oder ausblenden' });
    await eye.click(); assert.equal(await runner.locator('.hunter-snapshot-marker').count(), 0);
    await eye.click(); assert.equal(await runner.locator('.hunter-snapshot-marker').count(), 1);
    await runner.reload(); await runner.getByRole('heading', { name: game.name, exact: true }).waitFor();
    await hunter.locator('.published-ping').waitFor();
    assert.match((await hunter.locator('.player-label-runner').innerText()), /Silent-Ping · \d{2}:\d{2}:\d{2}/);
    await runner.getByRole('button', { name: 'Boni und Fangbestätigungen öffnen' }).click();
    await runner.getByRole('button', { name: 'Fake-Ping auf Karte wählen', exact: true }).click();
    const map = runner.getByTestId('game-map'); await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 180, y: 240 } });
    await runner.getByRole('button', { name: 'Fake-Ping aktivieren', exact: true }).click();
    const beforeFake = (await state()).participants.find(p => p.name === 'Mobile Runner');
    assert.ok(beforeFake.bonuses.pending?.type === 'fake_ping');
    assert.equal(beforeFake.position.longitude, 13.45);
    await runner.getByRole('button', { name: 'Aktionen schließen' }).click();
    assert.ok(await runner.locator('.round-tool svg').count());
    await hunter.getByRole('button', { name: 'Jagdaktionen öffnen' }).click();
    await hunter.getByRole('button', { name: 'Speedhunt starten', exact: true }).click();
    await until(async () => (await state()).speedhunt?.status === 'active', 'Speedhunt missing');
    for (const page of [runner, hunter]) await page.getByText('Aktiver Speedhunt, Ping 1/3', { exact: true }).waitFor();
    await hunter.getByRole('button', { name: 'Nächsten Speedhunt-Ping anfordern', exact: true }).click();
    await until(async () => (await state()).speedhunt?.pings.length === 2, 'Second speedhunt ping missing');
    for (const page of [runner, hunter]) await page.getByText('Aktiver Speedhunt, Ping 2/3', { exact: true }).waitFor();
    if (process.env.SCREENSHOT_PATH) await runner.screenshot({ path: process.env.SCREENSHOT_PATH.replace('.png', '-speedhunt.png'), fullPage: true });
    await hunter.getByRole('button', { name: 'Fang melden', exact: true }).click();
    await runner.getByRole('button', { name: 'Boni und Fangbestätigungen öffnen' }).click();
    await runner.getByRole('button', { name: 'Fang bestätigen', exact: true }).click();
    const report = (await state()).catches.find(c => c.status === 'pending');
    await post(`/sessions/${game.id}/catches/${report.id}/admin-decision`, { confirm: true });
    await until(async () => (await state()).result === 'hunters_win', 'Catch not confirmed');
    await runner.getByRole('button', { name: 'Aktionen schließen' }).click();
    await runner.getByText('Die Jäger gewinnen', { exact: true }).waitFor();
    if (process.env.SCREENSHOT_PATH) await runner.screenshot({ path: process.env.SCREENSHOT_PATH, fullPage: true });
    await post(`/sessions/${game.id}/close`);
    for (const page of [runner, hunter]) { await page.getByLabel('Spielcode', { exact: true }).waitFor(); assert.equal(await page.evaluate(() => sessionStorage.getItem('manhunt-player')), null); }
    assert.deepEqual(errors, []);
    console.log('PASS: mobile join/roles; actual browser GPS; preparation/readiness; token restore; private snapshot toggle; fake selection preserves real GPS; SVG controls; timestamped hunter pings; speedhunt/pings; double-confirmed catch; official reset; no JS errors or horizontal overflow.');
  } catch (e) {
    if (process.env.SCREENSHOT_PATH) for (let i=0; i<contexts.length; ++i) await contexts[i].pages()[0]?.screenshot({ path: process.env.SCREENSHOT_PATH.replace('.png', `-failure-${i}.png`), fullPage: true }).catch(() => {});
    throw e;
  } finally {
    if (game && csrf) { await api.post(`/api/v1/sessions/${game.id}/finish`, { headers: { 'X-CSRF-Token': csrf }, data: {} }).catch(() => {}); await api.post(`/api/v1/sessions/${game.id}/close`, { headers: { 'X-CSRF-Token': csrf }, data: {} }).catch(() => {}); }
    if (template && csrf) await api.delete(`/api/v1/templates/${template.id}`, { headers: { 'X-CSRF-Token': csrf }, data: {} }).catch(() => {});
    await browser.close(); await api.dispose();
  }
})().catch(e => { console.error(e); process.exit(1); });
