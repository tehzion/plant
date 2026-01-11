import React from 'react';
import { AlertCircle } from 'lucide-react';
import RatingSelector from './RatingSelector';
import TextResponse from './TextResponse';
import { AssessmentQuestion } from '../../types';

interface QuestionCardProps {
  question: AssessmentQuestion;
  response: {
    rating?: number;
    textResponse?: string;
    selectedOptionId?: string;
    comment?: string;
  };
  onResponseChange: (type: 'main' | 'comment', value: any) => void;
  index: number;
  isValid: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  response,
  onResponseChange,
  index,
  isValid
}) => {
  return (
    <div className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
      <div className="flex items-start space-x-3 mb-4">
        <div className="bg-primary-100 text-primary-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
          {index + 1}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h3 className="text-base font-medium text-gray-900">{question.text}</h3>
            {question.isRequired && (
              <span className="text-xs text-error-600">*Required</span>
            )}
          </div>
          {!isValid && (
            <div className="mt-2 text-sm text-error-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              This question requires a response
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        {question.questionType === 'rating' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating (1-{question.scaleMax || 5}):
            </label>
            <RatingSelector
              value={response.rating || 0}
              onChange={(value) => onResponseChange('main', value)}
              max={question.scaleMax}
            />
          </div>
        )}
        
        {(question.questionType === 'text' || question.questionType === 'yes_no') && (
          <TextResponse
            value={response.textResponse || ''}
            onChange={(value) => onResponseChange('main', value)}
            type={question.questionType}
          />
        )}
        
        {question.questionType === 'multiple_choice' && question.options && (
          <div className="space-y-2">
            {question.options.map((option) => (
              <label
                key={option.id}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.id}
                  checked={response.selectedOptionId === option.id}
                  onChange={() => onResponseChange('main', option.id)}
                  className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-900">{option.text}</span>
              </label>
            ))}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Comments (optional):
          </label>
          <textarea
            value={response.comment || ''}
            onChange={(e) => onResponseChange('comment', e.target.value)}
            rows={2}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            placeholder="Add any additional comments here..."
          />
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;