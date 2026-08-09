const { chromium } = require('playwright');
const fs = require('fs');

const APPS = [
  { name: 'admin', url: 'https://proyecto-ia-tad-dashboard.rewvid.easypanel.host/' },
  { name: 'advertiser', url: 'https://proyecto-ia-tad-advertiser.rewvid.easypanel.host/' },
  { name: 'driver', url: 'https://proyecto-ia-tad-driver.rewvid.easypanel.host/' },
  { name: 'player', url: 'https://proyecto-ia-tad-player.rewvid.easypanel.host/' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];

  for (const app of APPS) {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    const appErrors = {
      name: app.name,
      url: app.url,
      consoleErrors: [],
      networkFailures: [],
      exceptions: [],
      status: null,
    };

    page.on('pageerror', (exception) => {
      appErrors.exceptions.push(exception.message || String(exception));
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        appErrors.consoleErrors.push(msg.text());
      }
    });

    page.on('requestfailed', (request) => {
      const failure = request.failure();
      const errorText = failure ? failure.errorText : 'failed';
      appErrors.networkFailures.push(
        `${request.method()} ${request.url()} - ${errorText}`
      );
    });

    try {
      console.log(`Auditing ${app.name}...`);
      const response = await page.goto(app.url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      appErrors.status = response.status();
      await page.waitForTimeout(3000);
    } catch (e) {
      appErrors.exceptions.push(`Fatal Load Error: ${e.message}`);
      appErrors.status = null;
    }

    report.push(appErrors);
    await context.close();
  }

  await browser.close();
  fs.writeFileSync('audit-report.json', JSON.stringify(report, null, 2));
  console.log('Audit completed. Report saved to audit-report.json');
})();
