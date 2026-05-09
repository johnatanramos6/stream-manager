const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ ignoreHTTPSErrors: true });
  const page = await browser.newPage();
  
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('console', msg => { 
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); 
  });
  
  try {
    await page.goto('https://127.0.0.1:8080/stream-manager/', { waitUntil: 'networkidle0' });
    const elements = await page.$$('.stat-gradient-danger');
    if (elements.length > 0) {
      console.log('Clicking the element...');
      await elements[0].click();
      await new Promise(r => setTimeout(r, 2000));
    } else {
      console.log('Element not found!');
    }
  } catch (err) {
    console.error('Fatal error:', err);
  }
  
  await browser.close();
})();
