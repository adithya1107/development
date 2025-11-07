import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SessionReview } from '@/components/teacher/ProctoringReview';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TeacherProctoringSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/teacher/proctoring')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Monitoring
        </Button>
      </div>

      <SessionReview sessionId={sessionId!} />
    </div>
  );
}
