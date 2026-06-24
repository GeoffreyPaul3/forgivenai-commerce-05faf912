const url = "https://wzncegnkhybtmybqftbv.supabase.co/functions/v1/create-payment";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // The anon key is usually enough for Edge functions unless it enforces service role

fetch(url, {
  method: "POST",
  headers: {
    "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bmNlZ25raHlidG15YnFmdGJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDkzNzcsImV4cCI6MjA5MTcyNTM3N30.tiOdT6E7dYNvx0Tln0N-S_4Yhc6NQKbjPutQCa2tBbQ`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    action: "create_payment",
    amount: 63540,
    currency: "MWK",
    email: "gtyga265@gmail.com",
    first_name: "Geoffrey",
    title: "Forgiven: 3-Piece Handbag Set"
  })
})
.then(res => res.text().then(text => ({status: res.status, text})))
.then(data => console.log(data))
.catch(err => console.error(err));
