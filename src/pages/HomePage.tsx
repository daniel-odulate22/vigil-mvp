import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Pill, Clock, TrendingUp, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import AdherenceCalendar from '@/components/AdherenceCalendar';

interface DashboardStats {
  todayDoses: number;
  weekStreak: number;
  activeMeds: number;
  lastDose: string | null;
}

const HomePage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({ todayDoses: 0, weekStreak: 0, activeMeds: 0, lastDose: null });
  const [recentDoses, setRecentDoses] = useState<any[]>([]);
  const [nextMed, setNextMed] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Get profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single();
        
        setDisplayName(profile?.display_name || user.email?.split('@')[0] || 'there');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [dosesResult, medsResult, lastResult, recentResult] = await Promise.all([
          supabase.from('dose_logs').select('*').eq('user_id', user.id).gte('taken_at', today.toISOString()),
          supabase.from('prescriptions').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true),
          supabase.from('dose_logs').select('taken_at, medication_name').eq('user_id', user.id).order('taken_at', { ascending: false }).limit(1).single(),
          supabase.from('dose_logs').select('*').eq('user_id', user.id).order('taken_at', { ascending: false }).limit(5),
        ]);

        // Get next medication from active prescriptions
        const { data: activeMeds } = await supabase
          .from('prescriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1);

        if (activeMeds && activeMeds.length > 0) {
          setNextMed(activeMeds[0]);
        }

        setStats({
          todayDoses: dosesResult.data?.length || 0,
          weekStreak: Math.min(dosesResult.data?.length || 0, 7),
          activeMeds: medsResult.count || 0,
          lastDose: lastResult.data?.taken_at || null,
        });
        setRecentDoses(recentResult.data || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="pb-24 pt-6 px-4">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <p className="text-muted-foreground text-sm">{getGreeting()}</p>
          <h1 className="text-2xl font-semibold text-foreground">{displayName}</h1>
        </div>
        <button className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </button>
      </motion.div>

      {/* Next Medicine Card */}
      {nextMed && (
        <motion.div
          className="bg-card rounded-2xl p-5 border border-border mb-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Next Medicine</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">{nextMed.medication_name}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {nextMed.dosage || 'As prescribed'} • {nextMed.frequency || 'Daily'}
          </p>
          <Button className="w-full h-11">
            <Pill className="w-4 h-4 mr-2" />
            I have taken this
          </Button>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { icon: Calendar, value: stats.todayDoses, label: 'Doses today', delay: 0.15 },
          { icon: TrendingUp, value: stats.weekStreak, label: 'Day streak', delay: 0.2 },
          { icon: Pill, value: stats.activeMeds, label: 'Active meds', delay: 0.25 },
          { icon: Clock, value: stats.lastDose ? formatTime(stats.lastDose) : '--', label: 'Last dose', delay: 0.3 },
        ].map((stat, i) => (
          <motion.div
            key={i}
            className="bg-card rounded-xl p-4 border border-border"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: stat.delay }}
          >
            <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center mb-2">
              <stat.icon className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xl font-semibold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Adherence Calendar */}
      <div className="mb-6">
        <AdherenceCalendar />
      </div>

      {/* Recent Activity */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <h2 className="text-base font-semibold text-foreground mb-3">Recent Activity</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl p-4 border border-border animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : recentDoses.length === 0 ? (
          <div className="bg-card rounded-xl p-6 border border-border text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-primary/15 rounded-full flex items-center justify-center">
              <Pill className="w-6 h-6 text-primary" />
            </div>
            <p className="text-muted-foreground text-sm">No doses logged yet. Scan a medication to get started!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentDoses.map((dose, index) => (
              <motion.div
                key={dose.id}
                className="bg-card rounded-xl p-4 border border-border flex items-center justify-between"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + index * 0.05 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center">
                    <Pill className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{dose.medication_name}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(dose.taken_at)}</p>
                  </div>
                </div>
                {dose.verified && (
                  <span className="text-xs bg-primary/15 text-primary px-2 py-1 rounded-full">Verified</span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default HomePage;
