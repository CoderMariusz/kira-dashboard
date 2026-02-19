'use client';

import { useState } from 'react';
import { useLabels, useCreateLabel, useUpdateLabel, useDeleteLabel } from '@/lib/hooks/useLabels';
import { useHousehold } from '@/lib/hooks/useHousehold';
import { LabelList } from '@/components/labels/LabelList';
import { CreateLabelButton } from '@/components/labels/CreateLabelButton';
import { LabelModal } from '@/components/labels/LabelModal';
import type { Label } from '@/lib/types/app';

export default function LabelsPage() {
  const { data: household } = useHousehold();
  const { data: labels = [] } = useLabels(household?.id);
  const createLabel = useCreateLabel(household?.id ?? '');
  const updateLabel = useUpdateLabel();
  const deleteLabel = useDeleteLabel();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);

  const handleOpenModal = () => {
    setEditingLabel(null);
    setModalOpen(true);
  };

  const handleEdit = (label: Label) => {
    setEditingLabel(label);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingLabel(null);
  };

  const handleSave = async (data: { name: string; color: string }) => {
    if (editingLabel) {
      await updateLabel.mutateAsync({ id: editingLabel.id, ...data });
    } else {
      await createLabel.mutateAsync(data);
    }
  };

  const handleDelete = async (labelId: string) => {
    await deleteLabel.mutateAsync(labelId);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Etykiety</h1>
        <CreateLabelButton onOpen={handleOpenModal} />
      </div>

      <LabelList
        labels={labels}
        householdId={household?.id ?? ''}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <LabelModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        label={editingLabel}
        existingLabels={labels}
      />
    </div>
  );
}
