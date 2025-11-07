import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DetectionRequest {
  sessionId: string
  imageData: string // base64 encoded image
  detectionType: 'face' | 'object' | 'gaze' | 'audio'
  timestamp: number
  metadata?: any
}

interface DetectionResult {
  detected: boolean
  confidence: number
  violationType?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  description: string
  evidence?: any
}

// Mock AI detection functions
// In production, these would call actual AI services

async function detectFaces(imageData: string): Promise<DetectionResult> {
  // TODO: Integrate with TensorFlow.js, AWS Rekognition, or Azure Face API
  // For now, return mock result
  
  // Simulate face detection
  const mockResult = {
    faceCount: Math.random() > 0.9 ? 2 : Math.random() > 0.95 ? 0 : 1,
    confidence: 0.85 + Math.random() * 0.15
  }

  if (mockResult.faceCount > 1) {
    return {
      detected: true,
      confidence: mockResult.confidence,
      violationType: 'multiple_faces',
      severity: 'high',
      description: `Detected ${mockResult.faceCount} faces in frame`,
      evidence: { faceCount: mockResult.faceCount }
    }
  } else if (mockResult.faceCount === 0) {
    return {
      detected: true,
      confidence: mockResult.confidence,
      violationType: 'no_face_detected',
      severity: 'medium',
      description: 'No face detected in frame',
      evidence: { faceCount: 0 }
    }
  }

  return {
    detected: false,
    confidence: mockResult.confidence,
    description: 'Normal - single face detected'
  }
}

async function detectObjects(imageData: string): Promise<DetectionResult> {
  // TODO: Integrate with COCO-SSD, AWS Rekognition, or Google Vision
  
  const prohibitedObjects = ['cell phone', 'book', 'laptop']
  const mockDetection = Math.random() > 0.9

  if (mockDetection) {
    const detectedObject = prohibitedObjects[Math.floor(Math.random() * prohibitedObjects.length)]
    return {
      detected: true,
      confidence: 0.75 + Math.random() * 0.2,
      violationType: 'prohibited_object',
      severity: 'high',
      description: `Detected prohibited object: ${detectedObject}`,
      evidence: { object: detectedObject }
    }
  }

  return {
    detected: false,
    confidence: 0.9,
    description: 'No prohibited objects detected'
  }
}

async function detectGaze(imageData: string): Promise<DetectionResult> {
  // TODO: Integrate with MediaPipe or WebGazer
  
  const mockLookingAway = Math.random() > 0.85

  if (mockLookingAway) {
    return {
      detected: true,
      confidence: 0.7 + Math.random() * 0.2,
      violationType: 'looking_away',
      severity: 'low',
      description: 'Student appears to be looking away from screen',
      evidence: { gazeDirection: 'away' }
    }
  }

  return {
    detected: false,
    confidence: 0.85,
    description: 'Student focused on screen'
  }
}

async function analyzeAudio(audioData: string): Promise<DetectionResult> {
  // TODO: Integrate with Web Speech API, AWS Transcribe, or Google Speech-to-Text
  
  const mockConversation = Math.random() > 0.92

  if (mockConversation) {
    return {
      detected: true,
      confidence: 0.8,
      violationType: 'suspicious_audio',
      severity: 'medium',
      description: 'Detected conversation or multiple voices',
      evidence: { audioLevel: 'high', voiceCount: 2 }
    }
  }

  return {
    detected: false,
    confidence: 0.85,
    description: 'Normal audio levels'
  }
}

serve(async (req) => {
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

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      throw new Error('Unauthorized')
    }

    const requestData: DetectionRequest = await req.json()
    const { sessionId, imageData, detectionType, timestamp, metadata } = requestData

    // Verify session
    const { data: session } = await supabaseClient
      .from('proctoring_sessions')
      .select('*, proctoring_settings(*)')
      .eq('id', sessionId)
      .single()

    if (!session) {
      throw new Error('Session not found')
    }

    // Run appropriate detection
    let result: DetectionResult
    
    switch (detectionType) {
      case 'face':
        result = await detectFaces(imageData)
        break
      case 'object':
        result = await detectObjects(imageData)
        break
      case 'gaze':
        result = await detectGaze(imageData)
        break
      case 'audio':
        result = await analyzeAudio(imageData)
        break
      default:
        throw new Error('Invalid detection type')
    }

    // If violation detected, create violation record
    if (result.detected && result.violationType) {
      // Upload evidence image
      let evidenceUrl = null
      if (imageData && detectionType !== 'audio') {
        const fileName = `${sessionId}/violations/${Date.now()}.jpg`
        const { data: uploadData } = await supabaseClient
          .storage
          .from('proctoring-snapshots')
          .upload(fileName, Buffer.from(imageData, 'base64'), {
            contentType: 'image/jpeg'
          })

        if (uploadData) {
          const { data: urlData } = supabaseClient
            .storage
            .from('proctoring-snapshots')
            .getPublicUrl(fileName)
          evidenceUrl = urlData.publicUrl
        }
      }

      // Create violation
      const { data: violation, error: violationError } = await supabaseClient
        .from('proctoring_violations')
        .insert({
          session_id: sessionId,
          violation_type: result.violationType,
          severity: result.severity,
          description: result.description,
          detected_at: new Date(timestamp).toISOString(),
          ai_confidence: result.confidence,
          evidence_url: evidenceUrl,
          evidence_data: result.evidence,
          reviewed: false
        })
        .select()
        .single()

      if (violationError) {
        console.error('Error creating violation:', violationError)
      }

      // Create alert for high/critical violations
      if (result.severity === 'high' || result.severity === 'critical') {
        await supabaseClient
          .from('proctoring_alerts')
          .insert({
            session_id: sessionId,
            alert_type: result.violationType,
            severity: result.severity,
            message: result.description,
            status: 'pending',
            created_at: new Date().toISOString()
          })
      }

      // Check if auto-termination is enabled for critical violations
      if (result.severity === 'critical' && session.proctoring_settings?.auto_terminate_on_critical) {
        await supabaseClient
          .from('proctoring_sessions')
          .update({ 
            status: 'terminated',
            ended_at: new Date().toISOString(),
            proctoring_notes: 'Session automatically terminated due to critical violation'
          })
          .eq('id', sessionId)

        // Send intervention to student
        await supabaseClient
          .from('proctoring_interventions')
          .insert({
            session_id: sessionId,
            intervention_type: 'terminate',
            message: 'Your exam has been terminated due to a critical violation.',
            sent_at: new Date().toISOString()
          })
      }
    }

    // Record event
    await supabaseClient
      .from('proctoring_events')
      .insert({
        session_id: sessionId,
        event_type: detectionType,
        detected_at: new Date(timestamp).toISOString(),
        description: result.description,
        ai_confidence: result.confidence,
        flagged: result.detected,
        metadata: { ...metadata, ...result.evidence }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        result,
        timestamp 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error detecting violations:', error)
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/detect-violations' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"sessionId":"123","imageData":"base64data","detectionType":"face","timestamp":1234567890}'

*/
