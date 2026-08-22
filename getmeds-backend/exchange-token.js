require('dotenv').config();

const code = process.argv[2];
const clientId = process.argv[3] || process.env.ZOHO_CLIENT_ID;
const clientSecret = process.argv[4] || process.env.ZOHO_CLIENT_SECRET;
const domain = process.argv[5] || process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com';

if (!code) {
  console.error('Usage: node exchange-token.js <CODE> [CLIENT_ID] [CLIENT_SECRET] [ACCOUNTS_DOMAIN]');
  process.exit(1);
}

async function exchange() {
  const params = new URLSearchParams({
    code: code.trim(),
    client_id: clientId.trim(),
    client_secret: clientSecret.trim(),
    grant_type: 'authorization_code'
  });

  console.log(`Exchanging code with ${domain}/oauth/v2/token ...`);
  const res = await fetch(`${domain}/oauth/v2/token`, {
    method: 'POST',
    body: params
  });

  const data = await res.json();
  console.log('Result:', JSON.stringify(data, null, 2));

  if (data.refresh_token) {
    console.log('\n SUCCESS! Refresh Token generated.');
  }
}

exchange().catch(console.error);
