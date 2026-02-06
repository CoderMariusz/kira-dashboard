"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CreateEpicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEpic: (epic: { title: string; description: string }) => void;
}

export function CreateEpicModal({
  isOpen,
  onClose,
  onCreateEpic,
}: CreateEpicModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setError(null);
      setIsSubmitting(false);
      // Focus title input after a short delay
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const validate = (): boolean => {
    if (!title.trim()) {
      setError("Title is required");
      return false;
    }
    if (title.trim().length < 3) {
      setError("Title must be at least 3 characters");
      return false;
    }
    if (title.trim().length > 100) {
      setError("Title is too long (maximum 100 characters)");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onCreateEpic({
        title: title.trim(),
        description: description.trim(),
      });
      onClose();
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (error) {
      setError(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            data-testid="modal-backdrop"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg mx-4"
          >
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
              <DialogContent
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-epic-title"
                data-testid="modal-content"
                className="bg-background border shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <DialogHeader>
                  <DialogTitle id="create-epic-title">Create Epic</DialogTitle>
                  <DialogDescription>
                    Create a new epic to organize your stories.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  {/* Title Field */}
                  <div className="space-y-2">
                    <Label htmlFor="epic-title">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="epic-title"
                      ref={titleInputRef}
                      type="text"
                      value={title}
                      onChange={handleTitleChange}
                      placeholder="Enter epic title"
                      disabled={isSubmitting}
                      className="min-h-[44px]"
                      aria-invalid={!!error}
                      aria-describedby={error ? "title-error" : undefined}
                    />
                    {error && (
                      <p id="title-error" className="text-sm text-red-500">
                        {error}
                      </p>
                    )}
                  </div>

                  {/* Description Field */}
                  <div className="space-y-2">
                    <Label htmlFor="epic-description">Description</Label>
                    <Textarea
                      id="epic-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter epic description (optional)"
                      disabled={isSubmitting}
                      rows={4}
                      className="min-h-[100px] resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="min-h-[44px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="min-h-[44px] min-w-[100px]"
                    >
                      {isSubmitting ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
