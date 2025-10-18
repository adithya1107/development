import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import QuizList from "./QuizList";
import QuizInterface from "./QuizInterface";
import QuizResults from "./QuizResults";

const QuizTaker = () => {
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  const handleQuizSubmit = () => {
    setSelectedQuiz(null);
  };

  if (selectedQuiz) {
    return (
      <QuizInterface
        quiz={selectedQuiz}
        onSubmit={handleQuizSubmit}
        onCancel={() => setSelectedQuiz(null)}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 px-3 sm:px-4 md:px-6 w-full max-w-full">
      <Card className="card-minimal w-full">
        <CardHeader className="p-4 sm:p-5 md:p-6">
          <CardTitle className="flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-3 text-primary">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <span className="text-base sm:text-lg md:text-xl font-semibold truncate">
                Available Quizzes
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 md:p-6">
          <QuizList onStartQuiz={setSelectedQuiz} />
        </CardContent>
      </Card>

      <QuizResults />
    </div>
  );
};

export default QuizTaker;