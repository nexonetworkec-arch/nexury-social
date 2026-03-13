// Supabase Edge Function: send-push
// Ubicación sugerida: /supabase/functions/send-push/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // El Webhook de Supabase envía los datos de la fila insertada en el body
    const { record } = await req.json()
    
    // 1. Obtener información de la notificación
    const userId = record.user_id
    const title = record.title || 'Nueva notificación'
    const body = record.content || 'Tienes una nueva actualización en Nexury'
    const url = record.link || '/'

    // 2. Buscar los tokens de dispositivos del usuario
    const { data: tokens, error: tokenError } = await supabaseClient
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)

    if (tokenError) throw tokenError
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No tokens found for user' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 3. Enviar a través de un proveedor (Ejemplo conceptual con OneSignal)
    // En una implementación real, aquí harías un fetch a la API de OneSignal o FCM
    console.log(`Enviando notificación a ${tokens.length} dispositivos del usuario ${userId}`)
    
    /* 
    Ejemplo de llamada API:
    await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Deno.env.get('ONESIGNAL_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: Deno.env.get('ONESIGNAL_APP_ID'),
        include_player_ids: tokens.map(t => t.token),
        contents: { en: body },
        headings: { en: title },
        url: url
      })
    })
    */

    return new Response(JSON.stringify({ success: true, sent_to: tokens.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
