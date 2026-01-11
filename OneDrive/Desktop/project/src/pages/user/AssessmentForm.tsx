import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Save, ArrowLeft, ArrowRight, HelpCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import AssessmentGuide from '../../components/assessments/AssessmentGuide';
import QuestionCard from '../../components/assessments/QuestionCard';
import ProgressBar from '../../components/assessments/ProgressBar';
import { useAuthStore } from '../../stores/authStore';

const AssessmentForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [showGuide, setShowGuide] = useState(true);
  
  // ... (existing state and handlers)

  // Calculate progress
  const calculateSectionProgress = (sectionId: string) => {
    const sectionQuestions = currentSection.questions;
    const answeredQuestions = sectionQuestions.filter(q => {
      const response = responses[q.id];
      return response?.rating || response?.textResponse || response?.selectedOptionId;
    });
    return (answeredQuestions.length / sectionQuestions.length) * 100;
  };

  const calculateOverallProgress = () => {
    const totalQuestions = assessment.sections.reduce((acc, section) => 
      acc + section.questions.length, 0
    );
    const answeredQuestions = Object.values(responses).filter(r => 
      r.rating || r.textResponse || r.selectedOptionId
    ).length;
    return (answeredQuestions / totalQuestions) * 100;
  };

  const handleResponseChange = (questionId: string, type: 'main' | 'comment', value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [type === 'main' ? getResponseKey(questionId) : 'comment']: value
      }
    }));
  };

  const getResponseKey = (questionId: string) => {
    const question = currentSection.questions.find(q => q.id === questionId);
    switch (question?.questionType) {
      case 'rating':
        return 'rating';
      case 'multiple_choice':
        return 'selectedOptionId';
      case 'yes_no':
      case 'text':
        return 'textResponse';
      default:
        return '';
    }
  };

  const isQuestionValid = (questionId: string) => {
    const question = currentSection.questions.find(q => q.id === questionId);
    if (!question?.isRequired) return true;

    const response = responses[questionId];
    return Boolean(response?.rating || response?.textResponse || response?.selectedOptionId);
  };
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="mr-2"
            onClick={() => navigate('/my-assessments')}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{assessment.title}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowGuide(!showGuide)}
            leftIcon={<HelpCircle className="h-4 w-4" />}
          >
            {showGuide ? 'Hide Guide' : 'Show Guide'}
          </Button>
          <Button
            onClick={handleSaveProgress}
            variant="outline"
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Progress
          </Button>
        </div>
      </div>
      
      {/* Instructions Guide */}
      {showGuide && (
        <AssessmentGuide role={user?.role === 'employee' ? 'employee' : 'reviewer'} />
      )}
      
      {/* Progress Tracking */}
      <ProgressBar
        currentSection={currentSectionIndex + 1}
        totalSections={assessment.sections.length}
        sectionProgress={calculateSectionProgress(currentSection.id)}
        overallProgress={calculateOverallProgress()}
      />
      
      {/* Current Section */}
      <Card>
        <CardHeader className="bg-primary-50 border-b border-primary-100">
          <CardTitle className="text-xl text-primary-800">{currentSection.title}</CardTitle>
          <p className="text-sm text-gray-600 mt-1">{currentSection.description}</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-8">
            {currentSection.questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                response={responses[question.id] || {}}
                onResponseChange={(type, value) => handleResponseChange(question.id, type, value)}
                index={index}
                isValid={isQuestionValid(question.id)}
              />
            ))}
          </div>
        </CardContent>
        <CardFooter className="bg-gray-50 border-t border-gray-200 flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentSectionIndex === 0}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Previous
          </Button>
          
          <div className="flex space-x-2">
            {currentSectionIndex === assessment.sections.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={!isSectionComplete() || isSubmitting}
                isLoading={isSubmitting}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                Submit Assessment
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!isSectionComplete()}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Next Section
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AssessmentForm;