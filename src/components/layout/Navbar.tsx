import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Briefcase,
  ShoppingBag,
  FileText,
  Wallet,
  User,
  LogOut,
  Plus,
  Shield,
  MessageCircle,
  Trophy, // <-- Added Trophy icon
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ADMIN_EMAIL = 'unigig60@gmail.com';

// Added Leaderboard to the navigation links
const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/gigs', label: 'Browse Gigs', icon: Briefcase },
  { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { href: '/proposals', label: 'My Proposals', icon: FileText },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy }, // <-- Added link here
];

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const formatBalance = (kobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(kobo / 100);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (location.pathname === '/' || location.pathname === '/auth' || location.pathname === '/verify-email' || location.pathname === '/reset-password') {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">N</span>
            </div>
            <span className="font-bold text-lg text-foreground hidden sm:block">Nexora</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {user && profile ? (
              <>
                {/* Wallet Balance - desktop only */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{formatBalance(profile.wallet_balance)}</span>
                </div>

                {/* Post Gig Button - desktop only */}
                <Button size="sm" onClick={() => navigate('/post-gig')} className="hidden sm:flex">
                  <Plus className="h-4 w-4 mr-1" />
                  Post Gig
                </Button>

                {/* Messages - desktop only */}
                <Button variant="ghost" size="icon" onClick={() => navigate('/messages')} className="relative hidden md:flex">
                  <MessageCircle className="h-5 w-5" />
                </Button>

                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {profile.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="flex items-center gap-2 p-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>{profile.full_name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{profile.full_name || 'User'}</span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <LayoutDashboard className="h-4 w-4 mr-2" />Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/messages')}>
                      <MessageCircle className="h-4 w-4 mr-2" />Messages
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="h-4 w-4 mr-2" />Profile
                    </DropdownMenuItem>
                    {profile.email === ADMIN_EMAIL && (
                      <>
                        <DropdownMenuItem onClick={() => navigate('/admin')}>
                          <Shield className="h-4 w-4 mr-2" />Admin Dashboard
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => navigate('/auth')} className="min-h-[44px]">Sign In</Button>
                <Button onClick={() => navigate('/auth')} className="min-h-[44px]">Get Started</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
