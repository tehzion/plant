import React from 'react';

interface RatingSelectorProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  disabled?: boolean;
}

const RatingSelector: React.FC<RatingSelectorProps> = ({ 
  value, 
  onChange, 
  max = 5,
  disabled = false
}) => {
  const ratings = Array.from({ length: max }, (_, i) => i + 1);
  
  return (
    <div className="flex space-x-2">
      {ratings.map((rating) => (
        <button
          key={rating}
          type="button"
          className={`
            w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            ${value === rating 
              ? 'bg-primary-600 text-white border-2 border-primary-600' 
              : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-primary-400'
            }
          `}
          onClick={() => !disabled && onChange(rating)}
          disabled={disabled}
          aria-label={`Rate ${rating} out of ${max}`}
        >
          {rating}
        </button>
      ))}
    </div>
  );
};

export default RatingSelector;