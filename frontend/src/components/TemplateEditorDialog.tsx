'use client';

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Plus, Trash2 } from 'lucide-react';

interface TemplateSection {
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
  sections: TemplateSection[];
}

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplateId: string | null;
  duplicateSourceId: string | null;
  onSaved: () => void;
}

export function TemplateEditorDialog({
  open,
  onOpenChange,
  editingTemplateId,
  duplicateSourceId,
  onSaved,
}: TemplateEditorDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [sections, setSections] = useState<TemplateSection[]>([
    { title: 'Summary', instruction: 'Provide a summary of the meeting', format: 'paragraph' },
  ]);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!open) return;

    const sourceId = editingTemplateId || duplicateSourceId;

    if (sourceId) {
      loadTemplate(sourceId, !!editingTemplateId);
    } else {
      resetForm();
    }
  }, [open, editingTemplateId, duplicateSourceId]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setTemplateId('');
    setSections([
      { title: 'Summary', instruction: 'Provide a summary of the meeting', format: 'paragraph' },
    ]);
    setIsEditing(false);
  };

  const loadTemplate = async (id: string, editing: boolean) => {
    try {
      const details = await invoke('api_get_template_full', { templateId: id }) as TemplateFullDetails;
      if (editing) {
        setName(details.name);
        setTemplateId(id);
        setIsEditing(true);
      } else {
        // Duplicating — new name and ID
        setName(`${details.name} (Copy)`);
        setTemplateId(`${id}_copy_${Date.now()}`);
        setIsEditing(false);
      }
      setDescription(details.description);
      setSections(
        details.sections.map((s) => ({
          title: s.title,
          instruction: s.instruction,
          format: s.format,
          item_format: s.item_format,
        }))
      );
    } catch (error) {
      console.error('Failed to load template:', error);
      toast.error('Failed to load template data');
    }
  };

  const addSection = () => {
    setSections([...sections, { title: '', instruction: '', format: 'paragraph' }]);
  };

  const removeSection = (index: number) => {
    if (sections.length <= 1) return;
    setSections(sections.filter((_, i) => i !== index));
  };

  const updateSection = (index: number, field: keyof TemplateSection, value: string) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const handleSave = async () => {
    const finalId =
      templateId ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

    if (!finalId || !name.trim() || !description.trim()) {
      toast.error('Please fill in template name and description');
      return;
    }

    const invalidSections = sections.filter((s) => !s.title.trim() || !s.instruction.trim());
    if (invalidSections.length > 0) {
      toast.error('All sections must have a title and instruction');
      return;
    }

    const templateJson = JSON.stringify({
      name: name.trim(),
      description: description.trim(),
      sections: sections.map((s) => ({
        title: s.title.trim(),
        instruction: s.instruction.trim(),
        format: s.format,
        ...(s.item_format ? { item_format: s.item_format } : {}),
      })),
    });

    setSaving(true);
    try {
      await invoke('api_save_custom_template', {
        templateId: finalId,
        templateJson,
      });
      toast.success(`Template "${name.trim()}" saved`);
      onSaved();
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error(`Failed to save template: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Template Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Engineering Review"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of when to use this template"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Sections</label>
              <Button variant="outline" size="sm" onClick={addSection}>
                <Plus className="h-3 w-3 mr-1" />
                Add Section
              </Button>
            </div>

            {sections.map((section, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400 w-5 text-center flex-shrink-0">{index + 1}</span>
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(index, 'title', e.target.value)}
                    placeholder="Section title (e.g., Action Items)"
                    className="flex-1"
                  />
                  <Select
                    value={section.format}
                    onValueChange={(v) => updateSection(index, 'format', v)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paragraph">Paragraph</SelectItem>
                      <SelectItem value="list">List</SelectItem>
                      <SelectItem value="string">String</SelectItem>
                    </SelectContent>
                  </Select>
                  {sections.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSection(index)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <textarea
                  value={section.instruction}
                  onChange={(e) => updateSection(index, 'instruction', e.target.value)}
                  placeholder="Instruction for AI (e.g., List all action items with owner and deadline)"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
