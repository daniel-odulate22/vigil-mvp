import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import DoseTimeline from '@/components/DoseTimeline';

const SchedulePage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const navigateWeek = (direction: 'prev' | 'next') => {
    setWeekStart(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
  };

  const handleDaySelect = (day: Date) => {
    setSelectedDate(day);
  };

  return (
    <div className="pb-24 pt-4 px-4">
      {/* Header */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <CalendarClock className="w-5 h-5 text-secondary" />
          <p className="text-muted-foreground text-sm">Medication Schedule</p>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Weekly Schedule
        </h1>
      </motion.div>

      {/* Weekly Calendar Strip */}
      <motion.div
        className="bg-card rounded-2xl border border-border p-4 mb-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        {/* Month & navigation */}
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-foreground">
            {format(weekStart, 'MMMM yyyy')}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateWeek('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Day pills */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isDayToday = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDaySelect(day)}
                className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-secondary text-secondary-foreground shadow-md'
                    : isDayToday
                    ? 'bg-secondary/10 text-secondary'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <span className="text-[10px] font-medium uppercase">
                  {format(day, 'EEE')}
                </span>
                <span className={`text-lg font-semibold mt-0.5 ${
                  isSelected ? 'text-secondary-foreground' : isDayToday ? 'text-secondary' : 'text-foreground'
                }`}>
                  {format(day, 'd')}
                </span>
                {isDayToday && !isSelected && (
                  <div className="w-1 h-1 rounded-full bg-secondary mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Today shortcut */}
        {!weekDays.some(d => isToday(d)) && (
          <Button
            variant="link"
            size="sm"
            className="w-full mt-2 text-xs text-secondary"
            onClick={() => {
              const now = new Date();
              setWeekStart(startOfWeek(now, { weekStartsOn: 0 }));
              setSelectedDate(now);
            }}
          >
            Go to today
          </Button>
        )}
      </motion.div>

      {/* Selected day label */}
      <motion.div
        className="mb-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <p className="text-sm text-muted-foreground">
          {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMMM d')}
        </p>
      </motion.div>

      {/* Timeline Component */}
      <DoseTimeline selectedDate={selectedDate} />
    </div>
  );
};

export default SchedulePage;
