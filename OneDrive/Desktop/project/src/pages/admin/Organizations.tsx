import { useEffect, useState } from 'react';
import { PlusCircle, Pencil, Trash2, Building2 } from 'lucide-react';
import { useOrganizationStore } from '../../stores/organizationStore';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import FormInput from '../../components/ui/FormInput';

const Organizations = () => {
  const { organizations, fetchOrganizations, createOrganization, updateOrganization, deleteOrganization, isLoading } = useOrganizationStore();
  
  const [newOrgName, setNewOrgName] = useState('');
  const [editingOrg, setEditingOrg] = useState<{id: string, name: string} | null>(null);
  
  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);
  
  const handleCreateOrganization = () => {
    if (newOrgName.trim()) {
      createOrganization(newOrgName.trim());
      setNewOrgName('');
    }
  };
  
  const handleUpdateOrganization = () => {
    if (editingOrg && editingOrg.name.trim()) {
      updateOrganization(editingOrg.id, editingOrg.name.trim());
      setEditingOrg(null);
    }
  };
  
  const handleDeleteOrganization = (id: string) => {
    if (window.confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      deleteOrganization(id);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
      </div>
      
      {/* Create Organization */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <FormInput
                label="Organization Name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Enter organization name"
              />
            </div>
            <Button
              onClick={handleCreateOrganization}
              isLoading={isLoading}
              leftIcon={<PlusCircle className="h-4 w-4" />}
            >
              Create
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Organizations List */}
      <Card>
        <CardHeader>
          <CardTitle>Organizations ({organizations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <div className="text-center py-6">
              <Building2 className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new organization.</p>
            </div>
          ) : (
            <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg border border-gray-200">
              <ul className="divide-y divide-gray-200">
                {organizations.map((org) => (
                  <li key={org.id} className="p-4 hover:bg-gray-50">
                    {editingOrg && editingOrg.id === org.id ? (
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <FormInput
                            value={editingOrg.name}
                            onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                          />
                        </div>
                        <Button
                          onClick={handleUpdateOrganization}
                          size="sm"
                          isLoading={isLoading}
                        >
                          Save
                        </Button>
                        <Button
                          onClick={() => setEditingOrg(null)}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-medium text-gray-900">{org.name}</h3>
                          <p className="text-sm text-gray-500">
                            Created on {new Date(org.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setEditingOrg({ id: org.id, name: org.name })}
                            variant="outline"
                            size="sm"
                            leftIcon={<Pencil className="h-4 w-4" />}
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDeleteOrganization(org.id)}
                            variant="danger"
                            size="sm"
                            leftIcon={<Trash2 className="h-4 w-4" />}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Organizations;