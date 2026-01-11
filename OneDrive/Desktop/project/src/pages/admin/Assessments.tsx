import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Pencil, Trash2, Eye, ClipboardList, ArrowRight } from 'lucide-react';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import FormInput from '../../components/ui/FormInput';

const Assessments = () => {
  const { assessments, fetchAssessments, createAssessment, deleteAssessment, isLoading, error: assessmentError } = useAssessmentStore();
  const { currentOrganization } = useOrganizationStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isDefault: false,
    organizationEmail: '',
  });
  
  useEffect(() => {
    if (currentOrganization) {
      fetchAssessments(currentOrganization.id);
    }
  }, [fetchAssessments, currentOrganization]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError(null);
  };
  
  const handleCreateAssessment = async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!currentOrganization || !user) {
      setError('Organization and user information is required');
      return;
    }

    try {
      setError(null);
      const assessmentId = await createAssessment({
        title: formData.title.trim(),
        description: formData.description.trim(),
        organizationId: currentOrganization.id,
        createdById: user.id,
        isDefault: formData.isDefault,
      });
      
      if (assessmentId) {
        navigate(`/assessments/builder/${assessmentId}`);
      } else {
        setError('Failed to create assessment');
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to create assessment');
    }
  };
  
  const handleDeleteAssessment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) {
      try {
        await deleteAssessment(id);
      } catch (err) {
        console.error('Failed to delete assessment:', err);
      }
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          leftIcon={<PlusCircle className="h-4 w-4" />}
        >
          {showAddForm ? 'Cancel' : 'Create Assessment'}
        </Button>
      </div>
      
      {/* Create Assessment Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            {(error || assessmentError) && (
              <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-md">
                {error || assessmentError}
              </div>
            )}
            
            <div className="space-y-4">
              <FormInput
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter assessment title"
                required
              />
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="Enter assessment description"
                />
              </div>
              
              {user?.role === 'super_admin' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="isDefault" className="text-sm text-gray-700">Set as Default Assessment</label>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAssessment}
                  isLoading={isLoading}
                  disabled={!formData.title.trim() || isLoading}
                >
                  Create & Continue to Builder
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Assessments List */}
      <Card>
        <CardHeader>
          <CardTitle>Assessments ({assessments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <div className="text-center py-6">
              <ClipboardList className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No assessments</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new assessment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {assessments.map((assessment) => (
                <Card key={assessment.id} className="hover:shadow-card-hover transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{assessment.title}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-error-500"
                          onClick={() => handleDeleteAssessment(assessment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                        {assessment.description || 'No description provided.'}
                      </p>
                      
                      <div className="text-sm text-gray-500 mb-4">
                        <div>Sections: {assessment.sections?.length || 0}</div>
                        <div>Questions: {assessment.sections?.reduce((acc, section) => acc + (section.questions?.length || 0), 0) || 0}</div>
                        <div>Created: {new Date(assessment.createdAt).toLocaleDateString()}</div>
                      </div>
                      
                      <div className="mt-auto pt-4 flex justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Pencil className="h-4 w-4" />}
                          onClick={() => navigate(`/assessments/builder/${assessment.id}`)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          rightIcon={<ArrowRight className="h-4 w-4" />}
                          onClick={() => navigate(`/assessments/builder/${assessment.id}`)}
                        >
                          Manage
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Assessments;