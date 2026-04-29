import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, status')
    .or('full_name.ilike.%Tuntufye%,full_name.ilike.%tiger%')
  
  if (error) {
    console.error(error)
    return
  }
  
  console.log(JSON.stringify(data, null, 2))
}

checkUsers()
