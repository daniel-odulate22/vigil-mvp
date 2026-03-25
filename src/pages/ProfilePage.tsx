import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Bell, Shield, ChevronRight, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
}

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        setProfile(data);

        if ('Notification' in window) {
          setNotificationsEnabled(Notification.permission === 'granted');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out', description: 'You have been signed out successfully.' });
  };

  const handleNotificationToggle = async () => {
    if (!('Notification' in window)) {
      toast({ title: 'Not supported', description: 'Notifications are not supported in this browser.', variant: 'destructive' });
      return;
    }
    if (Notification.permission === 'denied') {
      toast({ title: 'Notifications blocked', description: 'Please enable notifications in your browser settings.', variant: 'destructive' });
      return;
    }
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      if (permission === 'granted') {
        toast({ title: 'Notifications enabled', description: "You'll receive medication reminders." });
      }
    }
  };

  const getDisplayName = () => {
    if (profile?.display_name) return profile.display_name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getInitial = () => getDisplayName().charAt(0).toUpperCase();

  return (
    <div className="pb-24 pt-6 px-4">
      {/* Profile Header */}
      <motion.div
        className="flex items-center gap-4 mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-primary-foreground">{getInitial()}</span>
          )}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{getDisplayName()}</h1>
          <p className="text-muted-foreground text-sm">{user?.email}</p>
        </div>
      </motion.div>

      {/* Settings */}
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Notifications</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Medication reminders</p>
                </div>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationToggle} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Account</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Email</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Privacy</p>
                  <p className="text-xs text-muted-foreground">Your data is encrypted</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </motion.div>
      </div>

      {/* App Info */}
      <motion.div className="mt-8 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <p className="text-xs text-muted-foreground">Vigil v1.0.0</p>
        <p className="text-xs text-muted-foreground">Always watching over your health</p>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
