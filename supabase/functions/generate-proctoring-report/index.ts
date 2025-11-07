import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReportRequest {
  sessionId: string
  format: 'json' | 'pdf' | 'html'
  includeTimeline?: boolean
  includeEvidence?: boolean
  includeRecording?: boolean
}

interface ReportData {
  session: any
  events: any[]
  violations: any[]
  alerts: any[]
  interventions: any[]
  statistics: {
    totalEvents: number
    flaggedEvents: number
    totalViolations: number
    violationsBySeverity: Record<string, number>
    violationsByType: Record<string, number>
    sessionDuration: number
    averageConfidence: number
  }
}

async function generateReport(sessionId: string, supabaseClient: any): Promise<ReportData> {
  // Fetch session data
  const { data: session } = await supabaseClient
    .from('proctoring_sessions')
    .select(`
      *,
      student:user_profiles!proctoring_sessions_student_id_fkey(*),
      exam:examinations(*),
      quiz:quizzes(*),
      proctoring_settings(*)
    `)
    .eq('id', sessionId)
    .single()

  // Fetch events
  const { data: events } = await supabaseClient
    .from('proctoring_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('detected_at', { ascending: true })

  // Fetch violations
  const { data: violations } = await supabaseClient
    .from('proctoring_violations')
    .select('*')
    .eq('session_id', sessionId)
    .order('detected_at', { ascending: true })

  // Fetch alerts
  const { data: alerts } = await supabaseClient
    .from('proctoring_alerts')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  // Fetch interventions
  const { data: interventions } = await supabaseClient
    .from('proctoring_interventions')
    .select('*')
    .eq('session_id', sessionId)
    .order('sent_at', { ascending: true })

  // Calculate statistics
  const violationsBySeverity = violations.reduce((acc: any, v: any) => {
    acc[v.severity] = (acc[v.severity] || 0) + 1
    return acc
  }, {})

  const violationsByType = violations.reduce((acc: any, v: any) => {
    acc[v.violation_type] = (acc[v.violation_type] || 0) + 1
    return acc
  }, {})

  const sessionStart = new Date(session.started_at).getTime()
  const sessionEnd = session.ended_at ? new Date(session.ended_at).getTime() : Date.now()
  const sessionDuration = Math.floor((sessionEnd - sessionStart) / 1000) // seconds

  const averageConfidence = events
    .filter((e: any) => e.ai_confidence)
    .reduce((sum: number, e: any) => sum + e.ai_confidence, 0) / 
    (events.filter((e: any) => e.ai_confidence).length || 1)

  const statistics = {
    totalEvents: events.length,
    flaggedEvents: events.filter((e: any) => e.flagged).length,
    totalViolations: violations.length,
    violationsBySeverity,
    violationsByType,
    sessionDuration,
    averageConfidence
  }

  return {
    session,
    events: events || [],
    violations: violations || [],
    alerts: alerts || [],
    interventions: interventions || [],
    statistics
  }
}

function generateHTMLReport(reportData: ReportData): string {
  const { session, events, violations, statistics } = reportData

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Proctoring Report - ${session.student?.full_name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; }
    .header { background: #f4f4f4; padding: 20px; margin-bottom: 30px; }
    .stat { display: inline-block; margin: 10px 20px 10px 0; }
    .stat-label { font-weight: bold; color: #666; }
    .stat-value { font-size: 24px; color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #f4f4f4; font-weight: bold; }
    .severity-low { color: #3b82f6; }
    .severity-medium { color: #eab308; }
    .severity-high { color: #f97316; }
    .severity-critical { color: #ef4444; font-weight: bold; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Proctoring Session Report</h1>
  
  <div class="header">
    <p><strong>Student:</strong> ${session.student?.full_name} (${session.student?.email})</p>
    <p><strong>Exam:</strong> ${session.exam?.title || session.quiz?.title || 'Unknown'}</p>
    <p><strong>Session ID:</strong> ${session.id}</p>
    <p><strong>Start Time:</strong> ${new Date(session.started_at).toLocaleString()}</p>
    <p><strong>End Time:</strong> ${session.ended_at ? new Date(session.ended_at).toLocaleString() : 'In Progress'}</p>
    <p><strong>Duration:</strong> ${Math.floor(statistics.sessionDuration / 60)} minutes ${statistics.sessionDuration % 60} seconds</p>
    <p><strong>Status:</strong> ${session.status.toUpperCase()}</p>
  </div>

  <h2>Session Statistics</h2>
  <div>
    <div class="stat">
      <div class="stat-label">Total Events</div>
      <div class="stat-value">${statistics.totalEvents}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Flagged Events</div>
      <div class="stat-value">${statistics.flaggedEvents}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Violations</div>
      <div class="stat-value">${statistics.totalViolations}</div>
    </div>
    <div class="stat">
      <div class="stat-label">AI Confidence</div>
      <div class="stat-value">${(statistics.averageConfidence * 100).toFixed(1)}%</div>
    </div>
  </div>

  <h2>Violations by Severity</h2>
  <table>
    <tr>
      <th>Severity</th>
      <th>Count</th>
    </tr>
    ${Object.entries(statistics.violationsBySeverity).map(([severity, count]) => `
      <tr>
        <td class="severity-${severity}">${severity.toUpperCase()}</td>
        <td>${count}</td>
      </tr>
    `).join('')}
  </table>

  <h2>Violations by Type</h2>
  <table>
    <tr>
      <th>Type</th>
      <th>Count</th>
    </tr>
    ${Object.entries(statistics.violationsByType).map(([type, count]) => `
      <tr>
        <td>${type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</td>
        <td>${count}</td>
      </tr>
    `).join('')}
  </table>

  ${violations.length > 0 ? `
    <h2>Detailed Violations</h2>
    <table>
      <tr>
        <th>Time</th>
        <th>Type</th>
        <th>Severity</th>
        <th>Description</th>
        <th>Confidence</th>
        <th>Reviewed</th>
      </tr>
      ${violations.map((v: any) => `
        <tr>
          <td>${new Date(v.detected_at).toLocaleTimeString()}</td>
          <td>${v.violation_type}</td>
          <td class="severity-${v.severity}">${v.severity.toUpperCase()}</td>
          <td>${v.description}</td>
          <td>${(v.ai_confidence * 100).toFixed(1)}%</td>
          <td>${v.reviewed ? '✓' : '✗'}</td>
        </tr>
      `).join('')}
    </table>
  ` : '<p>No violations detected during this session.</p>'}

  <div class="footer">
    <p>Report generated on ${new Date().toLocaleString()}</p>
    <p>This report was automatically generated by the AI Proctoring System.</p>
  </div>
</body>
</html>
  `
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

    const requestData: ReportRequest = await req.json()
    const { sessionId, format = 'json' } = requestData

    // Verify user has permission to access this report
    // (teacher/admin for any session, student for their own)
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    const { data: session } = await supabaseClient
      .from('proctoring_sessions')
      .select('student_id')
      .eq('id', sessionId)
      .single()

    if (!session) {
      throw new Error('Session not found')
    }

    // Check permissions
    const isStudent = profile.user_type === 'student' && session.student_id === user.id
    const isTeacherOrAdmin = ['faculty', 'admin'].includes(profile.user_type)

    if (!isStudent && !isTeacherOrAdmin) {
      throw new Error('Insufficient permissions')
    }

    // Generate report
    const reportData = await generateReport(sessionId, supabaseClient)

    // Return in requested format
    if (format === 'html') {
      const htmlReport = generateHTMLReport(reportData)
      return new Response(htmlReport, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="proctoring-report-${sessionId}.html"`
        },
        status: 200,
      })
    } else if (format === 'pdf') {
      // TODO: Convert HTML to PDF using a library like puppeteer or similar
      // For now, return HTML
      const htmlReport = generateHTMLReport(reportData)
      return new Response(
        JSON.stringify({ 
          error: 'PDF generation not yet implemented',
          htmlReport 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 501,
        }
      )
    } else {
      // Return JSON
      return new Response(
        JSON.stringify({ 
          success: true,
          report: reportData 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }
  } catch (error) {
    console.error('Error generating report:', error)
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate-proctoring-report' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"sessionId":"123","format":"json"}'

*/
