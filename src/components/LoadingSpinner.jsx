import { Leaf } from 'lucide-react';
import './LoadingSpinner.css';

const LoadingSpinner = () => {
  return (
    <div className="loading-spinner">
      <div className="loading-spinner__wrapper">
        <div className="loading-spinner__ring"></div>
        <Leaf className="loading-spinner__leaf" size={24} color="var(--color-primary)" />
      </div>
    </div>
  );
};

export default LoadingSpinner;
