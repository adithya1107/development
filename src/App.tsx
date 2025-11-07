import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavigationWrapper from "./components/NavigationWrapper";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Student from "./pages/Student";
import Teacher from "./pages/Teacher";
import NotFound from "./pages/NotFound";
import Parent from "./pages/Parent";
import Alumni from "./pages/Alumni";
import FirstLogin from "./pages/FirstLogin";
import StudentProctoredExam from "./pages/StudentProctoredExam";
import TeacherProctoringMonitor from "./pages/TeacherProctoringMonitor";
import TeacherProctoringSession from "./pages/TeacherProctoringSession";
import AdminProctoringManagement from "./pages/AdminProctoringManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NavigationWrapper>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/first-login" element={<FirstLogin />} />
            
            {/* Student Routes */}
            <Route path="/student" element={<Student />} />
            <Route path="/student/exam/:examId/proctor" element={<StudentProctoredExam />} />
            
            {/* Teacher Routes */}
            <Route path="/teacher" element={<Teacher />} />
            <Route path="/teacher/proctoring" element={<TeacherProctoringMonitor />} />
            <Route path="/teacher/proctoring/session/:sessionId" element={<TeacherProctoringSession />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/proctoring" element={<AdminProctoringManagement />} />
            
            {/* Other Routes */}
            <Route path="/parent" element={<Parent />} />
            <Route path="/alumni" element={<Alumni />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </NavigationWrapper>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;