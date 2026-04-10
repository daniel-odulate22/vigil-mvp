import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pill, Check, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ActiveReminder {
  reminderId: string;
  prescriptionId: string;
  medicationName: string;
  dosage: string | null;
  scheduledTime: string;
}

const ReminderAlert = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeReminder, setActiveReminder] = useState<ActiveReminder | null>(null);
  const [logging, setLogging] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const checkReminders = useCallback(async () => {
    if (!user) return;

    try {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Fetch enabled reminders for today
      const { data: reminders } = await supabase
        .from('medication_reminders')
        .select('id, prescription_id, reminder_time, days_of_week')
        .eq('user_id', user.id)
        .eq('is_enabled', true);

      if (!reminders || reminders.length === 0) return;

      // Find reminders that match current time (within 1-minute window)
      for (const reminder of reminders) {
        if (!reminder.days_of_week.includes(currentDay)) continue;

        const [rH, rM] = reminder.reminder_time.split(':').map(Number);
        const diffMinutes = (now.getHours() * 60 + now.getMinutes()) - (rH * 60 + rM);

        // Trigger if within 0-5 minute window after scheduled time
        if (diffMinutes < 0 || diffMinutes > 5) continue;

        const key = `${reminder.id}-${now.toDateString()}`;
        if (dismissedIds.has(key)) continue;

        // Check if already logged today for this reminder
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const { data: logs } = await supabase
          .from('dose_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('prescription_id', reminder.prescription_id)
          .gte('taken_at', todayStart.toISOString())
          .limit(1);

        if (logs && logs.length > 0) continue;

        // Get prescription details
        const { data: prescription } = await supabase
          .from('prescriptions')
          .select('medication_name, dosage')
          .eq('id', reminder.prescription_id)
          .single();

        if (!prescription) continue;

        setActiveReminder({
          reminderId: reminder.id,
          prescriptionId: reminder.prescription_id!,
          medicationName: prescription.medication_name,
          dosage: prescription.dosage,
          scheduledTime: reminder.reminder_time,
        });
        return;
      }
    } catch (err) {
      console.error('Error checking reminders:', err);
    }
  }, [user, dismissedIds]);

  useEffect(() => {
    if (!user) return;
    checkReminders();
    const interval = setInterval(checkReminders, 30_000); // check every 30s
    return () => clearInterval(interval);
  }, [user, checkReminders]);

  const handleTakeDose = async () => {
    if (!activeReminder || !user) return;
    setLogging(true);
    try {
      const { error } = await supabase.from('dose_logs').insert({
        user_id: user.id,
        prescription_id: activeReminder.prescriptionId,
        medication_name: activeReminder.medicationName,
        taken_at: new Date().toISOString(),
        verified: false,
        notes: `Logged from reminder alert`,
      });
      if (error) throw error;
      toast({ title: 'Dose logged ✓', description: `${activeReminder.medicationName} marked as taken.` });
      dismiss();
    } catch (err) {
      console.error('Error logging dose:', err);
      toast({ title: 'Error', description: 'Failed to log dose.', variant: 'destructive' });
    } finally {
      setLogging(false);
    }
  };

  const dismiss = () => {
    if (activeReminder) {
      const key = `${activeReminder.reminderId}-${new Date().toDateString()}`;
      setDismissedIds(prev => new Set(prev).add(key));
    }
    setActiveReminder(null);
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      {activeReminder && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary px-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dismiss button */}
          <button
            onClick={dismiss}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-primary-foreground" />
          </button>

          {/* Pulsing pill icon */}
          <motion.div
            className="w-24 h-24 rounded-full bg-primary-foreground/20 flex items-center justify-center mb-8"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Pill className="w-12 h-12 text-primary-foreground" />
          </motion.div>

          {/* Content */}
          <motion.p
            className="text-primary-foreground/70 text-sm font-medium uppercase tracking-widest mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Time to take your medication
          </motion.p>

          <motion.h1
            className="text-3xl font-bold text-primary-foreground text-center mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {activeReminder.medicationName}
          </motion.h1>

          {activeReminder.dosage && (
            <motion.p
              className="text-primary-foreground/80 text-lg mb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {activeReminder.dosage}
            </motion.p>
          )}

          <motion.div
            className="flex items-center gap-1.5 text-primary-foreground/60 text-sm mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Scheduled for {formatTime(activeReminder.scheduledTime)}</span>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            className="w-full max-w-xs space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              className="w-full h-14 text-lg font-semibold bg-primary-foreground text-primary hover:bg-primary-foreground/90 rounded-2xl"
              onClick={handleTakeDose}
              disabled={logging}
            >
              {logging ? (
                <motion.div
                  className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  I have taken this
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              className="w-full h-12 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-2xl"
              onClick={dismiss}
            >
              Dismiss
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReminderAlert;
