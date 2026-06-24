const fetch = require('node-fetch');

async function test() {
  const apiKey = "D548C2E5E10EDCFE5CC1C2CF450FCA99";
  const apiSecret = "8D40D8C8FE42EBD17578CA0349635AE9";
  const orgId = "e5095d9a-ec27-4a0b-96d5-a35a6ed68779";
  const merchAcc = 78773186;

  // 1. Get Token
  let res = await fetch("https://api.onekhusa.com/sandbox/v1/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      apiSecret,
      organisationId: orgId,
      merchantAccountNumber: merchAcc
    })
  });
  let tokenData = await res.json();
  console.log("Token Data:", tokenData);

  if (!tokenData.accessToken) return;

  // 2. Checkout
  res = await fetch("https://api.onekhusa.com/sandbox/v1/checkout/rtp/initiate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${tokenData.accessToken}`,
      "X-Idempotency-Key": "test-" + Date.now()
    },
    body: JSON.stringify({
      merchantAccountNumber: merchAcc,
      transactionAmount: 100,
      transactionDescription: "test",
      referenceNumber: "ref-" + Date.now(),
      capturedBy: "geofreypaul40@gmail.com",
      successUrl: "https://example.com",
      failureUrl: "https://example.com",
      callbackUrl: "https://example.com"
    })
  });
  let checkoutData = await res.json();
  console.log("Checkout Data:", checkoutData);
}

test();
