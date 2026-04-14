async function testTwilioValidation() {
  const TWILIO_AUTH_TOKEN = "test_token";
  const url = "https://example.com/webhook";
  const bodyText = "Body=Hello&From=whatsapp%3A%2B123456789";
  
  // Logic from index.ts
  const params = new URLSearchParams(bodyText);
  const data = Array.from(params.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .reduce((acc, [key, val]) => acc + key + val, url);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(TWILIO_AUTH_TOKEN),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const hmac = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const digest = btoa(String.fromCharCode(...new Uint8Array(hmac)));

  console.log("Expected Data String:", data);
  console.log("Generated Signature:", digest);
}

testTwilioValidation();
