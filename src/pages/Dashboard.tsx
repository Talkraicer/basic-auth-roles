import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold">Dashboard</h2>
            <p className="text-muted-foreground mt-2">
              Welcome back, {user?.username}!
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-2">Your Role</h3>
              <p className="text-2xl font-bold capitalize">{user?.role}</p>
            </div>
            
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-2">User ID</h3>
              <p className="text-sm text-muted-foreground font-mono break-all">
                {user?.id}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
