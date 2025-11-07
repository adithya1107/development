import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProctoredExam } from '@/components/student/ProctoringSuite';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function StudentProctoredExam() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExamData();
  }, [examId]);

  const loadExamData = async () => {
    try {
      setLoading(true);
      
      // Fetch exam details
      const { data: examData, error: examError } = await supabase
        .from('examinations')
        .select('*, proctoring_settings(*)')
        .eq('id', examId)
        .single();

      if (examError) throw examError;

      if (!examData.proctoring_enabled) {
        setError('This exam does not have proctoring enabled.');
        return;
      }

      setExam(examData);
    } catch (err: any) {
      setError(err.message || 'Failed to load exam data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Unable to Load Exam</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={() => navigate('/student')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProctoredExam
        examId={examId!}
        examTitle={exam?.title}
        examDuration={exam?.duration_minutes}
        proctoringSettings={exam?.proctoring_settings}
        onComplete={() => navigate('/student')}
        onError={(error) => {
          console.error('Proctoring error:', error);
          setError(error);
        }}
      />
    </div>
  );
}
