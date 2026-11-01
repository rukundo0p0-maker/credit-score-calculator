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
    const mainOrder = await page.locator('.fields.card-triplet input').evaluateAll(nodes=>nodes.map(x=>x.id));
    assert.deepEqual(mainOrder,['cardLimit','cardBalance','cardPayoffPlan'],'Main credit card fields are limit, balance, payoff');
    await page.locator('#cardPayoffPlan').fill('500');
    assert.match(await page.locator('#loanResultSummary').textContent(),/15\.0% → 10\.0%/,'Main planned payoff gives updated utilization');
    await page.locator('#addProfileLoan').click();
    assert.equal(await page.locator('#profileLoanList .loan-entry').count(),1);
    assert.equal(await page.locator('#mixLoans').isChecked(),true,'Car loan adds installment credit mix');
    await page.locator('#profileLoanList .loan-entry select[data-field="type"]').selectOption('mortgage');
    assert.equal(await page.locator('#mixMortgage').isChecked(),true,'Mortgage adds mortgage mix');
    await page.locator('#profileLoanList .loan-entry input[data-field="original"]').fill('200000');
    await page.locator('#profileLoanList .loan-entry input[data-field="balance"]').fill('145000');
    assert.match(await page.locator('#profileLoanSummary').textContent(),/72\.5% remaining/);
    await page.locator('#calculatorForm button[type="submit"]').click();
    assert.match((await page.locator('#scoreValue').textContent()).trim(),/^\d{3}$/,'Original calculator still works after adding a mortgage');
    await page.locator('#resetBtn').click();
    assert.equal(await page.locator('#profileLoanList .loan-entry').count(),0,'Main loan rows reset');
    console.log('PASS main loan type inputs, balance summary, payoff column order and original calculator');

    await page.locator('a[href="scenarios.html"]').first().click();
    await page.locator('#cardList .item').first().waitFor();
    assert.equal(await page.locator('#cardList .item').count(),2,'Default cards present');
    assert.equal(await page.locator('#collectionList .item').count(),1,'Default collection present');
    assert.match((await page.locator('#scoreBefore').textContent()).trim(),/^\d{3}$/);
    assert.match((await page.locator('#scoreAfter').textContent()).trim(),/^\d{3}$/);
    const scenarioOrder = await page.locator('#cardList .item').first().locator('.fields input').evaluateAll(nodes=>nodes.map(x=>x.dataset.field));
    assert.deepEqual(scenarioOrder,['limit','balance','pay'],'Individual card columns are limit, balance, payoff');
    console.log('PASS initial scenario numbers and card column order');

    await page.locator('#addCard').click();
    assert.equal(await page.locator('#cardList .item').count(),3,'Add credit card works');
    await page.locator('#cardList .item').last().locator('input[data-field="balance"]').fill('500');
    await page.locator('#cardList .item').last().locator('input[data-field="pay"]').fill('300');
    assert.match(await page.locator('#cardBalances').textContent(),/\$4,700\.00 → \$2,400\.00/,'Card balances update after editing');
    console.log('PASS add card, edit card, payoff recalculates');

    await page.locator('#addLoan').click();
    assert.equal(await page.locator('#loanList .item').count(),1,'Add installment loan works');
    const firstLoan=page.locator('#loanList .item').first();
    await firstLoan.locator('input[data-field="original"]').fill('25000');
    await firstLoan.locator('input[data-field="balance"]').fill('15000');
    await firstLoan.locator('input[data-field="pay"]').fill('3000');
    assert.equal((await page.locator('#loanBalances').textContent()).trim(),'$15,000.00 → $12,000.00');
    assert.equal((await page.locator('#installmentRatio').textContent()).trim(),'60.0% → 48.0%');
    assert.equal((await page.locator('#loanPayments').textContent()).trim(),'$3,000.00');
    await page.locator('#addLoan').click();
    const secondLoan=page.locator('#loanList .item').last();
    await secondLoan.locator('select[data-field="type"]').selectOption('heloc');
    await secondLoan.locator('input[data-field="original"]').fill('20000');
    await secondLoan.locator('input[data-field="balance"]').fill('3500');
    await secondLoan.locator('input[data-field="pay"]').fill('500');
    assert.equal((await page.locator('#helocBalances').textContent()).trim(),'$3,500.00 / $20,000.00 → $3,000.00 / $20,000.00');
    assert.equal((await page.locator('#loanBalances').textContent()).trim(),'$18,500.00 → $15,000.00');
    await secondLoan.locator('select[data-field="type"]').selectOption('student-federal');
    assert.equal((await page.locator('#installmentRatio').textContent()).trim(),'41.1% → 33.3%');
    console.log('PASS add auto / student loan and HELOC with loan payoff / ratio updates');
    await page.locator('#loanList .item').last().locator('button[data-remove]').click();
    assert.equal(await page.locator('#loanList .item').count(),1,'Remove loan works');

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

    await page.locator('#loanList .item').first().locator('input[data-field="pay"]').fill('99999');
    assert.equal(await page.locator('#error').isVisible(),true,'Loan payoff larger than loan balance rejected');
    await page.locator('#loanList .item').first().locator('input[data-field="pay"]').fill('3000');
    assert.equal(await page.locator('#error').isVisible(),false);
    await page.locator('#cardList .item').first().locator('input[data-field="pay"]').fill('99999');
    assert.equal(await page.locator('#error').isVisible(),true);
    await page.locator('#reset').click();
    assert.equal(await page.locator('#error').isVisible(),false);
    assert.deepEqual(errors,[],'No uncaught JavaScript errors');
    console.log('PASS invalid-payment validation and reset');
    await page.setViewportSize({width:390,height:844});
    const scenarioWidth = await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:innerWidth}));
    assert.ok(scenarioWidth.scroll<=scenarioWidth.view+2,'Scenario page has no mobile horizontal overflow: '+JSON.stringify(scenarioWidth));
    await page.locator('#addCard').click();
    assert.equal(await page.locator('#cardList .item').count(),3,'Add credit card works at mobile width');
    await page.goto(pathToFileURL(path.join(root,'index.html')).toString());
    const homeWidth = await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:innerWidth}));
    assert.ok(homeWidth.scroll<=homeWidth.view+2,'Original page has no mobile horizontal overflow: '+JSON.stringify(homeWidth));

    // GA4 consent must be opt-in, shared between pages, and reversible.
    const consentPage = await browser.newPage({viewport:{width:1200,height:760}});
    const analyticsRequests = [];
    await consentPage.route('https://www.googletagmanager.com/**', async route=>{
      analyticsRequests.push(route.request().url());
      await route.fulfill({status:200,contentType:'application/javascript',body:'/* stubbed analytics tag in test */'});
    });
    await consentPage.goto(pathToFileURL(path.join(root,'index.html')).toString());
    await consentPage.locator('#csh-analytics-banner').waitFor();
    assert.equal(analyticsRequests.length,0,'Google Analytics is not requested before consent');
    assert.equal(await consentPage.locator('#csh-analytics-banner button').count(),2);
    await consentPage.locator('#csh-analytics-banner .csh-accept').click();
    await consentPage.waitForFunction(()=>!!document.querySelector('script[data-credit-score-hub-analytics]'));
    assert.equal(analyticsRequests.length,1,'Analytics loads after explicit opt-in');
    const analyticsState = await consentPage.evaluate(()=>({
      consent:localStorage.getItem('credit-score-hub-analytics-consent-v1'),
      commands:(window.dataLayer||[]).map(c=>Array.from(c))
    }));
    assert.equal(analyticsState.consent,'granted');
    assert.ok(analyticsState.commands.some(c=>c[0]==='config'&&c[1]==='G-3SHJEG2YQ7'));
    assert.ok(!JSON.stringify(analyticsState.commands).includes('1500'),'No personal balance values included in GA commands');
    console.log('PASS analytics blocked until consent, then initializes correct GA4 measurement ID');

    await consentPage.goto(pathToFileURL(path.join(root,'scenarios.html')).toString());
    assert.equal(analyticsRequests.length,2,'Accepted preference loads analytics on scenarios page');
    assert.equal(await consentPage.locator('#csh-analytics-banner').count(),0,'Consent is remembered on next page');
    await consentPage.locator('#csh-privacy-settings').click();
    await consentPage.locator('#csh-analytics-banner .csh-decline').click();
    await consentPage.waitForFunction(()=>localStorage.getItem('credit-score-hub-analytics-consent-v1')==='denied');
    await consentPage.waitForLoadState('load');
    await consentPage.reload();
    assert.equal(analyticsRequests.length,2,'Declined preference stops new analytics requests');
    assert.equal(await consentPage.locator('#csh-analytics-banner').count(),0);
    console.log('PASS analytics refusal and preference withdrawal prevent tracking');

    await consentPage.goto(pathToFileURL(path.join(root,'privacy.html')).toString());
    assert.equal(await consentPage.locator('#csh-open-privacy-preferences').count(),1,'Privacy policy is available');
    await consentPage.locator('#csh-open-privacy-preferences').click();
    await consentPage.locator('#csh-analytics-banner .csh-accept').click();
    assert.equal(analyticsRequests.length,3,'Analytics may be enabled again from privacy page');
    assert.equal(await consentPage.locator('#csh-privacy-settings').count(),1);
    console.log('PASS privacy page allows changing the analytics preference');
    await consentPage.close();

    console.log('PASS all browser tests passed');
  } finally {
    await browser.close();
  }
})().catch(e=>{ console.error(e); process.exit(1); });