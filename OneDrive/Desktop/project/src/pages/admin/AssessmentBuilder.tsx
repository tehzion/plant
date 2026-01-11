import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, PlusCircle, ArrowLeft, Building2 } from 'lucide-react';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import FormInput from '../../components/ui/FormInput';
import OrganizationSelector from '../../components/assessments/OrganizationSelector';

const AssessmentBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    currentAssessment, 
    fetchAssessment,
    updateAssessment,
    addSection,
    assignOrganizations,
    isLoading,
    error: assessmentError 
  } = useAssessmentStore();
  
  const { organizations, fetchOrganizations } = useOrganizationStore();
  
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (id) {
      fetchAssessment(id);
      fetchOrganizations();
    }
  }, [id, fetchAssessment, fetchOrganizations]);
  
  useEffect(() => {
    if (currentAssessment?.assignedOrganizations) {
      setSelectedOrganizations(
        currentAssessment.assignedOrganizations.map(org => org.id)
      );
    }
  }, [currentAssessment?.assignedOrganizations]);
  
  const handleAddSection = async () => {
    if (!id || !newSectionTitle.trim()) {
      setError('Section title is required');
      return;
    }
    
    try {
      setError(null);
      await addSection(id, {
        title: newSectionTitle.trim(),
        description: newSectionDescription.trim(),
        order: (currentAssessment?.sections.length || 0) + 1
      });
      
      setNewSectionTitle('');
      setNewSectionDescription('');
    } catch (err) {
      setError((err as Error).message || 'Failed to add section');
    }
  };

  const handlePublish = async () => {
    if (!id || selectedOrganizations.length === 0) {
      setError('Please select at least one organization before publishing');
      return;
    }

    try {
      setError(null);
      await assignOrganizations(id, selectedOrganizations);
      alert('Assessment published successfully!');
    } catch (err) {
      setError((err as Error).message || 'Failed to publish assessment');
    }
  };
  
  if (!currentAssessment) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex justify-between items-center">
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="mr-2"
            onClick={() => navigate('/assessments')}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Assessment Builder</h1>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={handlePublish}
            variant="primary"
            leftIcon={<Building2 className="h-4 w-4" />}
            disabled={selectedOrganizations.length === 0 || isLoading}
          >
            Publish
          </Button>
          <Button
            onClick={() => updateAssessment(id!, {
              title: currentAssessment.title,
              description: currentAssessment.description
            })}
            isLoading={isLoading}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {(error || assessmentError) && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded relative">
          {error || assessmentError}
        </div>
      )}
      
      {/* Organization Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Organization Assignment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OrganizationSelector
            organizations={organizations}
            selectedIds={selectedOrganizations}
            onChange={setSelectedOrganizations}
          />
        </CardContent>
      </Card>

      {/* Assessment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <FormInput
              label="Title"
              value={currentAssessment.title}
              onChange={(e) => updateAssessment(id!, { title: e.target.value })}
            />
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={currentAssessment.description}
                onChange={(e) => updateAssessment(id!, { description: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Add Section Form */}
      <Card className="border border-dashed border-gray-300">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Section</h3>
          <div className="space-y-4">
            <FormInput
              label="Section Title"
              placeholder="Enter section title"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
            />
            <div>
              <label htmlFor="new-section-description" className="block text-sm font-medium text-gray-700 mb-1">
                Section Description
              </label>
              <textarea
                id="new-section-description"
                rows={2}
                value={newSectionDescription}
                onChange={(e) => setNewSectionDescription(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Enter section description"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleAddSection}
                isLoading={isLoading}
                disabled={!newSectionTitle.trim() || isLoading}
                leftIcon={<PlusCircle className="h-4 w-4" />}
              >
                Add Section
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssessmentBuilder;