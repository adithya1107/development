import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LiveMonitoringDashboard } from '@/components/teacher/ProctoringReview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Video, List } from 'lucide-react';

export default function TeacherProctoringMonitor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedExam, setSelectedExam] = useState<string>(searchParams.get('examId') || '');

  // TODO: Fetch list of active exams with proctoring enabled
  const activeExams = [
    { id: '1', title: 'Midterm Exam - Computer Science' },
    { id: '2', title: 'Final Exam - Mathematics' },
    { id: '3', title: 'Quiz 3 - Physics' },
  ];

  const handleExamChange = (examId: string) => {
    setSelectedExam(examId);
    setSearchParams({ examId });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Live Proctoring Monitor</h1>
        <p className="text-muted-foreground">
          Monitor students taking proctored exams in real-time
        </p>
      </div>

      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Select Exam
            </CardTitle>
            <CardDescription>
              Choose an exam to monitor active proctoring sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select value={selectedExam} onValueChange={handleExamChange}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select an exam to monitor..." />
                </SelectTrigger>
                <SelectContent>
                  {activeExams.map(exam => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => navigate('/teacher/proctoring/sessions')}
              >
                <List className="h-4 w-4 mr-2" />
                View All Sessions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedExam ? (
        <LiveMonitoringDashboard examId={selectedExam} />
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select an exam to start monitoring proctoring sessions</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
