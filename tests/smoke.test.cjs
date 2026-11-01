const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function inspect(filename) {
  const html = fs.readFileSync(filename, 'utf8');
  const match = html.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/i);
  assert.ok(match, filename + ': inline script exists');
  new vm.Script(match[1], {filename:filename + ':inline-script'});
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length, new Set(ids).size, filename + ': IDs must be unique');
  assert.equal((html.match(/<\/html>/g)||[]).length, 1, filename + ': one closing html element');
  return html;
}

test('Restored Version 1 calculator parses with original calculation logic', () => {
  const html = inspect('index.html');
  assert.match(html,/id="calculatorForm"/);
  assert.match(html,/function calculate\(d\)/);
  assert.match(html,/id="exampleBtn"/);
  assert.match(html,/href="scenarios.html"/);
  assert.doesNotMatch(html,/initDecisionLab/);
});

test('Separate scenario page parses and has operational controls', () => {
  const html = inspect('scenarios.html');
  for(const id of ['addCard','addCollection','cardList','collectionList','scoreBefore','scoreAfter','compare','reset','error']) {
    assert.ok(html.includes('id="'+id+'"'), 'missing '+id);
  }
  assert.match(html,/function snapshot\(after\)/);
  assert.match(html,/function bindRows\(elementId, array\)/);
});