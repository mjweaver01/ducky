import QuackingDuck from './QuackingDuckIcon';
import './LoadingDuck.css';

interface LoadingDuckProps {
  size?: number;
  message?: string;
}

const LoadingDuck: React.FC<LoadingDuckProps> = ({ size = 75, message }) => {
  return (
    <div className="loading-duck">
      <QuackingDuck size={size} wobble autoQuack />
      {message && <div className="loading-duck-message">{message}</div>}
    </div>
  );
};

export default LoadingDuck;
