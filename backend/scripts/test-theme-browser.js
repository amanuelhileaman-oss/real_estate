const puppeteer = require('puppeteer-core');

async function testPropertyDetail() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1280, height: 900 }
  });

  try {
    const page = await browser.newPage();
    console.log('Navigating to catalog...');
    await page.goto('http://localhost:5173/properties', { waitUntil: 'networkidle0' });

    // Click on the first property title link
    const firstPropertyLink = await page.$('.property-card-glow a[href*="/properties/"]');
    if (firstPropertyLink) {
      const href = await page.evaluate(el => el.getAttribute('href'), firstPropertyLink);
      console.log('Found property detail link:', href);
      await page.goto('http://localhost:5173' + href, { waitUntil: 'networkidle0' });
    }

    // Set dark theme
    await page.select('select[aria-label="Theme Mode Selection"]', 'dark');
    await new Promise(r => setTimeout(r, 600));

    await page.screenshot({
      path: '/home/amanuel/.gemini/antigravity-ide/brain/2871afe9-6d9a-4af6-9c3d-39752a4442fd/property_detail_dark.png',
      fullPage: false
    });
    console.log('Saved property_detail_dark.png');

  } finally {
    await browser.close();
  }
}

testPropertyDetail().catch(console.error);
