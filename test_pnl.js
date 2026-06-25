async function test() {
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const { token } = await loginRes.json();
  
  const pnlRes = await fetch('http://localhost:3001/api/reports/pnl', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const pnl = await pnlRes.json();
  console.log('PnL response:', JSON.stringify(pnl, null, 2));
}

test().catch(console.error);
