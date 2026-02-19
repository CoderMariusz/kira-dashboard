# Auto-Save Hook

This directory contains the `useAutoSave` hook for implementing localStorage-based auto-save functionality in the Kira Dashboard application.

## Features

- **Automatic Saving**: Saves data to localStorage every 10 seconds (configurable)
- **Change Detection**: Only saves when data actually changes
- **Crash Recovery**: Saves on page unload to prevent data loss
- **Easy Integration**: Simple hook-based API
- **TypeScript Support**: Full type safety

## Usage

### Basic Example

```typescript
import { useAutoSave, getAutoSavedData } from '@/hooks/useAutoSave';
import { useState } from 'react';

export function MyComponent() {
  // Initialize state from localStorage or default
  const [data, setData] = useState(() =>
    getAutoSavedData('my-form', { title: '', content: '' })
  );

  // Enable auto-save with default 10-second interval
  useAutoSave(data, { key: 'my-form' });

  return (
    <div>
      <input
        value={data.title}
        onChange={(e) => setData({ ...data, title: e.target.value })}
      />
    </div>
  );
}
```

### Custom Interval

```typescript
// Save every 5 seconds
useAutoSave(data, {
  key: 'my-key',
  interval: 5000,
});

// Save every 30 seconds
useAutoSave(data, {
  key: 'my-key',
  interval: 30000,
});
```

### Conditional Enable/Disable

```typescript
const [isEnabled, setIsEnabled] = useState(true);

useAutoSave(data, {
  key: 'my-key',
  enabled: isEnabled,
});
```

## API Reference

### `useAutoSave(data, options)`

Hook for auto-saving data to localStorage.

**Parameters:**
- `data` (any): The data to save
- `options` (AutoSaveOptions):
  - `key` (string, required): localStorage key
  - `interval` (number, optional): Save interval in ms. Default: 10000
  - `enabled` (boolean, optional): Enable/disable auto-save. Default: true

**Example:**
```typescript
useAutoSave(formData, {
  key: 'user-form-draft',
  interval: 10000,
  enabled: !isSubmitted,
});
```

### `getAutoSavedData<T>(key, defaultValue)`

Retrieve auto-saved data from localStorage.

**Parameters:**
- `key` (string): localStorage key
- `defaultValue` (T): Default value if key doesn't exist

**Returns:** The parsed data or default value

**Example:**
```typescript
const savedData = getAutoSavedData('my-form', {
  title: '',
  description: '',
});
```

### `clearAutoSavedData(key)`

Remove auto-saved data from localStorage.

**Parameters:**
- `key` (string): localStorage key to clear

**Example:**
```typescript
// Clear on form submission
const handleSubmit = async () => {
  await saveToDatabase(formData);
  clearAutoSavedData('my-form');
};
```

## How It Works

1. **Initialization**: Component mounts with data from localStorage or default value
2. **Monitoring**: Hook detects data changes via useEffect dependency array
3. **Debouncing**: Instead of saving on every change, it queues saves
4. **Periodic Save**: Data is saved every 10 seconds (or custom interval)
5. **Change Detection**: Only saves if serialized data differs from last save
6. **Crash Recovery**: Saves to localStorage on page unload (`beforeunload` event)
7. **Restoration**: On page reload, data is restored from localStorage

## Crash Recovery

When a page crashes or is force-closed, the most recent auto-saved data is restored on the next load. The `AutoSaveProvider` component handles this by:

1. Recording a timestamp when the session starts
2. On next load, checking if a previous session existed
3. Restoring all auto-saved data
4. Dispatching a `autosave:recovered` event for crash detection

Listen to crash recovery events:

```typescript
useEffect(() => {
  const handleRecovery = (event: Event) => {
    const customEvent = event as CustomEvent;
    console.log('Recovered from crash!', customEvent.detail.timeSinceCrash);
    // Show toast notification, etc.
  };

  window.addEventListener('autosave:recovered', handleRecovery);
  return () => window.removeEventListener('autosave:recovered', handleRecovery);
}, []);
```

## Best Practices

### 1. Initialize from localStorage

Always initialize state from localStorage when the component first mounts:

```typescript
const [data, setData] = useState(() =>
  getAutoSavedData('key', defaultValue)
);
```

### 2. Clear After Success

Remove auto-saved data after successful submission:

```typescript
const handleSubmit = async () => {
  try {
    await api.save(data);
    clearAutoSavedData('key');
    showSuccess('Saved!');
  } catch (error) {
    showError('Failed to save');
  }
};
```

### 3. Use Conditional Enable/Disable

Disable auto-save when data is being submitted:

```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

useAutoSave(data, {
  key: 'form-draft',
  enabled: !isSubmitting,
});
```

### 4. Choose Appropriate Intervals

- **Short forms (5 fields)**: 10-30 seconds
- **Medium forms**: 15-30 seconds  
- **Long forms**: 30-60 seconds
- **Heavy data (large arrays)**: 30-60 seconds

### 5. Document Storage Keys

Use descriptive, consistent naming:

```typescript
// Good
'user-profile-draft'
'shopping-list-unsaved'
'task-board-state'

// Bad
'data'
'temp'
'form1'
```

## Limitations

- **Size Limit**: localStorage typically has ~5-10MB limit per domain
- **Synchronous**: Saving is synchronous; very large data might briefly block UI
- **Browser-Specific**: Data is not synced across tabs/windows
- **No Encryption**: Data is stored as plain text in localStorage

## Performance Considerations

The hook is optimized for performance:

1. **Change Detection**: Only saves when data actually changes (shallow comparison)
2. **Debouncing**: Saves happen at fixed intervals, not on every change
3. **Cleanup**: Timeouts are properly cleaned up to prevent memory leaks
4. **Conditional Saving**: Can be disabled when not needed

For large datasets, consider:
- Increasing the save interval (e.g., 30-60 seconds)
- Splitting data across multiple keys
- Using IndexedDB instead (future enhancement)

## Testing

Test auto-save functionality manually:

1. Open browser DevTools (F12)
2. Go to Application → Storage → Local Storage
3. Fill out a form with auto-save enabled
4. Observe localStorage being updated every 10 seconds
5. Refresh the page
6. Verify form data is restored
7. Force close the browser and reopen
8. Verify recovery from crash

## Troubleshooting

### Data not saving?
- Check if auto-save is enabled (`enabled: true`)
- Verify storage key is correct
- Check browser's localStorage quota
- Look at console for error messages

### Data not restoring on page reload?
- Ensure `getAutoSavedData` is called during initial state
- Check that localStorage hasn't been cleared
- Verify the same storage key is used

### Performance issues?
- Increase save interval (default 10s is usually fine)
- Reduce data size being saved
- Check if data is changing on every render

## Migration Guide

To add auto-save to an existing form:

1. Import the hook and utility functions
2. Initialize state from localStorage
3. Wrap state with `useAutoSave`
4. Clear data after successful submission

```typescript
// Before
const [formData, setFormData] = useState({ title: '' });

// After
const [formData, setFormData] = useState(() =>
  getAutoSavedData('form-key', { title: '' })
);

useAutoSave(formData, { key: 'form-key' });

const handleSubmit = async () => {
  await api.save(formData);
  clearAutoSavedData('form-key');
};
```

## Future Enhancements

- [ ] IndexedDB support for larger datasets
- [ ] Cross-tab synchronization
- [ ] Selective field saving
- [ ] Encryption support
- [ ] Version management
- [ ] Conflict resolution for multi-user scenarios

## See Also

- [AutoSaveProvider Component](../components/AutoSaveProvider.tsx) - Global session management
- [AutoSaveDemo Component](../components/AutoSaveDemo.tsx) - Working example
