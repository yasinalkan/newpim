import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Users as UsersIcon, Search, ArrowUp, ArrowDown } from 'lucide-react';
import Pagination from '../components/Pagination';
import type { User, UserRole, Permission } from '../types';

const UsersPage: React.FC = () => {
  const { users, createUser, updateUser, deleteUser, currentUser } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('standard_user');
  const [permissions, setPermissions] = useState<Record<string, Permission>>({
    products: { view: false, edit: false, update: false, pageAccess: false },
    categories: { view: false, edit: false, update: false, pageAccess: false },
    attributes: { view: false, edit: false, update: false, pageAccess: false },
    assets: { view: false, edit: false, update: false, pageAccess: false },
  });

  // Search, filter, sort, pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'role' | 'lastLogin'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    if (currentUser?.role !== 'admin') return [];

    let filtered = users.filter((user) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = user.name.toLowerCase();
        const email = user.email.toLowerCase();
        if (!name.includes(query) && !email.includes(query)) {
          return false;
        }
      }

      // Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && user.status !== statusFilter) {
        return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        case 'lastLogin':
          aValue = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          bValue = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchQuery, roleFilter, statusFilter, sortBy, sortOrder, currentUser]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredAndSortedUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <UsersIcon size={48} className="mx-auto text-[#A4A4A4] mb-4" />
          <h3 className="text-lg font-medium text-[#171717] mb-2">You don't have permission for this action</h3>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email) {
      alert('Please fill in all required fields');
      return;
    }

    const userData = {
      name,
      email,
      password: password || 'default123',
      role,
      status: 'active' as const,
      permissions: role === 'admin' ? null : permissions,
      lastLogin: null,
    };

    if (editingUser) {
      updateUser(editingUser.id, userData);
    } else {
      createUser(userData);
    }

    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('standard_user');
    setPermissions({
      products: { view: false, edit: false, update: false, pageAccess: false },
      categories: { view: false, edit: false, update: false, pageAccess: false },
      attributes: { view: false, edit: false, update: false, pageAccess: false },
    });
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    if (user.permissions) {
      setPermissions(user.permissions);
    }
    setShowForm(true);
  };

  const handleDelete = (user: User) => {
    if (window.confirm('Are you sure you want to delete?')) {
      deleteUser(user.id);
    }
  };

  const updatePermission = (page: string, type: keyof Permission, value: boolean) => {
    setPermissions({
      ...permissions,
      [page]: {
        ...permissions[page],
        [type]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#5C5C5C]">
            {filteredAndSortedUsers.length} users
            {filteredAndSortedUsers.length > itemsPerPage && (
              <span className="ml-2 text-[#5C5C5C]">
                (Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedUsers.length)})
              </span>
            )}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            New User
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[#171717] mb-4">
            {editingUser ? 'Edit User' : 'New User'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Password {!editingUser && '*'}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder={editingUser ? 'Leave blank to keep current' : ''}
                  required={!editingUser}
                />
              </div>
              <div>
                <label className="label">Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="input"
                >
                  <option value="standard_user">Standard User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {role === 'standard_user' && (
              <div className="border border-[#EBEBEB] rounded-lg p-4">
                <h3 className="font-medium text-[#171717] mb-3">Permissions</h3>
                <div className="space-y-3">
                  {Object.keys(permissions).map((page) => (
                    <div key={page} className="grid grid-cols-5 gap-2 items-center">
                      <div className="font-medium text-sm text-[#5C5C5C] capitalize">{page}</div>
                      {(['pageAccess', 'view', 'edit', 'update'] as const).map((type) => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permissions[page][type]}
                            onChange={(e) => updatePermission(page, type, e.target.checked)}
                            className="rounded border-[#EBEBEB] text-primary focus:ring-primary"
                          />
                          <span className="text-xs text-[#5C5C5C] capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {role === 'admin' && (
              <div className="bg-primary-light border border-primary rounded-lg p-4 text-sm text-[#5C5C5C]">
                Admins have fixed, full permissions to all features.
              </div>
            )}

            <div className="flex items-center gap-2">
              <button type="submit" className="btn btn-primary">
                Save
              </button>
              <button type="button" onClick={resetForm} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-4 space-y-4">
        <div className="flex gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A4A4A4]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="input pl-10"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
            className="input w-40"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="standard_user">Standard User</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="input w-40"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="input w-40"
            >
              <option value="name">Sort by Name</option>
              <option value="email">Sort by Email</option>
              <option value="role">Sort by Role</option>
              <option value="lastLogin">Sort by Last Login</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn btn-secondary p-2"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
            </button>
          </div>

        </div>
      </div>

      {/* Users List */}
      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <UsersIcon size={48} className="mx-auto text-[#A4A4A4] mb-4" />
                  <p className="text-[#5C5C5C]">
                    {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                      ? 'No users found matching your criteria'
                      : 'No users found'}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="text-[#5C5C5C]">{user.email}</td>
                  <td>
                    <span
                      className={`badge ${user.role === 'admin' ? 'badge-success' : 'badge-info'
                        }`}
                    >
                      {user.role === 'admin' ? 'Admin' : 'Standard User'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-danger'
                        }`}
                    >
                      {user.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-sm text-[#5C5C5C]">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1 text-[#5C5C5C] hover:text-primary rounded"
                      >
                        <Edit size={16} />
                      </button>
                      {user.id !== currentUser.id && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-1 text-[#5C5C5C] hover:text-red-600 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredAndSortedUsers.length}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(value) => setItemsPerPage(value as number)}
          itemsPerPageOptions={[10, 25, 50, 100]}
        />
      </div>
    </div>
  );
};

export default UsersPage;

