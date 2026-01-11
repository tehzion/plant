import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import FormInput from '../ui/FormInput';
import Button from '../ui/Button';
import QuestionTypeSelector from './QuestionTypeSelector';
import ScaleConfig from './ScaleConfig';
import QuestionOptionsManager from './QuestionOptionsManager';
import { QuestionType, QuestionOption } from '../../types';

interface QuestionBuilderProps {
  questionText: string;
  questionType: QuestionType;
  isRequired: boolean;
  scaleMax?: number;
  options?: QuestionOption[];
  onUpdate: (data: {
    text?: string;
    questionType?: QuestionType;
    isRequired?: boolean;
    scaleMax?: number;
    options?: QuestionOption[];
  }) => void;
}

const QuestionBuilder: React.FC<QuestionBuilderProps> = ({
  questionText,
  questionType,
  isRequired,
  scaleMax = 5,
  options = [],
  onUpdate
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ text: e.target.value });
  };

  const handleTypeChange = (type: QuestionType) => {
    onUpdate({ 
      questionType: type,
      // Reset related fields when type changes
      scaleMax: type === 'rating' ? 5 : undefined,
      options: type === 'multiple_choice' ? [] : undefined
    });
  };

  const handleRequiredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ isRequired: e.target.checked });
  };

  const handleScaleMaxChange = (value: number) => {
    onUpdate({ scaleMax: value });
  };

  const handleOptionsUpdate = (updatedOptions: QuestionOption[]) => {
    onUpdate({ options: updatedOptions });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <FormInput
            value={questionText}
            onChange={handleTextChange}
            placeholder="Enter your question"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Settings className={`h-4 w-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} />}
          onClick={() => setShowSettings(!showSettings)}
          className={showSettings ? 'bg-primary-50 text-primary-700' : ''}
        >
          {showSettings ? 'Hide Settings' : 'Show Settings'}
        </Button>
      </div>

      {showSettings && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
              <QuestionTypeSelector
                value={questionType}
                onChange={handleTypeChange}
              />
            </div>
            <div className="flex items-center justify-end">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={handleRequiredChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                <span className="ms-3 text-sm font-medium text-gray-700">Required</span>
              </label>
            </div>
          </div>

          {questionType === 'rating' && (
            <ScaleConfig
              value={scaleMax}
              onChange={handleScaleMaxChange}
            />
          )}

          {questionType === 'multiple_choice' && (
            <QuestionOptionsManager
              options={options}
              onChange={handleOptionsUpdate}
              showValues={true}
            />
          )}

          {questionType === 'yes_no' && (
            <div className="bg-gray-100 p-3 rounded text-sm text-gray-600">
              This question will have fixed "Yes\" and "No\" options
            </div>
          )}

          {questionType === 'text' && (
            <div className="bg-gray-100 p-3 rounded text-sm text-gray-600">
              Respondents will provide a free-form text answer
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionBuilder;