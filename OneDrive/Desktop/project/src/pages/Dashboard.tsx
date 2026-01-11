import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  ClipboardList, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  BarChart4, 
  ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useOrganizationStore } from '../stores/organizationStore';
import { useUserStore } from '../stores/userStore';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const Dashboard = () => {
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const { users, fetchUsers } = useUserStore();
  const navigate = useNavigate();
  
  const isSuperAdmin = user?.role === 'super_admin';
  
  useEffect(() => {
    if (currentOrganization) {
      fetchUsers(currentOrganization.id);
    }
  }, [currentOrganization, fetchUsers]);
  
  // Mock data for dashboard stats
  const stats = {
    totalUsers: users.length,
    pendingAssessments: 5,
    completedAssessments: 8,
    totalAssessments: 13
  };
  
  const recentActivity = [
    { id: 1, type: 'assessment_completed', user: 'Jane Smith', date: '2025-04-01T14:30:00' },
    { id: 2, type: 'user_added', user: 'Mark Johnson', date: '2025-03-31T10:15:00' },
    { id: 3, type: 'assessment_created', user: 'Admin', date: '2025-03-30T16:45:00' }
  ];
  
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'assessment_completed':
        return <CheckCircle className="h-5 w-5 text-success-500" />;
      case 'user_added':
        return <Users className="h-5 w-5 text-primary-500" />;
      case 'assessment_created':
        return <ClipboardList className="h-5 w-5 text-secondary-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getActivityText = (type: string, user: string) => {
    switch (type) {
      case 'assessment_completed':
        return `${user} completed an assessment`;
      case 'user_added':
        return `${user} was added to the organization`;
      case 'assessment_created':
        return `New assessment was created by ${user}`;
      default:
        return `Unknown activity by ${user}`;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-l-4 border-primary-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-700">Total Users</p>
                <p className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalUsers}</p>
              </div>
              <div className="p-3 bg-primary-500 bg-opacity-10 rounded-full">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
            </div>
            <div className="mt-4">
              {isSuperAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary-700 hover:text-primary-800 px-0"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => navigate('/users')}
                >
                  Manage Users
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-warning-50 to-warning-100 border-l-4 border-warning-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-warning-700">Pending</p>
                <p className="mt-1 text-3xl font-semibold text-gray-900">{stats.pendingAssessments}</p>
              </div>
              <div className="p-3 bg-warning-500 bg-opacity-10 rounded-full">
                <Clock className="h-6 w-6 text-warning-600" />
              </div>
            </div>
            <div className="mt-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-warning-700 hover:text-warning-800 px-0"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => navigate(isSuperAdmin ? '/assessments' : '/my-assessments')}
              >
                View Assessments
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-success-50 to-success-100 border-l-4 border-success-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-success-700">Completed</p>
                <p className="mt-1 text-3xl font-semibold text-gray-900">{stats.completedAssessments}</p>
              </div>
              <div className="p-3 bg-success-500 bg-opacity-10 rounded-full">
                <CheckCircle className="h-6 w-6 text-success-600" />
              </div>
            </div>
            <div className="mt-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-success-700 hover:text-success-800 px-0"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => navigate(isSuperAdmin ? '/results' : '/my-results')}
              >
                View Results
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-secondary-50 to-secondary-100 border-l-4 border-secondary-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-700">Total Assessments</p>
                <p className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalAssessments}</p>
              </div>
              <div className="p-3 bg-secondary-500 bg-opacity-10 rounded-full">
                <BarChart4 className="h-6 w-6 text-secondary-600" />
              </div>
            </div>
            <div className="mt-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-secondary-700 hover:text-secondary-800 px-0"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => navigate(isSuperAdmin ? '/assessments' : '/my-assessments')}
              >
                All Assessments
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map(activity => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                <div className="mt-0.5">
                  {getActivityIcon(activity.type)}
                </div>
                <div>
                  <p className="text-sm font-medium">{getActivityText(activity.type, activity.user)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(activity.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Links */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-card-hover transition-shadow">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Manage Users</h3>
                <p className="text-sm text-gray-500 mb-4">Add, edit, or remove users from your organization.</p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/users')}
                >
                  Go to Users
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-card-hover transition-shadow">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center mb-4">
                  <ClipboardList className="h-6 w-6 text-secondary-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Create Assessment</h3>
                <p className="text-sm text-gray-500 mb-4">Build new assessments with custom sections and questions.</p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/assessments')}
                >
                  Go to Assessments
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-card-hover transition-shadow">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center mb-4">
                  <BarChart4 className="h-6 w-6 text-accent-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">View Results</h3>
                <p className="text-sm text-gray-500 mb-4">Review assessment results and export reports.</p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/results')}
                >
                  Go to Results
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;