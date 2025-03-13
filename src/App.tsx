import React, { useState, useEffect } from 'react';
import { 
  Home, Vote, UserCheck, BarChart3, Search, 
  Brain, Users, Wallet, Menu, X, Shield, FileSearch 
} from 'lucide-react';
import { SparklesCore } from './components/ui/sparkles';
import { WagmiConfig } from 'wagmi';
import { useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './lib/wagmi';

// Components
import Hero from './components/Hero';
import Registration from './components/Registration';
import VotingDashboard from './components/VotingDashboard';
import LiveVoting from './components/LiveVoting';
import Results from './components/Results';
import AuditHub from './components/AuditHub';
import ElectionInsights from './components/ElectionInsights';
import Community from './components/Community';
import AdminDashboard from './components/AdminDashboard';
import { useElectionContract } from './hooks/useElectionContract';

// Create a client
const queryClient = new QueryClient();

function AppContent() {
  const [currentTab, setCurrentTab] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { address, isConnected } = useAccount();
  const { isAdmin: checkIsAdmin } = useElectionContract();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isConnected && address) {
        try {
          const adminStatus = await checkIsAdmin(address);
          setIsAdmin(adminStatus);
        } catch (err) {
          console.error('Error checking admin status:', err);
          setIsAdmin(false);
        }
      }
    };

    checkAdminStatus();
  }, [address, isConnected, checkIsAdmin]);

  const handleNavigate = (page: string) => {
    setCurrentTab(page);
    setIsMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch(currentTab) {
      case 'home':
        return <Hero onNavigate={handleNavigate} />;
      case 'registration':
        return <Registration />;
      case 'voting':
        return <VotingDashboard />;
      case 'live':
        return <LiveVoting />;
      case 'results':
        return <Results />;
      case 'audit':
        return <AuditHub />;
      case 'insights':
        return <ElectionInsights />;
      case 'community':
        return <Community />;
      case 'admin':
        return isAdmin ? <AdminDashboard /> : <div className="p-8 text-center">Access Denied</div>;
      default:
        return <Hero onNavigate={handleNavigate} />;
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'registration', label: 'Registration', icon: UserCheck },
    { id: 'voting', label: 'Voting Dashboard', icon: Vote },
    { id: 'live', label: 'Live Voting', icon: BarChart3 },
    { id: 'results', label: 'Results', icon: BarChart3 },
    { id: 'audit', label: 'Audit Hub', icon: Search },
    { id: 'insights', label: 'Election Insights', icon: Brain },
    { id: 'community', label: 'Community', icon: Users },
  ];

  // Add admin route if user is admin
  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin Dashboard', icon: Shield });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white relative overflow-hidden">
      {/* Particles Background */}
      <div className="absolute inset-0 w-full h-full">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor="rgba(255, 255, 255, 0.8)"
          speed={1}
        />
      </div>

      {/* Mobile Menu Button - only visible on mobile */}
      <button 
        className="fixed top-4 left-4 z-50 p-2 rounded-full bg-purple-800/50 backdrop-blur-sm lg:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Navigation Sidebar */}
      <nav 
        className={`
          fixed top-0 left-0 h-full w-12 hover:w-48 bg-black/50 backdrop-blur-xl border-r border-white/10
          transform transition-all duration-300 ease-in-out z-40
          ${isMobileMenuOpen ? 'translate-x-0 w-48' : '-translate-x-0'}
          lg:translate-x-0
          group
        `}
      >
        {/* Logo */}
        <div className="flex items-center h-12 px-3 border-b border-white/10 overflow-hidden">
          <Vote className="w-6 h-6 text-purple-400 min-w-[1.5rem]" />
          <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent ml-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            BlockVote
          </span>
        </div>

        {/* Nav Items */}
        <div className="py-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`
                w-full flex items-center px-3 py-2 text-left
                hover:bg-white/5 transition-colors relative
                ${currentTab === item.id ? 'bg-white/10' : ''}
                group/item
              `}
            >
              <div className="flex items-center">
                <item.icon size={16} className="text-purple-400 min-w-[1rem]" />
                <span className="ml-2 text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {item.label}
                </span>
              </div>
              {currentTab === item.id && (
                <div className="absolute left-0 top-0 h-full w-0.5 bg-purple-400" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content - pushed right when sidebar expands */}
      <main className="relative z-10 transition-all duration-300 lg:pl-12 lg:group-hover/nav:pl-48">
        {renderContent()}
      </main>
    </div>
  );
}

function App() {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </WagmiConfig>
  );
}

export default App;