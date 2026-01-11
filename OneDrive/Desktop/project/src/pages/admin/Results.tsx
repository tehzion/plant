import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, BarChart4, UserSearch, FileText } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { useResultStore } from '../../stores/resultStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import ResultChart from '../../components/results/ResultChart';
import { User } from '../../types';

const Results = () => {
  const { users, fetchUsers } = useUserStore();
  const { results, fetchResults, exportResults, isLoading } = useResultStore();
  const { currentOrganization } = useOrganizationStore();
  const navigate = useNavigate();
  
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  useEffect(() => {
    if (currentOrganization) {
      fetchUsers(currentOrganization.id);
    }
  }, [fetchUsers, currentOrganization]);
  
  useEffect(() => {
    if (selectedUserId) {
      fetchResults(selectedUserId);
    }
  }, [selectedUserId, fetchResults]);
  
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
  };
  
  const handleExport = async (format: 'csv' | 'pdf') => {
    const url = await exportResults(format);
    if (url) {
      window.open(url, '_blank');
    }
  };
  
  const employeeUsers = users.filter(u => u.role === 'employee');
  const selectedUserResults = results[selectedUserId] || [];
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Results</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => handleExport('csv')}
            disabled={!selectedUserId || selectedUserResults.length === 0}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            leftIcon={<FileText className="h-4 w-4" />}
            onClick={() => handleExport('pdf')}
            disabled={!selectedUserId || selectedUserResults.length === 0}
          >
            Export PDF
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* User Selection */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserSearch className="h-5 w-5 mr-2" />
                Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employeeUsers.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500">No employees found</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {employeeUsers.map(user => (
                    <li key={user.id}>
                      <button
                        className={`w-full text-left px-4 py-3 flex items-center space-x-3 ${
                          selectedUserId === user.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleUserSelect(user.id)}
                      >
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-800 font-medium">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Results Display */}
        <div className="lg:col-span-3">
          {!selectedUserId ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart4 className="h-12 w-12 mx-auto text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No employee selected</h3>
                <p className="mt-1 text-gray-500">Select an employee from the list to view their assessment results.</p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : selectedUserResults.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart4 className="h-12 w-12 mx-auto text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No results available</h3>
                <p className="mt-1 text-gray-500">This employee has not completed any assessments yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Assessment Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {selectedUserResults.map(result => (
                    <ResultChart key={result.sectionId} result={result} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Results;