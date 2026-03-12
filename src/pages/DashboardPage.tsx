import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Package, FolderTree, Tags, TrendingUp, AlertCircle } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { products, categories, attributes } = useData();
  const { currentUser } = useAuth();

  const stats = [
    {
      label: 'Products',
      value: products.length,
      icon: Package,
      color: 'bg-blue-500',
      link: '/products',
      change: '+12%',
    },
    {
      label: 'Categories',
      value: categories.length,
      icon: FolderTree,
      color: 'bg-green-500',
      link: '/categories',
      change: '+5%',
    },
    {
      label: 'Attributes',
      value: attributes.length,
      icon: Tags,
      color: 'bg-purple-500',
      link: '/attributes',
      change: '+8%',
    },
  ];

  const draftProducts = products.filter((p) => p.status === 'draft');
  const pendingProducts = products.filter((p) => p.status === 'pending');
  const completeProducts = products.filter((p) => p.status === 'complete');
  const lowStockProducts = products.filter((p) => p.stock < 10 && p.stock > 0);
  const outOfStockProducts = products.filter((p) => p.stock === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[#5C5C5C]">
          Welcome, {currentUser?.name}!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.link}
            className="card p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#5C5C5C] mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-[#171717]">{stat.value}</p>
                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <TrendingUp size={14} />
                  {stat.change}
                </p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon size={24} className="text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#5C5C5C]">Draft</p>
              <p className="text-2xl font-bold text-yellow-600">{draftProducts.length}</p>
            </div>
            <div className="badge badge-warning">Draft</div>
          </div>
        </div>

        <Link to="/products?status=pending" className="card p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#5C5C5C]">Pending</p>
              <p className="text-2xl font-bold text-blue-600">{pendingProducts.length}</p>
            </div>
            <div className="badge badge-info">Pending</div>
          </div>
        </Link>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#5C5C5C]">Complete</p>
              <p className="text-2xl font-bold text-green-600">{completeProducts.length}</p>
            </div>
            <div className="badge badge-success">Complete</div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#5C5C5C]">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</p>
            </div>
            <div className="badge badge-warning">
              <AlertCircle size={12} />
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#5C5C5C]">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</p>
            </div>
            <div className="badge badge-danger">
              <AlertCircle size={12} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Products */}
      <div className="card">
        <div className="p-6 border-b border-[#EBEBEB]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#171717]">Recent Products</h2>
            <Link to="/products" className="text-sm text-primary hover:text-primary-hover">
              View All →
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Brand</th>
                <th>Status</th>
                <th>Stock</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 5).map((product) => (
                <tr key={product.id}>
                  <td>
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-[#F7F7F7] rounded flex items-center justify-center">
                        <Package size={20} className="text-[#A4A4A4]" />
                      </div>
                    )}
                  </td>
                  <td className="font-medium">
                    {product.name}
                  </td>
                  <td className="text-[#5C5C5C]">{product.sku}</td>
                  <td className="text-[#5C5C5C]">{product.brand}</td>
                  <td>
                    <span
                      className={`badge ${
                        product.status === 'complete'
                          ? 'badge-success'
                          : product.status === 'pending'
                          ? 'badge-info'
                          : 'badge-warning'
                      }`}
                    >
                      {product.status === 'complete'
                        ? 'Complete'
                        : product.status === 'pending'
                        ? 'Pending'
                        : 'Draft'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${
                        product.stock === 0
                          ? 'text-red-600'
                          : product.stock < 10
                          ? 'text-orange-600'
                          : 'text-[#5C5C5C]'
                      }`}
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td className="text-[#171717] font-medium">₺{product.price.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

