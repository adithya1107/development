
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Calendar, 
  MessageSquare, 
  GraduationCap,
  Users,
  FileText,
  HelpCircle,
  BarChart3,
  Clock,
  CalendarDays,
  TrendingUp,
  Archive,
  Award
} from 'lucide-react';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import TeacherSchedule from '@/components/teacher/TeacherSchedule';
import TeacherCalendarAttendance from '@/components/teacher/TeacherCalendarAttendance';
import TeacherCourses from '@/components/teacher/TeacherCourses';
import TeacherGradebook from '@/components/teacher/TeacherGradebook';
import TeacherEvents from '@/components/teacher/TeacherEvents';
import TeacherPerformance from '@/components/teacher/TeacherPerformance';
import TeacherCommunication from '@/components/teacher/TeacherCommunication';
import TeacherParentInteraction from '@/components/teacher/TeacherParentInteraction';
import TeacherDocuments from '@/components/teacher/TeacherDocuments';
import TeacherRecognition from '@/components/teacher/TeacherRecognition';
import TeacherSupport from '@/components/teacher/TeacherSupport';

const Teacher = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [teacherData, setTeacherData] = useState<any>(null);

  useEffect(() => {
    // Get teacher data from localStorage (set during login)
    const userData = localStorage.getItem('colcord_user');
    if (userData) {
      setTeacherData(JSON.parse(userData));
    }
  }, []);

  if (!teacherData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600">Please log in to access the teacher portal.</p>
        </div>
      </div>
    );
  }

  const tabItems = [
    { value: 'dashboard', label: 'Dashboard', icon: GraduationCap },
    { value: 'schedule', label: 'Schedule & Timetable', icon: Clock },
    { value: 'attendance', label: 'Attendance Management', icon: Calendar },
    { value: 'courses', label: 'Course & Content', icon: BookOpen },
    { value: 'gradebook', label: 'Assignments & Evaluation', icon: BarChart3 },
    { value: 'events', label: 'Events & Calendar', icon: CalendarDays },
    { value: 'performance', label: 'Student Performance', icon: TrendingUp },
    { value: 'communication', label: 'Communication', icon: MessageSquare },
    { value: 'parents', label: 'Parent Interaction', icon: Users },
    { value: 'documents', label: 'Document Management', icon: Archive },
    { value: 'recognition', label: 'Recognition & Feedback', icon: Award },
    { value: 'support', label: 'Support & Helpdesk', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-blue-600">ColCord</h1>
              <span className="text-gray-400">|</span>
              <span className="text-lg font-medium text-gray-700">Teacher Portal</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {teacherData.first_name} {teacherData.last_name}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  localStorage.removeItem('colcord_user');
                  window.location.href = '/';
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12 gap-1 h-auto p-1">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex flex-col items-center justify-center p-2 text-xs font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                >
                  <Icon className="h-4 w-4 mb-1" />
                  <span className="hidden lg:block text-[10px]">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="dashboard" className="space-y-6">
            <TeacherDashboard teacherData={teacherData} />
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <TeacherSchedule teacherData={teacherData} />
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6">
            <TeacherCalendarAttendance teacherData={teacherData} />
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <TeacherCourses teacherData={teacherData} />
          </TabsContent>

          <TabsContent value="gradebook" className="space-y-6">
            <TeacherGradebook teacherData={teacherData} />
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <TeacherEvents teacherData={teacherData} />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <TeacherPerformance teacherData={teacherData} />
          </TabsContent>

          <TabsContent value="communication" className="space-y-6">
            <TeacherCommunication teacherData={teacherData} />
          </TabsContent>

          <TabsContent value="parents" className="space-y-6">
            <TeacherParentInteraction teacherData={teacherData} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <TeacherDocuments teacherData={teacherData} />
          </TabsContent>

          <TabsContent value="recognition" className="space-y-6">
            <TeacherRecognition teacherData={teacherData} />
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <TeacherSupport teacherData={teacherData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Teacher;
