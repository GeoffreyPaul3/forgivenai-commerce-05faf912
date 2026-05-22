const url = "https://wzncegnkhybtmybqftbv.supabase.co/rest/v1/customers?select=*,first_agent:agents(name)&order=created_at.desc";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bmNlZ25raHlidG15YnFmdGJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDkzNzcsImV4cCI6MjA5MTcyNTM3N30.tiOdT6E7dYNvx0Tln0N-S_4Yhc6NQKbjPutQCa2tBbQ";

fetch(url, {
  headers: {
    "apikey": anonKey,
    "Authorization": `Bearer ${anonKey}`,
  }
}).then(res => res.json()).then(data => console.log(JSON.stringify(data, null, 2))).catch(err => console.error(err));
