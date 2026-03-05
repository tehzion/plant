import { Leaf } from 'lucide-react';

const LoadingSpinner = () => {
    return (
        <div className="loading-container">
            <div className="spinner-wrapper">
                <div className="spinner-ring"></div>
                <Leaf className="spinner-leaf" size={24} color="var(--color-primary)" />
            </div>
            <style>{`
                .loading-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 200px;
                    width: 100%;
                }
                .spinner-wrapper {
                    position: relative;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .spinner-ring {
                    width: 50px;
                    height: 50px;
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid var(--color-primary);
                    border-radius: 50%;
                    animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
                }
                .spinner-leaf {
                    position: absolute;
                    animation: breathe 1.2s ease-in-out infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes breathe {
                    0%, 100% { transform: scale(0.8); opacity: 0.6; }
                    50% { transform: scale(1.1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default LoadingSpinner;
