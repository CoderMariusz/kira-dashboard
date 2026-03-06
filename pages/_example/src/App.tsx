import { useAuth } from '@shared/hooks/useAuth';
import { cn } from '@shared/lib/cn';

export default function App() {
  const { user, loading } = useAuth();
  return (
    <div className={cn('min-h-screen bg-gray-900 text-white p-8')}>
      <h1 className="text-3xl font-bold text-indigo-400">Hello KiraBoard 🦊</h1>
      {loading ? <p>Loading...</p> : (
        <p className="mt-4 text-gray-300">
          {user ? `Welcome, ${user.name} (${user.role})` : 'Not authenticated'}
        </p>
      )}
    </div>
  );
}
