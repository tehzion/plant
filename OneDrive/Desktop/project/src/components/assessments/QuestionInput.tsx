import React from 'react';
import RatingSelector from './RatingSelector';
import TextResponse from './TextResponse';
import { QuestionType } from '../../types';

interface QuestionInputProps {
  type: QuestionType;
  value: any;
  onChange: (value: any) => void;
  options?: Array<{ id: string; text: string; value?: number }>;
  scaleMax?: number;
  disabled?: boolean;
}

const QuestionInput: React.FC<QuestionInputProps> = ({
  type,
  value,
  onChange,
  options = [],
  scaleMax = 5,
  disabled = false
}) => {
  switch (type) {
    case 'rating':
      return (
        <RatingSelector
          value={value || 0}
          onChange={onChange}
          max={scaleMax}
          disabled={disabled}
        />
      );
    
    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {options.map((option) => (
            <label
              key={option.id}
              className={`
                flex items-center space-x-3 p-2 rounded-lg
                ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-50 cursor-pointer'}
              `}
            >
              <input
                type="radio"
                name={`option-${option.id}`}
                value={option.id}
                checked={value === option.id}
                onChange={() => onChange(option.id)}
                disabled={disabled}
                className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-900">{option.text}</span>
            </label>
          ))}
        </div>
      );
    
    case 'yes_no':
    case 'text':
      return (
        <TextResponse
          type={type}
          value={value || ''}
          onChange={onChange}
        />
      );
    
    default:
      return null;
  }
};

export default QuestionInput;