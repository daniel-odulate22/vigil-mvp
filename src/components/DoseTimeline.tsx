import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, Pill, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfDay, endOfDay, isBefore } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface Reminder {
  id: string;
  prescription_id: string;
  reminder_time: string;
  days_of_week: number[];
  is_enabled: boolean;
}

interface Prescription {
  id: string;
  medication_name: string;
  dosage: string | null;
  is_active: boolean;
}

interface DoseLog {
  id: string;
  medication_name: string;
  taken_at: string;
  prescription_id: string | null;
}

interface ScheduledDose {
  id: string;
  prescriptionId: string;
  medicationName: string;
  dosage: string | null;
  scheduledTime: Date;
  status: 'taken' | 'missed' | 'upcoming';
  doseLogId?: string;
}

interface DoseTimelineProps {
  selectedDate?: Date;
}

const DoseTimeline = ({ selectedDate }: DoseTimelineProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const currentDate = selectedDate || new Date();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doseLogs, setDoseLogs] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingDose, setLoggingDose] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const rangeStart = startOfDay(currentDate);
        const rangeEnd = endOfDay(currentDate);

        const [prescriptionsRes, remindersRes, doseLogsRes] = await Promise.all([
          supabase.from('prescriptions').select('id, medication_name, dosage, is_active').eq('user_id', user.id).eq('is_active', true),
          supabase.from('medication_reminders').select('*').eq('user_id', user.id).eq('is_enabled', true),
          supabase.from('dose_logs').select('id, medication_name, taken_at, prescription_id').eq('user_id', user.id).gte('taken_at', rangeStart.toISOString()).lte('taken_at', rangeEnd.toISOString()),
        ]);

        setPrescriptions(prescriptionsRes.data || []);
        setReminders(remindersRes.data || []);
        setDoseLogs(doseLogsRes.data || []);
      } catch (err) {
        console.error('Error fetching schedule data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, currentDate]);

  const scheduledDoses = useMemo(() => {
    const doses: ScheduledDose[] = [];
    const now = new Date();
    const dayOfWeek = currentDate.getDay();

    reminders.forEach(reminder => {
      if (!reminder.days_of_week.includes(dayOfWeek)) return;

      const prescription = prescriptions.find(p => p.id === reminder.prescription_id);
      if (!prescription) return;

      const [hours, minutes] = reminder.reminder_time.split(':').map(Number);
      const scheduledTime = new Date(currentDate);
      scheduledTime.setHours(hours, minutes, 0, 0);

      const matchingDose = doseLogs.find(log => {
        const logTime = new Date(log.taken_at);
        const timeDiff = Math.abs(logTime.getTime() - scheduledTime.getTime());
        const twoHoursMs = 2 * 60 * 60 * 1000;
        return (
          (log.prescription_id === prescription.id ||
           log.medication_name.toLowerCase() === prescription.medication_name.toLowerCase()) &&
          timeDiff <= twoHoursMs
        );
      });

      let status: 'taken' | 'missed' | 'upcoming';
      if (matchingDose) {
        status = 'taken';
      } else if (isBefore(scheduledTime, now)) {
        status = 'missed';
      } else {
        status = 'upcoming';
      }

      doses.push({
        id: `${reminder.id}-${format(currentDate, 'yyyy-MM-dd')}`,
        prescriptionId: prescription.id,
        medicationName: prescription.medication_name,
        dosage: prescription.dosage,
        scheduledTime,
        status,
        doseLogId: matchingDose?.id,
      });
    });

    return doses.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
  }, [reminders, prescriptions, doseLogs, currentDate]);

  const stats = useMemo(() => {
    const taken = scheduledDoses.filter(d => d.status === 'taken').length;
    const missed = scheduledDoses.filter(d => d.status === 'missed').length;
    const upcoming = scheduledDoses.filter(d => d.status === 'upcoming').length;
    const total = taken + missed;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 100;
    return { taken, missed, upcoming, adherenceRate };
  }, [scheduledDoses]);

  const handleQuickLog = useCallback(async (dose: ScheduledDose) => {
    if (!user) return;
    setLoggingDose(dose.id);
    try {
      const { error } = await supabase.from('dose_logs').insert({
        user_id: user.id,
        prescription_id: dose.prescriptionId,
        medication_name: dose.medicationName,
        taken_at: new Date().toISOString(),
        verified: false,
        notes: `Quick-logged from schedule (originally scheduled for ${format(dose.scheduledTime, 'h:mm a')})`,
      });
      if (error) throw error;

      setDoseLogs(prev => [...prev, {
        id: crypto.randomUUID(),
        medication_name: dose.medicationName,
        taken_at: new Date().toISOString(),
        prescription_id: dose.prescriptionId,
      }]);

      toast({ title: 'Dose logged', description: `${dose.medicationName} marked as taken.` });
    } catch (err) {
      console.error('Error logging dose:', err);
      toast({ title: 'Error', description: 'Failed to log dose.', variant: 'destructive' });
    } finally {
      setLoggingDose(null);
    }
  }, [user, toast]);

  const getStatusIcon = (status: 'taken' | 'missed' | 'upcoming') => {
    switch (status) {
      case 'taken': return <Check className="w-4 h-4" />;
      case 'missed': return <X className="w-4 h-4" />;
      case 'upcoming': return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusStyles = (status: 'taken' | 'missed' | 'upcoming') => {
    switch (status) {
      case 'taken': return 'bg-primary/10 text-primary border-primary/20';
      case 'missed': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'upcoming': return 'bg-secondary/10 text-secondary border-secondary/20';
    }
  };

  const getStatusBadge = (status: 'taken' | 'missed' | 'upcoming') => {
    switch (status) {
      case 'taken': return 'bg-primary text-primary-foreground';
      case 'missed': return 'bg-destructive text-destructive-foreground';
      case 'upcoming': return 'bg-secondary text-secondary-foreground';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (scheduledDoses.length === 0) {
    return (
      <motion.div
        className="bg-card rounded-xl p-6 border border-border text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="w-12 h-12 mx-auto mb-3 bg-secondary/15 rounded-full flex items-center justify-center">
          <Pill className="w-6 h-6 text-secondary" />
        </div>
        <p className="text-muted-foreground text-sm mb-2">
          No scheduled doses for this day
        </p>
        <p className="text-xs text-muted-foreground">
          Add reminders to your prescriptions to see your schedule here.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-primary/10 rounded-xl p-3 text-center border border-primary/20">
          <p className="text-2xl font-bold text-primary">{stats.taken}</p>
          <p className="text-xs text-muted-foreground">Taken</p>
        </div>
        <div className="bg-destructive/10 rounded-xl p-3 text-center border border-destructive/20">
          <p className="text-2xl font-bold text-destructive">{stats.missed}</p>
          <p className="text-xs text-muted-foreground">Missed</p>
        </div>
        <div className="bg-secondary/10 rounded-xl p-3 text-center border border-secondary/20">
          <p className="text-2xl font-bold text-secondary">{stats.upcoming}</p>
          <p className="text-xs text-muted-foreground">Upcoming</p>
        </div>
      </div>

      {/* Adherence bar */}
      {stats.taken + stats.missed > 0 && (
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Adherence Rate</span>
            <span className="text-sm font-semibold text-foreground">{stats.adherenceRate}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-secondary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${stats.adherenceRate}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Dose cards */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {scheduledDoses.map((dose, index) => (
            <motion.div
              key={dose.id}
              className={`flex items-center gap-3 p-3 rounded-xl border ${getStatusStyles(dose.status)}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusBadge(dose.status)}`}>
                {getStatusIcon(dose.status)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{dose.medicationName}</p>
                <p className="text-xs text-muted-foreground">
                  {format(dose.scheduledTime, 'h:mm a')}
                  {dose.dosage && ` • ${dose.dosage}`}
                </p>
              </div>
              {dose.status === 'missed' ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs border-destructive/50 hover:bg-destructive/10"
                  onClick={() => handleQuickLog(dose)}
                  disabled={loggingDose === dose.id}
                >
                  {loggingDose === dose.id ? (
                    <motion.div
                      className="w-3 h-3 border-2 border-current border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  Log Now
                </Button>
              ) : (
                <span className={`text-xs px-2 py-1 rounded-full uppercase font-medium ${getStatusBadge(dose.status)}`}>
                  {dose.status}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DoseTimeline;
