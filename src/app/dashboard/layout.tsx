import Sidebar from '../../components/Sidebar';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
} 