import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Edit, Trash2, FolderTree, Info, Tags, ChevronRight } from 'lucide-react';
import Pagination from '../components/Pagination';
import { format } from 'date-fns';


const CategoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, getText } = useLanguage();
  const { categories, deleteCategory, attributes, products } = useData();
  const { hasPermission, currentUser } = useAuth();


  const category = categories.find((c) => c.id === parseInt(id!));
  const parentCategory = category?.parentId ? categories.find((c) => c.id === category.parentId) : null;
  const childCategories = categories.filter((c) => c.parentId === category?.id);


  const canEdit = currentUser?.role === 'admin' || hasPermission('categories', 'edit');
  const canDelete = currentUser?.role === 'admin' || hasPermission('categories', 'update');

  if (!category) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FolderTree size={48} className="mx-auto text-[#A4A4A4] mb-4" />
          <h3 className="text-lg font-medium text-[#171717] mb-2">Category not found</h3>
          <Link to="/categories" className="text-primary hover:text-primary-hover">
            ← Back to Categories
          </Link>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    // Check for products assigned to this category
    const productsInCategory = products.filter((p) => p.categoryId === category.id);

    // Check for child categories
    const childCategories = categories.filter((c) => c.parentId === category.id);

    if (productsInCategory.length > 0) {
      alert(`Cannot delete category "${getText(category.name)}" because it has ${productsInCategory.length} product(s) assigned to it. Please reassign the products first.`);
      return;
    }

    let confirmMessage = `Are you sure you want to delete "${getText(category.name)}"?`;
    if (childCategories.length > 0) {
      confirmMessage += `\n\nThis will also delete ${childCategories.length} child categor${childCategories.length === 1 ? 'y' : 'ies'}.`;
    }

    if (window.confirm(confirmMessage)) {
      deleteCategory(category.id);
      navigate('/categories');
    }
  };


  const requiredAttributes = attributes.filter((attr) =>
    category.requiredAttributeIds?.includes(attr.id)
  );
  const variantAttributes = attributes.filter((attr) =>
    category.variantAttributeIds?.includes(attr.id)
  );


  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 mb-6">
        {canEdit && (
          <button
            onClick={() => {
              // Navigate back to categories page and trigger edit
              navigate(`/categories?edit=${category.id}`);
            }}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Edit size={18} />
            Edit
          </button>
        )}
        {canDelete && (
          <button
            onClick={handleDelete}
            className="btn btn-danger flex items-center gap-2"
          >
            <Trash2 size={18} />
            Delete
          </button>
        )}
      </div>

      {/* Content */}
      <div className="card p-6">
        {/* Overview */}
        <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-[#171717] mb-4">Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div>
                  <h3 className="font-medium text-[#171717] mb-3">Basic Information</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-[#5C5C5C]">Category Name (TR)</dt>
                      <dd className="text-sm font-medium text-[#171717]">
                        {typeof category.name === 'string' ? category.name : category.name.tr}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-[#5C5C5C]">Level</dt>
                      <dd className="text-sm font-medium text-[#171717]">Level {category.level}</dd>
                    </div>
                  </dl>
                </div>


                {/* Metadata */}
                <div>
                  <h3 className="font-medium text-[#171717] mb-3">Metadata</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-[#5C5C5C]">Created</dt>
                      <dd className="text-sm font-medium text-[#171717]">
                        {format(new Date(category.createdAt), 'PPpp')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-[#5C5C5C]">Last Updated</dt>
                      <dd className="text-sm font-medium text-[#171717]">
                        {format(new Date(category.updatedAt), 'PPpp')}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

            </div>
          </div>

        {/* Attributes */}
        <div className="mt-8 pt-8 border-t border-[#EBEBEB]">
          <div>
            <h2 className="text-lg font-semibold text-[#171717] mb-4">Attributes</h2>

            {/* Required Attributes */}
            <div className="mb-6">
              <h3 className="font-medium text-[#171717] mb-3 flex items-center gap-2">
                <span className="badge badge-danger">Required</span>
                Required Attributes ({requiredAttributes.length})
              </h3>
              {requiredAttributes.length > 0 ? (
                <div className="space-y-2">
                  {requiredAttributes.map((attr) => (
                    <div
                      key={attr.id}
                      className="flex items-center justify-between py-3 px-4 bg-red-50 rounded-lg border border-red-200"
                    >
                      <div className="flex items-center gap-3">
                        <Tags size={18} className="text-red-600" />
                        <div>
                          <Link
                            to={`/attributes#${attr.id}`}
                            className="font-medium text-[#171717] hover:text-primary transition-colors"
                          >
                            {getText(attr.name)}
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#5C5C5C] py-4">No required attributes assigned</p>
              )}
            </div>

            {/* Variant Attributes */}
            <div>
              <h3 className="font-medium text-[#171717] mb-3 flex items-center gap-2">
                <span className="badge badge-info">Variant</span>
                Variant Attributes ({variantAttributes.length})
              </h3>
              {variantAttributes.length > 0 ? (
                <div className="space-y-2">
                  {variantAttributes.map((attr) => (
                    <div
                      key={attr.id}
                      className="flex items-center justify-between py-3 px-4 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div className="flex items-center gap-3">
                        <Tags size={18} className="text-blue-600" />
                        <div>
                          <Link
                            to={`/attributes#${attr.id}`}
                            className="font-medium text-[#171717] hover:text-primary transition-colors"
                          >
                            {getText(attr.name)}
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#5C5C5C] py-4">No variant attributes assigned</p>
              )}
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};

export default CategoryDetailPage;

