import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Plus, Search, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Trash2, Copy, Eye, EyeOff } from 'lucide-react';
import type { APIKey } from '../../types';

const APIKeyManagement: React.FC = () => {
  const { settings, updateSettings } = useData();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['read']);
  const [expirationDate, setExpirationDate] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<number | null>(null);

  // Search, filter, sort, pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'revoked'>('all');
  const [permissionFilter, setPermissionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'lastUsedAt' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const apiKeys = settings.apiKeys || [];

  // Filter and sort
  const filteredAndSortedKeys = useMemo(() => {
    let filtered = apiKeys.filter((key) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = key.name.toLowerCase().includes(query);
        const descMatch = key.description.toLowerCase().includes(query);
        if (!nameMatch && !descMatch) return false;
      }

      if (statusFilter !== 'all' && key.status !== statusFilter) return false;
      if (permissionFilter !== 'all' && !key.permissions.includes(permissionFilter)) return false;

      return true;
    });

    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'lastUsedAt':
          aValue = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
          bValue = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [apiKeys, searchQuery, statusFilter, permissionFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedKeys.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedKeys = filteredAndSortedKeys.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, permissionFilter]);

  const generateAPIKey = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 64; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `pk_${key}`;
  };

  const hashKey = (key: string): string => {
    // Simple hash for demo - in production use proper hashing
    return btoa(key).substring(0, 32);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a key name');
      return;
    }

    const apiKey = generateAPIKey();
    const keyHash = hashKey(apiKey);

    const newKey: APIKey = {
      id: Math.max(...apiKeys.map(k => k.id), 0) + 1,
      name: name.trim(),
      description: description.trim(),
      keyHash,
      permissions,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      expiresAt: expirationDate || null,
      status: expirationDate && new Date(expirationDate) < new Date() ? 'expired' : 'active',
    };

    updateSettings({
      ...settings,
      apiKeys: [...apiKeys, newKey],
    });

    setGeneratedKey(apiKey);
    setName('');
    setDescription('');
    setPermissions(['read']);
    setExpirationDate('');
  };

  const handleRevoke = (id: number) => {
    if (window.confirm('Are you sure you want to revoke this API key?')) {
      updateSettings({
        ...settings,
        apiKeys: apiKeys.map(k =>
          k.id === id ? { ...k, status: 'revoked' as const } : k
        ),
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('API key copied to clipboard');
  };

  const allPermissions = ['read', 'write', 'admin'];
  const uniquePermissions = Array.from(new Set(apiKeys.flatMap(k => k.permissions)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#171717]">API Key Management</h2>
          <p className="text-sm text-[#5C5C5C] mt-1">
            {filteredAndSortedKeys.length} API key{filteredAndSortedKeys.length !== 1 ? 's' : ''}
            {filteredAndSortedKeys.length > itemsPerPage && (
              <span className="ml-2 text-[#5C5C5C]">
                (Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedKeys.length)})
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
            Create API Key
          </button>
        )}
      </div>

      {/* Generated Key Display */}
      {generatedKey && (
        <div className="card p-6 bg-green-50 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-900">API Key Generated</h3>
            <button
              onClick={() => setGeneratedKey(null)}
              className="text-green-700 hover:text-green-900"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-green-800 mb-2">
            ⚠️ This key will only be shown once. Copy it now!
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white p-3 rounded border border-green-300 font-mono text-sm">
              {generatedKey}
            </code>
            <button
              onClick={() => copyToClipboard(generatedKey)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Copy size={18} />
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-[#171717] mb-4">Create New API Key</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Key Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="e.g., Production API Key"
                required
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input"
                rows={3}
                placeholder="Describe what this key will be used for"
              />
            </div>
            <div>
              <label className="label">Permissions *</label>
              <div className="flex gap-4 mt-2">
                {allPermissions.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.includes(perm)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPermissions([...permissions, perm]);
                        } else {
                          setPermissions(permissions.filter(p => p !== perm));
                        }
                      }}
                      className="rounded border-[#EBEBEB] text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-[#5C5C5C] capitalize">{perm}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Expiration Date (Optional)</label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="input"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                Generate Key
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setGeneratedKey(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card p-4 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A4A4A4]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or description..."
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="input w-40"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
          <select
            value={permissionFilter}
            onChange={(e) => setPermissionFilter(e.target.value)}
            className="input w-40"
          >
            <option value="all">All Permissions</option>
            {uniquePermissions.map((perm) => (
              <option key={perm} value={perm}>
                {perm.charAt(0).toUpperCase() + perm.slice(1)}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="input w-40"
            >
              <option value="name">Sort by Name</option>
              <option value="createdAt">Sort by Created</option>
              <option value="lastUsedAt">Sort by Last Used</option>
              <option value="status">Sort by Status</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn btn-secondary p-2"
            >
              {sortOrder === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#5C5C5C]">Per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="input w-20"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>

      {/* API Keys List */}
      {paginatedKeys.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[#5C5C5C]">
            {apiKeys.length === 0
              ? 'No API keys created yet'
              : 'No API keys match your filters'}
          </p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Permissions</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Last Used</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedKeys.map((key) => (
                    <tr key={key.id}>
                      <td className="font-medium">{key.name}</td>
                      <td className="text-sm text-[#5C5C5C]">{key.description || '-'}</td>
                      <td>
                        <div className="flex gap-1 flex-wrap">
                          {key.permissions.map((perm) => (
                            <span key={perm} className="badge badge-info text-xs capitalize">
                              {perm}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            key.status === 'active'
                              ? 'badge-success'
                              : key.status === 'expired'
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}
                        >
                          {key.status}
                        </span>
                      </td>
                      <td className="text-sm text-[#5C5C5C]">
                        {new Date(key.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-sm text-[#5C5C5C]">
                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="text-sm text-[#5C5C5C]">
                        {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-white px-2 py-1 rounded font-mono">
                            {showKey === key.id ? key.keyHash : '••••••••'}
                          </code>
                          <button
                            onClick={() => setShowKey(showKey === key.id ? null : key.id)}
                            className="p-1 text-[#5C5C5C] hover:text-primary rounded"
                            title={showKey === key.id ? 'Hide' : 'Show'}
                          >
                            {showKey === key.id ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          {key.status === 'active' && (
                            <button
                              onClick={() => handleRevoke(key.id)}
                              className="p-1 text-[#5C5C5C] hover:text-red-600 rounded"
                              title="Revoke"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-[#5C5C5C]">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    return (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    );
                  })
                  .map((page, index, array) => {
                    const showEllipsisBefore = index > 0 && array[index - 1] < page - 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsisBefore && <span className="px-2 text-[#A4A4A4]">...</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`btn ${currentPage === page ? 'btn-primary' : 'btn-secondary'} px-3 py-1`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default APIKeyManagement;

