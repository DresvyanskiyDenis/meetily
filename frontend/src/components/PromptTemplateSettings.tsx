'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Plus, Pencil, Trash2, Copy, FileText, Download, Upload } from 'lucide-react';
import { TemplateEditorDialog } from './TemplateEditorDialog';

interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  is_custom: boolean;
}

interface TemplateSectionDetail {
  title: string;
  instruction: string;
  format: string;
  item_format?: string;
}

interface TemplateFullDetails {
  id: string;
  name: string;
  description: string;
  is_custom: boolean;
  sections: TemplateSectionDetail[];
}

const SAFE_ID = /^[a-z0-9_]+$/;

function slugifyId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function PromptTemplateSettings() {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [duplicateSourceId, setDuplicateSourceId] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleExport = async (templateId: string) => {
    try {
      const details = await invoke('api_get_template_full', { templateId }) as TemplateFullDetails;
      // Strip `id` and `is_custom` — those are runtime-only metadata, not part
      // of the on-disk template format.
      const payload = {
        name: details.name,
        description: details.description,
        sections: details.sections,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export template:', error);
      toast.error('Failed to export template');
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;

    try {
      const text = await file.text();
      // Validate it parses to roughly the right shape before sending to Rust.
      const parsed = JSON.parse(text);
      if (!parsed?.name || !parsed?.description || !Array.isArray(parsed?.sections)) {
        toast.error('File is not a valid template (missing name/description/sections)');
        return;
      }

      // Derive id from filename minus .json, fall back to slugified name.
      const baseId = file.name.replace(/\.json$/i, '');
      const fromFilename = baseId.toLowerCase();
      const candidateId = SAFE_ID.test(fromFilename) ? fromFilename : slugifyId(parsed.name);

      await invoke('api_save_custom_template', {
        templateId: candidateId,
        templateJson: text,
        overwrite: false,
      });
      toast.success(`Imported template "${parsed.name}"`);
      fetchTemplates();
    } catch (error) {
      console.error('Failed to import template:', error);
      toast.error(`Failed to import template: ${error}`);
    }
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
          <div className="flex items-center gap-2">
            <Button onClick={handleImportClick} size="sm" variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button onClick={handleCreate} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportFile}
        />
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExport(template.id)}
                title="Export to JSON file"
              >
                <Download className="h-4 w-4" />
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
