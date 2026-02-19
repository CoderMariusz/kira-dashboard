import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

/**
 * T2: ActivityItem Component Tests
 * Single activity entry component with avatar, actor name, action description, icon, timestamp, and metadata
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * ActivityItem component does not exist yet
 */

// ═══════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════

vi.mock('@/lib/hooks/useHousehold', () => ({
  useHousehold: vi.fn(() => ({
    data: {
      id: 'hh-1',
      name: 'Rodzina Kowalskich',
      members: [
        { id: 'user-1', display_name: 'Jan Kowalski', avatar_url: null },
        { id: 'user-2', display_name: 'Anna Nowak', avatar_url: null },
      ],
    },
    isLoading: false,
    error: null,
  })),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  })),
}));

// ═══════════════════════════════════════════
// MOCK DATA - ALL fields from ActivityLog type
// ═══════════════════════════════════════════

const mockTaskCreated = {
  id: 'act-1',
  household_id: 'hh-1',
  entity_type: 'task' as const,
  entity_id: 'task-1',
  action: 'created',
  actor_id: 'user-1',
  actor_name: 'Jan Kowalski',
  metadata: {
    title: 'Zrobić zakupy',
    board_name: 'DOM',
    board_type: 'home',
  },
  created_at: new Date('2024-01-15T10:30:00Z').toISOString(),
};

const mockTaskCompleted = {
  id: 'act-2',
  household_id: 'hh-1',
  entity_type: 'task' as const,
  entity_id: 'task-2',
  action: 'completed',
  actor_id: 'user-2',
  actor_name: 'Anna Nowak',
  metadata: {
    title: 'Umyć naczynia',
    board_name: 'PRACA',
    board_type: 'work',
  },
  created_at: new Date('2024-01-15T09:15:00Z').toISOString(),
};

const mockShoppingCreated = {
  id: 'act-3',
  household_id: 'hh-1',
  entity_type: 'shopping' as const,
  entity_id: 'list-1',
  action: 'created',
  actor_id: 'user-1',
  actor_name: 'Jan Kowalski',
  metadata: {
    count: 3,
    items: ['Mleko', 'Chleb', 'Jajka'],
  },
  created_at: new Date('2024-01-15T08:00:00Z').toISOString(),
};

const mockShoppingCompleted = {
  id: 'act-4',
  household_id: 'hh-1',
  entity_type: 'shopping' as const,
  entity_id: 'item-1',
  action: 'completed',
  actor_id: 'user-2',
  actor_name: 'Anna Nowak',
  metadata: {
    item: 'Mleko',
    quantity: 2,
    unit: 'l',
  },
  created_at: new Date('2024-01-14T20:30:00Z').toISOString(),
};

const mockReminderSent = {
  id: 'act-5',
  household_id: 'hh-1',
  entity_type: 'reminder' as const,
  entity_id: 'reminder-1',
  action: 'sent',
  actor_id: null,
  actor_name: 'Kira',
  metadata: {
    task_title: 'Spotkanie z klientem',
    delivery_method: 'email',
  },
  created_at: new Date('2024-01-14T10:00:00Z').toISOString(),
};

const mockBoardCreated = {
  id: 'act-6',
  household_id: 'hh-1',
  entity_type: 'board' as const,
  entity_id: 'board-1',
  action: 'created',
  actor_id: 'user-1',
  actor_name: 'Jan Kowalski',
  metadata: {
    name: 'Projekt Dom',
    type: 'home',
  },
  created_at: new Date('2024-01-13T15:45:00Z').toISOString(),
};

const mockKiraAction = {
  id: 'act-7',
  household_id: 'hh-1',
  entity_type: 'task' as const,
  entity_id: 'task-3',
  action: 'created',
  actor_id: null,
  actor_name: 'Kira',
  metadata: {
    title: 'Zadanie automatyczne',
    source: 'webhook',
  },
  created_at: new Date('2024-01-13T12:00:00Z').toISOString(),
};

describe('T2: ActivityItem Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC2.1: Render activity entry components', () => {
    it('AC2.1: should render avatar for user actor', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockTaskCreated} />);

      const avatar = screen.getByRole('img', { name: /Jan Kowalski/i });
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('alt', 'Jan Kowalski');
    });

    it('AC2.1: should render robot icon for Kira/null actor', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockReminderSent} />);

      const avatar = screen.getByRole('img', { name: /Kira/i });
      expect(avatar).toBeInTheDocument();
      // Should show robot emoji or icon
      expect(avatar).toHaveAttribute('alt', 'Kira');
    });

    it('AC2.1: should render actor name in bold', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockTaskCreated} />);

      const actorName = screen.getByText('Jan Kowalski');
      expect(actorName).toBeInTheDocument();
      // Check for bold styling (font-weight: bold or font-bold class)
      expect(actorName.parentElement).toHaveClass(/font-bold|font-semibold/i);
    });

    it('AC2.1: should render action description', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockTaskCreated} />);

      const actionDesc = screen.getByText(/stworzył\/a zadanie/i);
      expect(actionDesc).toBeInTheDocument();
    });

    it('AC2.1: should render task icon for task entity type', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockTaskCreated} />);

      const icon = screen.getByText('📋');
      expect(icon).toBeInTheDocument();
    });

    it('AC2.1: should render shopping icon for shopping entity type', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockShoppingCreated} />);

      const icon = screen.getByText('🛒');
      expect(icon).toBeInTheDocument();
    });

    it('AC2.1: should render reminder icon for reminder entity type', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockReminderSent} />);

      const icon = screen.getByText('🔔');
      expect(icon).toBeInTheDocument();
    });

    it('AC2.1: should render board icon for board entity type', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockBoardCreated} />);

      const icon = screen.getByText('📊');
      expect(icon).toBeInTheDocument();
    });

    it('AC2.1: should render relative timestamp in Polish', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      // Set created_at to 5 minutes ago for test
      const recentActivity = {
        ...mockTaskCreated,
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      };

      render(<ActivityItem activity={recentActivity} />);

      const timestamp = screen.getByText(/minut|minuty|minutę/i);
      expect(timestamp).toBeInTheDocument();
    });

    it('AC2.1: should render "5 minut temu" for recent activity', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      const fiveMinutesAgo = {
        ...mockTaskCreated,
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      };

      render(<ActivityItem activity={fiveMinutesAgo} />);

      expect(screen.getByText('5 minut temu')).toBeInTheDocument();
    });

    it('AC2.1: should render "1 godzinę temu" for 1 hour old activity', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      const oneHourAgo = {
        ...mockTaskCreated,
        created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      };

      render(<ActivityItem activity={oneHourAgo} />);

      expect(screen.getByText(/godz/i)).toBeInTheDocument();
    });

    it('AC2.1: should render "Wczoraj" for yesterday activity', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      const yesterday = {
        ...mockTaskCreated,
        created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      };

      render(<ActivityItem activity={yesterday} />);

      expect(screen.getByText(/Wczoraj/)).toBeInTheDocument();
    });

    it('AC2.1: should render "Wczoraj o HH:MM" for yesterday with time', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const yesterdayActivity = {
        ...mockTaskCreated,
        created_at: yesterday.toISOString(),
      };

      render(<ActivityItem activity={yesterdayActivity} />);

      const hour = yesterday.getHours().toString().padStart(2, '0');
      const minute = yesterday.getMinutes().toString().padStart(2, '0');
      expect(screen.getByText(new RegExp(`Wczoraj o ${hour}:${minute}`))).toBeInTheDocument();
    });
  });

  describe('AC2.2: Polish action descriptions', () => {
    it('AC2.2: should map task.created to "stworzył/a zadanie {title}"', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockTaskCreated} />);

      expect(screen.getByText(/stworzył\/a zadanie/)).toBeInTheDocument();
      expect(screen.getByText('Zrobić zakupy')).toBeInTheDocument();
    });

    it('AC2.2: should map task.updated to "zaktualizował/a zadanie {title}"', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      const taskUpdated = {
        ...mockTaskCreated,
        action: 'updated' as const,
      };

      render(<ActivityItem activity={taskUpdated} />);

      expect(screen.getByText(/zaktualizował\/a zadanie/)).toBeInTheDocument();
      expect(screen.getByText('Zrobić zakupy')).toBeInTheDocument();
    });

    it('AC2.2: should map task.completed to "ukończył/a zadanie {title}"', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockTaskCompleted} />);

      expect(screen.getByText(/ukończył\/a zadanie/)).toBeInTheDocument();
      expect(screen.getByText('Umyć naczynia')).toBeInTheDocument();
    });

    it('AC2.2: should map task.deleted to "usunął/ęła zadanie {title}"', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      const taskDeleted = {
        ...mockTaskCreated,
        action: 'deleted' as const,
      };

      render(<ActivityItem activity={taskDeleted} />);

      expect(screen.getByText(/usunął\/ęła zadanie/)).toBeInTheDocument();
      expect(screen.getByText('Zrobić zakupy')).toBeInTheDocument();
    });

    it('AC2.2: should map shopping.created to "dodał/a {count} produktów do listy zakupów"', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockShoppingCreated} />);

      expect(screen.getByText(/dodał\/a 3 produkty/)).toBeInTheDocument();
      expect(screen.getByText(/listy zakupów/)).toBeInTheDocument();
    });

    it('AC2.2: should map shopping.completed to "kupił/a {item}"', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockShoppingCompleted} />);

      expect(screen.getByText(/kupił\/a/)).toBeInTheDocument();
      expect(screen.getByText('Mleko')).toBeInTheDocument();
    });

    it('AC2.2: should map shopping.deleted to "usunął/ęła {item} z listy zakupów"', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      const shoppingDeleted = {
        ...mockShoppingCompleted,
        action: 'deleted' as const,
      };

      render(<ActivityItem activity={shoppingDeleted} />);

      expect(screen.getByText(/usunął\/ęła/)).toBeInTheDocument();
      expect(screen.getByText(/z listy zakupów/)).toBeInTheDocument();
    });

    it('AC2.2: should map reminder.sent to "wysłano przypomnienie: {task_title}"', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockReminderSent} />);

      expect(screen.getByText(/wysłano przypomnienie/)).toBeInTheDocument();
      expect(screen.getByText('Spotkanie z klientem')).toBeInTheDocument();
    });

    it('AC2.2: should map board.created to "stworzył/a tablicę {name}"', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockBoardCreated} />);

      expect(screen.getByText(/stworzył\/a tablicę/)).toBeInTheDocument();
      expect(screen.getByText('Projekt Dom')).toBeInTheDocument();
    });
  });

  describe('AC2.3: Responsive design', () => {
    it('AC2.3: touch targets should be at least 44px', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      const { container } = render(<ActivityItem activity={mockTaskCreated} />);

      // The container should be clickable/hoverable with min height
      const itemContainer = container.firstChild as HTMLElement;
      expect(itemContainer).toHaveClass(/min-h-\[44px\]|p-3/);
    });

    it('AC2.3: text should be text-sm on mobile', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      const { container } = render(<ActivityItem activity={mockTaskCreated} />);

      // Should have text-sm or responsive text classes
      const textElements = container.querySelectorAll('[class*="text-"]');
      const hasResponsiveText = Array.from(textElements).some(
        el => el.className.includes('text-sm') || el.className.includes('text-base')
      );
      expect(hasResponsiveText).toBe(true);
    });

    it('AC2.3: text should be text-base on desktop', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      const { container } = render(<ActivityItem activity={mockTaskCreated} />);

      // Should have md:text-base for desktop
      const textElements = container.querySelectorAll('[class*="text-"]');
      const hasDesktopText = Array.from(textElements).some(
        el => el.className.includes('md:text-base')
      );
      expect(hasDesktopText).toBe(true);
    });

    it('AC2.3: should have proper spacing between elements', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      const { container } = render(<ActivityItem activity={mockTaskCreated} />);

      // Should have gap or spacing classes
      const itemContainer = container.firstChild as HTMLElement;
      expect(itemContainer).toHaveClass(/gap-|space-|p-|m-/);
    });
  });

  describe('AC2.4: Metadata display', () => {
    it('AC2.4: should show board name badge for task metadata', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockTaskCreated} />);

      expect(screen.getByText('DOM')).toBeInTheDocument();
    });

    it('AC2.4: should show board type (DOM/PRACA) in badge', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockTaskCompleted} />);

      expect(screen.getByText('PRACA')).toBeInTheDocument();
    });

    it('AC2.4: should show item names for shopping metadata (max 3)', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockShoppingCreated} />);

      expect(screen.getByText('Mleko')).toBeInTheDocument();
      expect(screen.getByText('Chleb')).toBeInTheDocument();
      expect(screen.getByText('Jajka')).toBeInTheDocument();
    });

    it('AC2.4: should show "+X więcej" when more than 3 items', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      const manyItems = {
        ...mockShoppingCreated,
        metadata: {
          count: 5,
          items: ['Mleko', 'Chleb', 'Jajka', 'Masło', 'Ser'],
        },
      };

      render(<ActivityItem activity={manyItems} />);

      // Should show +2 more (5 - 3 = 2)
      expect(screen.getByText(/\+2 więcej/)).toBeInTheDocument();
    });

    it('AC2.4: should show delivery method icon for reminder metadata', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      render(<ActivityItem activity={mockReminderSent} />);

      // Email icon 📧
      expect(screen.getByText('📧')).toBeInTheDocument();
    });

    it('AC2.4: should show WhatsApp icon for WhatsApp delivery', async () => {
      const { ActivityItem } = await import('@/components/activity/ActivityItem');

      const whatsappReminder = {
        ...mockReminderSent,
        metadata: {
          task_title: 'Przypomnienie',
          delivery_method: 'whatsapp',
        },
      };

      render(<ActivityItem activity={whatsappReminder} />);

      // WhatsApp icon 💬
      expect(screen.getByText('💬')).toBeInTheDocument();
    });
  });
});
