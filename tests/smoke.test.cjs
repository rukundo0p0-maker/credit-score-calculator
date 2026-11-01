const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/i);
assert.ok(scriptMatch, 'HTML contains an executable inline script');
const script = scriptMatch[1];
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');

function createPage() {
  const nodes = new Map();
  for (const id of ids) {
    const listeners = {};
    const classes = new Set();
    nodes.set(id, {
      id, value: '', min: '', max: '', checked: false,
      textContent: '', innerHTML: '', style: {}, dataset: {}, listeners,
      classList: {
        add(value) { classes.add(value); },
        remove(value) { classes.delete(value); },
        contains(value) { return classes.has(value); },
        toggle(value, force) {
          if (force === undefined) force = !classes.has(value);
          if (force) classes.add(value); else classes.delete(value);
        }
      },
      addEventListener(name, fn) { listeners[name] = fn; },
      scrollIntoView() {},
      focus() {},
      reset() {},
      requestSubmit() {
        assert.ok(listeners.submit, 'form has submit listener');
        listeners.submit({ preventDefault() {} });
      }
    });
  }
  const document = {
    getElementById(id) {
      assert.ok(nodes.has(id), 'Missing DOM element: ' + id);
      return nodes.get(id);
    }
  };
  const window = { matchMedia: () => ({ matches: false }) };
  const navigator = { clipboard: { writeText: async () => {} } };
  const ctx = vm.createContext({ document, window, navigator, setTimeout() {} });
  vm.runInContext(script, ctx, { filename: 'index.inline.js', timeout: 2000 });
  return { nodes, ctx, get: id => nodes.get(id) };
}
function fireInput(element, key, row, value, type = 'number') {
  assert.ok(element.listeners.input);
  element.listeners.input({
    target: {
      type, value, dataset: { key },
      closest() {
        return { dataset: { row: String(row) }, parentElement: { id: element.id } };
      }
    }
  });
}

test('Version 2 script parses and initial scenario calculates', () => {
  const { get } = createPage();
  assert.match(get('labCardList').innerHTML, /Card A/);
  assert.match(get('labCollectionList').innerHTML, /Collection 1/);
  assert.ok(Number(get('labBefore').textContent) >= 300);
  assert.ok(Number(get('labAfter').textContent) <= 850);
  assert.equal(get('labCollectionsCount').textContent, '1 → 0');
});

test('Adding cards and changing a planned payment recomputes immediately', () => {
  const { get } = createPage();
  get('labAddCard').listeners.click();
  assert.equal((get('labCardList').innerHTML.match(/lab-card-entry/g) || []).length, 4);
  fireInput(get('labCardList'), 'pay', 0, '2500');
  assert.equal(get('labPayments').textContent, '$2,500');
  assert.equal(get('labError').textContent, '');
});

test('Collection payoff and leaving unpaid produce distinct scenarios', () => {
  const { get } = createPage();
  assert.equal(get('labCollectionsCount').textContent, '1 → 0');
  fireInput(get('labCollectionList'), 'action', 0, 'keep', 'select-one');
  assert.equal(get('labCollectionsCount').textContent, '1 → 1');
  fireInput(get('labCollectionList'), 'action', 0, 'pay', 'select-one');
  assert.equal(get('labCollectionsCount').textContent, '1 → 0');
});

test('Main five-factor calculator still works with example inputs', () => {
  const { get } = createPage();
  get('exampleBtn').listeners.click();
  assert.match(String(get('scoreValue').textContent), /^\d{3}$/);
  assert.equal(get('errorMessage').textContent, '');
  assert.match(get('factorBreakdown').innerHTML, /Payment history/);
  assert.match(get('insightText').textContent, /./);
});
