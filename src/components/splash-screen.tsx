import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Briefcase } from 'lucide-react'; // Assuming you use this for your logo

interface SplashScreenProps {
  isLoading: boolean;
}

export function SplashScreen({ isLoading }: SplashScreenProps) {
  return (
    <div
      className={`splash-screen ${
        isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="splash-content">
        <Briefcase className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold text-primary mb-6">StockWatch</h1>
        <LoadingSpinner />
      </div>
    </div>
  );
}
