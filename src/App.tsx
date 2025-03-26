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
import { HomeDataProvider } from './components/HomeDataProvider';
import { useAuth } from './hooks/useAuth';

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
        className="fixed top-4 right-4 z-50 p-3 rounded-lg bg-black/20 backdrop-blur-sm border border-white/10 lg:hidden hover:bg-white/5 transition-all"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Navigation Sidebar */}
      <nav 
        className={`
          fixed top-0 left-0 h-full bg-black/50 backdrop-blur-xl border-r border-white/10
          transition-all duration-300 ease-in-out z-40
          ${isMobileMenuOpen 
            ? 'w-64 translate-x-0' 
            : 'w-0 -translate-x-full lg:w-16 lg:translate-x-0 lg:hover:w-64'
          }
          group overflow-hidden
        `}
      >
        {/* Logo and Navigation Container */}
        <div className={`
          h-full flex flex-col min-w-[64px]
          ${isMobileMenuOpen ? 'w-64' : 'w-16 lg:group-hover:w-64'}
          transition-all duration-300
        `}>
          {/* Logo */}
          <div className="h-16 border-b border-white/10 flex items-center px-4">
            <div className="flex items-center gap-3">
              <Vote className={`
                w-6 h-6 text-purple-400
                ${!isMobileMenuOpen && 'hidden lg:block'}
              `} />
              <span className={`
                text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent
                whitespace-nowrap overflow-hidden transition-all duration-300
                ${isMobileMenuOpen ? 'w-auto opacity-100' : 'w-0 opacity-0 lg:group-hover:w-auto lg:group-hover:opacity-100'}
              `}>
                BlockVote
              </span>
            </div>
            {isMobileMenuOpen && (
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="ml-auto p-2 rounded-lg hover:bg-white/5 lg:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Nav Items */}
          <div className="py-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 py-2.5 px-4 relative
                  transition-colors
                  ${currentTab === item.id ? 'bg-white/10' : 'hover:bg-white/5'}
                  ${!isMobileMenuOpen && 'hidden lg:flex'}
                `}
              >
                <div className="min-w-[20px] flex justify-center">
                  <item.icon className="w-5 h-5 text-purple-400" />
                </div>
                <span className={`
                  text-sm whitespace-nowrap overflow-hidden transition-all duration-300
                  ${isMobileMenuOpen ? 'w-auto opacity-100' : 'w-0 lg:group-hover:w-auto lg:group-hover:opacity-100 opacity-0'}
                `}>
                  {item.label}
                </span>
                {currentTab === item.id && (
                  <div className="absolute left-0 top-0 h-full w-0.5 bg-purple-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[-1] lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </nav>

      {/* Main Content */}
      <main className={`
        relative z-10 transition-all duration-300
        ${isMobileMenuOpen ? 'pl-0' : 'pl-0 lg:pl-16'}
      `}>
        {renderContent()}
      </main>
    </div>
  );
}

function App() {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <HomeDataProvider>
          <AppContent />
        </HomeDataProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}

export default App;