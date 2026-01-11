import { useEffect, useState } from 'react';
import { PlusCircle, Pencil, Trash2, UserPlus, User, Users as UsersIcon } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import FormInput from '../../components/ui/FormInput';
import { Role, User as UserType } from '../../types';

const Users = () => {
  const { users, fetchUsers, createUser, updateUser, deleteUser, isLoading } = useUserStore();
  const { organizations, currentOrganization, fetchOrganizations } = useOrganizationStore();
  const { user: currentUser, updateUser: updateCurrentUser } = useAuthStore();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'employee' as Role,
    organizationId: currentOrganization?.id || '',
  });
  
  useEffect(() => {
    fetchOrganizations();
    if (currentOrganization) {
      fetchUsers(currentOrganization.id);
      setFormData(prev => ({ ...prev, organizationId: currentOrganization.id }));
    }
  }, [fetchOrganizations, fetchUsers, currentOrganization]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCreateUser = () => {
    if (formData.firstName && formData.lastName && formData.email && formData.role) {
      createUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        organizationId: formData.organizationId || currentOrganization?.id || '',
      });
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'employee',
        organizationId: currentOrganization?.id || '',
      });
      setShowAddForm(false);
    }
  };
  
  const handleUpdateUser = () => {
    if (editingUser && formData.firstName && formData.lastName && formData.email && formData.role) {
      updateUser(editingUser.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        organizationId: formData.organizationId || editingUser.organizationId,
      });
      setEditingUser(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'employee',
        organizationId: currentOrganization?.id || '',
      });
    }
  };
  
  const handleDeleteUser = (id: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteUser(id);
    }
  };
  
  const handleEditUser = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });
  };
  
  const cancelEdit = () => {
    setEditingUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      role: 'employee',
      organizationId: currentOrganization?.id || '',
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          leftIcon={<UserPlus className="h-4 w-4" />}
        >
          {showAddForm ? 'Cancel' : 'Add User'}
        </Button>
      </div>
      
      {/* Notification Setting for Super Admin */}
      {currentUser?.role === 'super_admin' && (
        <div className="mb-6 p-4 bg-primary-50 border border-primary-100 rounded-lg flex items-center justify-between">
          <span className="font-medium text-primary-800">Email Notifications</span>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={!!currentUser.notificationsEnabled}
              onChange={e => updateCurrentUser(currentUser.id, { notificationsEnabled: e.target.checked })}
              className="h-5 w-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable email notifications</span>
          </label>
        </div>
      )}
      
      {/* Add/Edit User Form */}
      {(showAddForm || editingUser) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingUser ? 'Edit User' : 'Add New User'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <FormInput
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
              <FormInput
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
              <FormInput
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  required
                >
                  <option value="employee">Employee</option>
                  <option value="reviewer">Reviewer</option>
                  {currentUser?.role === 'super_admin' && (
                    <>
                      <option value="org_admin">Organization Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </>
                  )}
                </select>
              </div>
              {organizations.length > 1 && (
                <div className="md:col-span-2">
                  <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700 mb-1">
                    Organization
                  </label>
                  <select
                    id="organizationId"
                    name="organizationId"
                    value={formData.organizationId}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  >
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={editingUser ? cancelEdit : () => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={editingUser ? handleUpdateUser : handleCreateUser}
                isLoading={isLoading}
              >
                {editingUser ? 'Update User' : 'Create User'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-6">
              <UsersIcon className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding a new user.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 
                            user.role === 'org_admin' ? 'bg-yellow-100 text-yellow-800' :
                            user.role === 'employee' ? 'bg-green-100 text-green-800' : 
                            'bg-blue-100 text-blue-800'}`}>
                          {user.role === 'super_admin' ? 'Super Admin' : 
                           user.role === 'org_admin' ? 'Organization Admin' :
                           user.role === 'employee' ? 'Employee' : 'Reviewer'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Pencil className="h-4 w-4" />}
                            onClick={() => handleEditUser(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            leftIcon={<Trash2 className="h-4 w-4" />}
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;