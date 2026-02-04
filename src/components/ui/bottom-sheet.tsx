'use client';

import * as React from 'react';
import { Drawer } from 'vaul';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from '@/components/ui/dialog';

/**
 * Props for BottomSheet component
 */
interface BottomSheetProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Sheet content */
  children: React.ReactNode;
}

/**
 * Responsive modal: bottom sheet on mobile, dialog on desktop
 */
export function BottomSheet({ open, onOpenChange, children }: BottomSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <div role="dialog" data-dialog-wrapper>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogOverlay />
          <DialogContent>{children}</DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Overlay 
        data-drawer-overlay 
        className="fixed inset-0 z-50 bg-black/40" 
      />
      <Drawer.Content
        data-drawer
        data-drawer-content
        className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[96vh] flex-col overflow-y-auto rounded-t-[10px] bg-white"
      >
        <div 
          data-drawer-handle 
          className="mx-auto mt-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-gray-300" 
        />
        <div className="p-4">{children}</div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
