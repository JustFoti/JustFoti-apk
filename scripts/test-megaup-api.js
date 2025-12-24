#!/usr/bin/env node
/**
 * Test if enc-dec.app has a MegaUp decoder
 */

const embedUrl = 'https://megaup22.online/e/jIrrLzj-WS2JcOLzF79O5xvpCQ';
const pageData = '3wMOLPOCFprWglc038GT4eurZl2CnZqMNWZGsFh3nC2jPP3h3zMgHl9PKMuUor__SJIP94g4uw4';

async function testEncDecApp() {
  // Try dec-mega endpoint
  console.log('=== Testing dec-mega endpoint ===');
  try {
    const response = await fetch('https://enc-dec.app/api/dec-mega', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: pageData }),
    });
    const result = await response.text();
    console.log('dec-mega result:', result);
  } catch (e) {
    console.log('dec-mega error:', e.message);
  }
  
  // Try with the embed URL
  console.log('\n=== Testing with embed URL ===');
  try {
    const response = await fetch('https://enc-dec.app/api/dec-mega', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: embedUrl }),
    });
    const result = await response.text();
    console.log('dec-mega (url) result:', result);
  } catch (e) {
    console.log('dec-mega (url) error:', e.message);
  }
  
  // Try megaup endpoint
  console.log('\n=== Testing megaup endpoint ===');
  try {
    const response = await fetch('https://enc-dec.app/api/megaup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: embedUrl }),
    });
    const result = await response.text();
    console.log('megaup result:', result);
  } catch (e) {
    console.log('megaup error:', e.message);
  }
  
  // List available endpoints
  console.log('\n=== Checking available endpoints ===');
  try {
    const response = await fetch('https://enc-dec.app/api');
    const result = await response.text();
    console.log('API root:', result.substring(0, 500));
  } catch (e) {
    console.log('API root error:', e.message);
  }
}

testEncDecApp().catch(console.error);
