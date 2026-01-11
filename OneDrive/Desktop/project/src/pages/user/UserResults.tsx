import { useEffect } from 'react';
import { BarChart4, Download, FileText } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useResultStore } from '../../stores/resultStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import ResultChart from '../../components/results/ResultChart';
import Button from '../../components/ui/Button';

const UserResults = () => {
  const { user } = useAuthStore();
  const { results, fetchResults, exportResults, isLoading } = useResultStore();
  
  useEffect(() => {
    if (user) {
      fetchResults(user.id);
    }
  }, [user, fetchResults]);
  
  const userResults = user ? results[user.id] || [] : [];
  
  const handleExport = async (format: 'csv' | 'pdf') => {
    const url = await exportResults(format);
    if (url) {
      window.open(url, '_blank');
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
        {userResults.length > 0 && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => handleExport('csv')}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              leftIcon={<FileText className="h-4 w-4" />}
              onClick={() => handleExport('pdf')}
            >
              Export PDF
            </Button>
          </div>
        )}
      </div>
      
      {/* Results Guide */}
      <Card className="bg-primary-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-primary-100 p-2 rounded-full">
              <BarChart4 className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-medium mb-2">Understanding Your Results</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Your assessment results show:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Self-ratings compared to reviewer averages</li>
                  <li>Alignment indicators for each competency</li>
                  <li>Written feedback from reviewers</li>
                </ul>
                <div className="mt-4 space-x-4 flex items-center text-sm">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">✓ Aligned</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">⚠ Overestimated</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">🔍 Underestimated</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : userResults.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart4 className="h-12 w-12 mx-auto text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No results available</h3>
            <p className="mt-1 text-gray-500">You haven't completed any assessments yet or your results are still being processed.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Assessment Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {userResults.map(result => (
                <ResultChart key={result.sectionId} result={result} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserResults;