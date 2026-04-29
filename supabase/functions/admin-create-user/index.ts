import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      email, 
      password, 
      full_name, 
      role,
      business_name,
      phone,
      address,
      category,
      payment_details
    } = await req.json()

    if (!email || !password || !role) {
      throw new Error('Missing required fields: email, password, role')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Verify caller is an admin using their Auth Header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Verify role in profiles table
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      throw new Error('Forbidden: Only admins can invoke this function.')
    }

    // 2. Create the user using admin auth API
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
         full_name,
         role,
         business_name,
         phone,
         address,
         category,
         payment_details: JSON.stringify(payment_details)
      }
    })

    if (createError) throw createError;

    // 3. The newly generated user triggers `handle_new_user` in PG, creating a 'pending' profile.
    // We immediately update it to 'approved', which triggers `handle_profile_approval` syncing to agents/vendors table.
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'approved', role })
      .eq('id', newAuthUser.user.id)

    if (updateError) throw updateError;

    // 4. Send Welcome Email via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: Deno.env.get('RESEND_FROM_EMAIL') || 'Forgiven Shopping Centre <onboarding@resend.dev>',
            to: [email],
            subject: 'Welcome to Forgiven Shopping Centre!',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 10px;">
                <h1 style="color: #f97316;">Welcome to the Platform!</h1>
                <p>Hello ${business_name || full_name || 'Partner'},</p>
                <p>Your vendor account has been successfully created. You can now access your dashboard to manage your products and orders.</p>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Your Login Credentials:</h3>
                  <p><strong>Email:</strong> ${email}</p>
                  <p><strong>Temporary Password:</strong> ${password}</p>
                </div>
                
                <p>Please log in here: <a href="${Deno.env.get('PUBLIC_URL') || 'https://forgiven.ai'}/dashboard">Vendor Dashboard</a></p>
                <p>For your security, we recommend changing your password after your first login.</p>
                
                <hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0;" />
                <p style="font-size: 12px; color: #6b7280;">Forgiven Shopping Centre — AI-Powered Commerce</p>
              </div>
            `,
          }),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          console.error('Resend error:', errorData);
        }
      } catch (emailErr) {
        console.error('Failed to send email:', emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, user: newAuthUser.user }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
