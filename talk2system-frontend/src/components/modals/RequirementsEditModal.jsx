import React, { useState, useEffect } from 'react';

export default function RequirementsEditModal({ open, onClose, onSave, sectionData, sectionType }) {
  const [editedRequirements, setEditedRequirements] = useState([]);
  const [sectionTitle, setSectionTitle] = useState('');

  useEffect(() => {
    if (sectionData && open) {
      setEditedRequirements(JSON.parse(JSON.stringify(sectionData))); // Deep clone
      setSectionTitle(getSectionTitle(sectionType));
    }
  }, [sectionData, sectionType, open]);

  const getSectionTitle = (type) => {
    const titles = {
      functional: 'Functional Requirements',
      nonFunctional: 'Non-Functional Requirements',
      actors: 'Actors',
      features: 'Features'
    };
    return titles[type] || 'Requirements';
  };

  const handleUpdateRequirement = (index, field, value) => {
    const updated = [...editedRequirements];
    updated[index] = { ...updated[index], [field]: value };
    setEditedRequirements(updated);
  };

  const handleAddRequirement = () => {
    const newReq = {
      id: `${sectionType === 'functional' ? 'FR' : sectionType === 'nonFunctional' ? 'NFR' : sectionType === 'actors' ? 'A' : 'F'}-${String(editedRequirements.length + 1).padStart(3, '0')}`,
      description: '',
      tags: sectionType === 'functional' || sectionType === 'nonFunctional' ? [] : undefined
    };
    setEditedRequirements([...editedRequirements, newReq]);
  };

  const handleRemoveRequirement = (index) => {
    setEditedRequirements(editedRequirements.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(sectionType, editedRequirements);
    onClose();
  };

  const handleCancel = () => {
    setEditedRequirements(sectionData ? JSON.parse(JSON.stringify(sectionData)) : []);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      ></div>

      {/* Modal */}
      <div className="relative bg-white dark:bg-background-dark rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-2xl">edit_note</span>
            <h2 className="text-xl font-bold text-text-dark dark:text-text-light">Edit {sectionTitle}</h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {editedRequirements.map((req, index) => (
            <div 
              key={index} 
              className="p-4 rounded-lg bg-background-light dark:bg-background-dark/50 border border-gray-200 dark:border-white/10 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-3">
                  {/* ID Field */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                      ID
                    </label>
                    <input
                      type="text"
                      value={req.id}
                      onChange={(e) => handleUpdateRequirement(index, 'id', e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg bg-white dark:bg-background-dark border border-gray-200 dark:border-white/10 text-text-dark dark:text-text-light focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      placeholder="e.g., FR-001"
                    />
                  </div>

                  {/* Description Field */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                      Description
                    </label>
                    <textarea
                      value={req.description}
                      onChange={(e) => handleUpdateRequirement(index, 'description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-background-dark border border-gray-200 dark:border-white/10 text-text-dark dark:text-text-light focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                      placeholder="Enter requirement description"
                    />
                  </div>

                  {/* Tags Field (for functional/non-functional only) */}
                  {req.tags !== undefined && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                        Tags (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={req.tags.map(t => t.label).join(', ')}
                        onChange={(e) => {
                          const tagsArray = e.target.value.split(',').map(t => ({
                            label: t.trim(),
                            color: t.toLowerCase().includes('actor') ? 'blue' : 
                                   t.toLowerCase().includes('feature') ? 'purple' : 
                                   t.toLowerCase().includes('category') ? 'green' : 'blue'
                          })).filter(t => t.label);
                          handleUpdateRequirement(index, 'tags', tagsArray);
                        }}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-background-dark border border-gray-200 dark:border-white/10 text-text-dark dark:text-text-light focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        placeholder="e.g., Actor: User, Feature: Authentication"
                      />
                    </div>
                  )}
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleRemoveRequirement(index)}
                  className="flex-shrink-0 p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Remove requirement"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          ))}

          {/* Add New Button */}
          <button
            onClick={handleAddRequirement}
            className="w-full p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-white/20 text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span className="font-medium">Add New Requirement</span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-white/10">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {editedRequirements.length} {editedRequirements.length === 1 ? 'item' : 'items'}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="px-6 py-2.5 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
            >
              <span className="material-symbols-outlined text-lg">save</span>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
