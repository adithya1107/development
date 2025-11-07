// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessStreamRequest {
  sessionId: string
  videoChunk?: string // base64 encoded video chunk
  audioChunk?: string // base64 encoded audio chunk
  snapshot?: string // base64 encoded image
  timestamp: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authorization token
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      throw new Error('Unauthorized')
    }

    const requestData: ProcessStreamRequest = await req.json()
    const { sessionId, videoChunk, audioChunk, snapshot, timestamp } = requestData

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabaseClient
      .from('proctoring_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('student_id', user.id)
      .single()

    if (sessionError || !session) {
      throw new Error('Session not found or unauthorized')
    }

    // Process snapshot if provided
    if (snapshot) {
      // Upload snapshot to storage
      const fileName = `${sessionId}/${timestamp}.jpg`
      const { data: uploadData, error: uploadError } = await supabaseClient
        .storage
        .from('proctoring-snapshots')
        .upload(fileName, Buffer.from(snapshot, 'base64'), {
          contentType: 'image/jpeg',
          upsert: false
        })

      if (uploadError) {
        console.error('Error uploading snapshot:', uploadError)
      } else {
        // Get public URL
        const { data: urlData } = supabaseClient
          .storage
          .from('proctoring-snapshots')
          .getPublicUrl(fileName)

        // Record event with snapshot URL
        await supabaseClient
          .from('proctoring_events')
          .insert({
            session_id: sessionId,
            event_type: 'snapshot_captured',
            detected_at: new Date(timestamp).toISOString(),
            snapshot_url: urlData.publicUrl,
            metadata: { timestamp }
          })
      }
    }

    // Process video chunk if provided
    if (videoChunk) {
      // In production, you might:
      // 1. Stream video to storage in chunks
      // 2. Send frames to AI detection service
      // 3. Aggregate chunks into final recording
      
      console.log('Processing video chunk for session:', sessionId)
      
      // Example: Send to AI detection service (placeholder)
      // const aiResponse = await fetch('https://ai-detection-service.com/analyze', {
      //   method: 'POST',
      //   body: JSON.stringify({ sessionId, videoChunk, timestamp })
      // })
    }

    // Process audio chunk if provided
    if (audioChunk) {
      // In production, you might:
      // 1. Stream audio to storage
      // 2. Send to speech-to-text service
      // 3. Analyze for conversations
      
      console.log('Processing audio chunk for session:', sessionId)
      
      // Example: Send to speech detection (placeholder)
      // const audioAnalysis = await analyzeAudio(audioChunk)
    }

    // Update session last activity
    await supabaseClient
      .from('proctoring_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', sessionId)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Stream processed successfully',
        timestamp 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error processing proctoring stream:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/process-proctoring-stream' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"sessionId":"123","snapshot":"base64data","timestamp":1234567890}'

*/
