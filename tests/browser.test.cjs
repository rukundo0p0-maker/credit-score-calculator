const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

(async function(){
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:1280,height:850}});
  const errors = [];
  page.on('pageerror', err=>errors.push(err.message));
  try {
    const root = path.resolve(__dirname,'..');
    await page.goto(pathToFileURL(path.join(root,'index.html')).toString());
    await page.locator('#exampleBtn').click();
    const mainScore = (await page.locator('#scoreValue').textContent()).trim();
    assert.match(mainScore,/^\d{3}$/, 'Original estimator calculates a numeric score');
    assert.equal(await page.locator('#scoreResult').isVisible(), true);
    console.log('PASS original calculator:', mainScore);
    assert.deepEqual(errors,[],'No script errors on original calculator');

    await page.locator('a[href="scenarios.html"]').first().click();
    await page.locator('#cardList .item').first().waitFor();
    assert.equal(await page.locator('#cardList .item').count(),2,'Default cards present');
    assert.equal(await page.locator('#collectionList .item').count(),1,'Default collection present');
    assert.match((await page.locator('#scoreBefore').textContent()).trim(),/^\d{3}$/);
    assert.match((await page.locator('#scoreAfter').textContent()).trim(),/^\d{3}$/);
    console.log('PASS initial scenario numbers');

    await page.locator('#addCard').click();
    assert.equal(await page.locator('#cardList .item').count(),3,'Add credit card works');
    await page.locator('#cardList .item').last().locator('input[data-field="balance"]').fill('500');
    await page.locator('#cardList .item').last().locator('input[data-field="pay"]').fill('300');
    assert.match(await page.locator('#cardBalances').textContent(),/\$4,700\.00 → \$2,400\.00/,'Card balances update after editing');
    console.log('PASS add card, edit card, payoff recalculates');

    await page.locator('#collectionList .item').first().locator('select[data-field="action"]').selectOption('keep');
    assert.equal((await page.locator('#collectionCounts').textContent()).trim(),'1 → 1');
    await page.locator('#collectionList .item').first().locator('select[data-field="action"]').selectOption('pay');
    assert.equal((await page.locator('#collectionCounts').textContent()).trim(),'1 → 0');
    console.log('PASS collection keep vs pay');

    await page.locator('#addCollection').click();
    assert.equal(await page.locator('#collectionList .item').count(),2);
    await page.locator('#collectionList .item').last().locator('button[data-remove]').click();
    assert.equal(await page.locator('#collectionList .item').count(),1);
    console.log('PASS add/remove collections');

    await page.locator('#cardList .item').first().locator('input[data-field="pay"]').fill('99999');
    assert.equal(await page.locator('#error').isVisible(),true);
    await page.locator('#reset').click();
    assert.equal(await page.locator('#error').isVisible(),false);
    assert.deepEqual(errors,[],'No uncaught JavaScript errors');
    console.log('PASS invalid-payment validation and reset; all browser tests passed');
  } finally {
    await browser.close();
  }
})().catch(e=>{ console.error(e); process.exit(1); });