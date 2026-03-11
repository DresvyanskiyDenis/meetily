'use client';

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Plus, Pencil, Trash2, Copy, FileText } from 'lucide-react';
import { TemplateEditorDialog } from './TemplateEditorDialog';

interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  is_custom: boolean;
}

export function PromptTemplateSettings() {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [duplicateSourceId, setDuplicateSourceId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await invoke('api_list_templates') as TemplateInfo[];
      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleCreate = () => {
    setEditingTemplateId(null);
    setDuplicateSourceId(null);
    setEditorOpen(true);
  };

  const handleEdit = (templateId: string) => {
    setEditingTemplateId(templateId);
    setDuplicateSourceId(null);
    setEditorOpen(true);
  };

  const handleDuplicate = (templateId: string) => {
    setEditingTemplateId(null);
    setDuplicateSourceId(templateId);
    setEditorOpen(true);
  };

  const handleDelete = async (templateId: string, templateName: string) => {
    try {
      await invoke('api_delete_custom_template', { templateId });
      toast.success(`Template "${templateName}" deleted`);
      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleSaved = () => {
    setEditorOpen(false);
    setEditingTemplateId(null);
    setDuplicateSourceId(null);
    fetchTemplates();
  };

  return (
    <div className="flex flex-col gap-4 mt-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Summary Templates</h3>
            <p className="text-sm text-gray-600">
              Manage templates that control how meeting summaries are structured.
              Select a template when generating a summary on the meeting details page.
            </p>
          </div>
          <Button onClick={handleCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{template.name}</span>
                  {!template.is_custom && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded flex-shrink-0">
                      Built-in
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{template.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {template.is_custom && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(template.id)}
                  title="Edit template"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDuplicate(template.id)}
                title="Duplicate as custom template"
              >
                <Copy className="h-4 w-4" />
              </Button>
              {template.is_custom && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(template.id, template.name)}
                  title="Delete template"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No templates found. Click "New Template" to create one.
          </div>
        )}
      </div>

      <TemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editingTemplateId={editingTemplateId}
        duplicateSourceId={duplicateSourceId}
        onSaved={handleSaved}
      />
    </div>
  );
}
