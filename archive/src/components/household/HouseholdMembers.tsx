/**
 * HouseholdMembers Component
 * Displays list of current household members
 */

'use client';

import { useHouseholdMembers } from '@/lib/hooks/useHouseholdMembers';

export function HouseholdMembers() {
  const { data: members, isLoading, error } = useHouseholdMembers();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Members</h3>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Members</h3>
        <p className="text-red-500">Failed to load members</p>
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Members</h3>
        <p className="text-gray-500">No members found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Members</h3>
      <ul className="space-y-2">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <p className="font-medium">{member.display_name}</p>
              <p className="text-sm text-gray-500">{member.user_id}</p>
            </div>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
              {member.role}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
