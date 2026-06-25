import { chromium } from 'playwright';

(async () => {
  console.log("Starting browser...");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));

  console.log("Navigating to http://localhost:8080/create-payment?tx_ref=FG178241168857118598...");
  await page.goto('http://localhost:8080/create-payment?tx_ref=FG178241168857118598', { waitUntil: 'networkidle' });
  
  const content = await page.content();
  console.log("Page Content Length:", content.length);
  if (content.length < 1000) {
    console.log("Content:", content);
  }
  
  await browser.close();
  process.exit(0);
})();
