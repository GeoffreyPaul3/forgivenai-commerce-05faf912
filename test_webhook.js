const url = "https://wzncegnkhybtmybqftbv.supabase.co/functions/v1/whatsapp-webhook";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const body = new URLSearchParams({
  From: "whatsapp:+265992132195",
  Body: "Yes"
}).toString();

fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: body
})
.then(res => res.text().then(text => ({status: res.status, text})))
.then(data => console.log(data))
.catch(err => console.error(err));
