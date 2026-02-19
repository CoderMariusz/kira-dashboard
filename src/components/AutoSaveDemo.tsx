'use client';

import { useState, useEffect } from 'react';
import { useAutoSave, getAutoSavedData, clearAutoSavedData } from '@/hooks/useAutoSave';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Demo component showing auto-save functionality in action
 * This component demonstrates:
 * 1. Auto-saving form data every 10 seconds
 * 2. Restoring data from localStorage on mount
 * 3. Manual save/clear operations
 */
export function AutoSaveDemo() {
  const STORAGE_KEY = 'demo-form-data';
  
  const [formData, setFormData] = useState(() =>
    getAutoSavedData(STORAGE_KEY, {
      title: '',
      description: '',
      name: '',
    })
  );

  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Enable auto-save with 10-second interval
  useAutoSave(formData, {
    key: STORAGE_KEY,
    interval: 10000,
    enabled: true,
  });

  // Monitor for save events
  useEffect(() => {
    const handleSave = () => {
      setSaveStatus('saving');
      setTimeout(() => {
        setLastSaved(new Date().toLocaleTimeString());
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 300);
    };

    const interval = setInterval(handleSave, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleClear = () => {
    clearAutoSavedData(STORAGE_KEY);
    setFormData({ title: '', description: '', name: '' });
    setLastSaved(null);
  };

  const handleManualSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setLastSaved(new Date().toLocaleTimeString());
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Auto-Save Demo</CardTitle>
        <CardDescription>
          Form data is automatically saved every 10 seconds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter title"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your name"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter description"
              className="w-full p-2 border rounded min-h-24"
            />
          </div>
        </div>

        {/* Status Display */}
        <div className="p-3 bg-gray-100 rounded text-sm space-y-2">
          <div>
            <strong>Status:</strong>{' '}
            <span className={
              saveStatus === 'saved' ? 'text-green-600' :
              saveStatus === 'saving' ? 'text-blue-600' :
              'text-gray-600'
            }>
              {saveStatus === 'saved' && '✓ Saved'}
              {saveStatus === 'saving' && '⏳ Saving...'}
              {saveStatus === 'idle' && 'Ready'}
            </span>
          </div>
          {lastSaved && (
            <div>
              <strong>Last saved:</strong> {lastSaved}
            </div>
          )}
          <div>
            <strong>Storage key:</strong> <code className="text-xs">{STORAGE_KEY}</code>
          </div>
        </div>

        {/* Current Data Preview */}
        <div className="p-3 bg-gray-50 rounded text-sm">
          <strong>Current Data (in localStorage):</strong>
          <pre className="text-xs mt-2 overflow-auto max-h-32">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleManualSave}
            variant="default"
          >
            💾 Save Now
          </Button>
          <Button
            onClick={handleClear}
            variant="outline"
            className="text-red-600"
          >
            🗑️ Clear Data
          </Button>
        </div>

        {/* Instructions */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          <strong>💡 How it works:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Type in any field to modify the form</li>
            <li>Data is automatically saved every 10 seconds</li>
            <li>Refresh the page to see data restored from localStorage</li>
            <li>Close the browser and reopen to confirm persistence</li>
            <li>Click "Clear Data" to reset everything</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
