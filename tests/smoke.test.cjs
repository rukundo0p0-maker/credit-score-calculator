const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function inspect(filename) {
  const html = fs.readFileSync(filename, 'utf8');
  const matches = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/ig)];
  assert.ok(matches.length>0, filename + ': inline script exists');
  matches.filter(m=>!/<script[^>]*type=["']application\/ld\+json["']/i.test(m[0].slice(0,m[0].indexOf('>')+1))).forEach((m,i)=>new vm.Script(m[1], {filename:filename + ':inline-script-'+i}));
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
  assert.match(html,/id="addProfileLoan"/);
  assert.match(html,/id="profileLoanList"/);
  assert.match(html,/id="cardPayoffPlan"/);
  assert.match(html,/<script defer src="analytics.js"><\/script>/);
  assert.match(html,/<meta property="og:site_name" content="Credit Score Hub"/);
  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(ld, 'Site name JSON-LD present');
  const data = JSON.parse(ld[1]);
  assert.equal(data.name, 'Credit Score Hub');
  assert.equal(data.url, 'https://yourcreditscorecalculator.com/');
  assert.doesNotMatch(html,/initDecisionLab/);
});

test('Separate scenario page parses and has operational controls', () => {
  const html = inspect('scenarios.html');
  for(const id of ['addCard','addLoan','addCollection','cardList','loanList','collectionList','loanBalances','installmentRatio','helocBalances','loanPayments','scoreBefore','scoreAfter','compare','reset','error']) {
    assert.ok(html.includes('id="'+id+'"'), 'missing '+id);
  }
  assert.match(html,/function snapshot\(after\)/);
  assert.match(html,/function loanSummary\(after\)/);
  assert.match(html,/<script defer src="analytics.js"><\/script>/);
  assert.match(html,/<meta property="og:site_name" content="Credit Score Hub"/);
  assert.match(html,/function bindRows\(elementId, array\)/);
});

test('Analytics initializer only injects GA4 after consent and privacy page is available', () => {
  const js = fs.readFileSync('analytics.js','utf8');
  new vm.Script(js, {filename:'analytics.js'});
  assert.match(js, /G-3SHJEG2YQ7/);
  assert.match(js, /csh-analytics-banner/);
  assert.match(js, /credit-score-hub-analytics-consent-v1/);
  assert.match(js, /beginAnalytics\(\)/);
  const policy = inspect('privacy.html');
  assert.match(policy, /Change analytics preference/);
  assert.match(policy, /<script defer src="analytics.js"><\/script>/);
});
