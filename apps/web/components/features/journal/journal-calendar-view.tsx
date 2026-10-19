"use client";

import { useState, useMemo } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isAfter,
  startOfDay,
} from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Smile,
  Calendar as CalendarIcon,
  Sparkles,
  BookOpen,
} from "lucide-react";
import {
  JournalDayDialog,
  JournalEntry,
} from "@/components/features/journal/journal-day-dialog";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Mood color mapping for dots and mini badges
const MOOD_COLORS: Record<
  string,
  { dot: string; bg: string; text: string; border: string }
> = {
  Happy: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
  Calm: {
    dot: "bg-teal-500",
    bg: "bg-teal-500/10",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-teal-500/20",
  },
  Grateful: {
    dot: "bg-amber-500",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
  },
  Normal: {
    dot: "bg-blue-500",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
  },
  Worried: {
    dot: "bg-orange-500",
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500/20",
  },
  Stressed: {
    dot: "bg-rose-500",
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/20",
  },
  Sad: {
    dot: "bg-indigo-500",
    bg: "bg-indigo-500/10",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/20",
  },
  Anxious: {
    dot: "bg-amber-600",
    bg: "bg-amber-600/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-600/20",
  },
  Angry: {
    dot: "bg-red-500",
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/20",
  },
};

function getMoodStyle(mood: string | null) {
  if (!mood || !MOOD_COLORS[mood]) {
    return {
      dot: "bg-primary",
      bg: "bg-primary/10",
      text: "text-primary",
      border: "border-primary/20",
    };
  }
  return MOOD_COLORS[mood];
}

export function JournalCalendarView() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // TanStack Query for remote entries
  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["journal", "entries"],
    queryFn: () => apiFetch<JournalEntry[]>("/journals"),
  });

  // Group entries by 'yyyy-MM-dd'
  const entriesByDate = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const entry of entries) {
      const dateStr = entry.entryDate || entry.createdAt;
      const key = format(new Date(dateStr), "yyyy-MM-dd");
      const list = map.get(key) || [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [entries]);

  // Calendar dates generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const daysInCalendar = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const today = startOfDay(new Date());

  // Statistics for current month
  const currentMonthEntries = useMemo(() => {
    return entries.filter((e) => {
      const d = new Date(e.entryDate || e.createdAt);
      return isSameMonth(d, currentMonth);
    });
  }, [entries, currentMonth]);

  const daysWithEntriesCount = useMemo(() => {
    const uniqueDays = new Set(
      currentMonthEntries.map((e) =>
        format(new Date(e.entryDate || e.createdAt), "yyyy-MM-dd")
      )
    );
    return uniqueDays.size;
  }, [currentMonthEntries]);

  // Handlers
  const handlePrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const handleTodayJump = () => {
    setCurrentMonth(new Date());
    handleSelectDate(new Date());
  };

  const handleSelectDate = (date: Date) => {
    const dateStart = startOfDay(date);
    if (isAfter(dateStart, today)) {
      // Future dates are disabled
      return;
    }
    setSelectedDate(date);
    setIsDialogOpen(true);
  };

  const selectedDateEntries = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return entriesByDate.get(key) || [];
  }, [selectedDate, entriesByDate]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Reflective Daily Journal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            A private space for self-reflection with instant sentiment
            recognition & calendar timeline tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleSelectDate(new Date())}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Journal for Today
          </Button>
        </div>
      </div>

      {/* Monthly Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-card/70 border-border/70">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Reflections This Month
              </p>
              <p className="text-xl font-bold text-foreground">
                {currentMonthEntries.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/70">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Days Journaled
              </p>
              <p className="text-xl font-bold text-foreground">
                {daysWithEntriesCount} days
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/70">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                AI Sentiment Logged
              </p>
              <p className="text-xl font-bold text-foreground">
                {entries.filter((e) => e.aiSentiment).length} insights
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Calendar Card */}
      <Card className="border-border shadow-md">
        {/* Calendar Navigation Bar */}
        <CardHeader className="p-4 sm:p-6 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1 border border-border/50">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-foreground"
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-medium px-3 text-foreground"
                  onClick={handleTodayJump}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-foreground"
                  onClick={handleNextMonth}
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <CardTitle className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
            </div>

            {/* Mood Indicator Legend */}
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                Mood Guide:
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Happy / Calm
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                Normal
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                Worried
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                Stressed / Sad
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-6">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center mb-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground py-1.5"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="min-h-[90px] sm:min-h-[110px] rounded-xl border border-border/40 bg-muted/20 animate-pulse p-2"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {daysInCalendar.map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const dayEntries = entriesByDate.get(dayKey) || [];
                const inCurrentMonth = isSameMonth(day, currentMonth);
                const dayIsToday = isToday(day);
                const dayIsFuture = isAfter(startOfDay(day), today);
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => handleSelectDate(day)}
                    disabled={dayIsFuture}
                    aria-label={`${format(day, "MMMM d, yyyy")}, ${
                      dayEntries.length
                    } entries`}
                    className={`
                      relative flex flex-col justify-between text-left p-2 sm:p-2.5 rounded-xl border transition-all duration-150 min-h-[90px] sm:min-h-[115px]
                      ${
                        dayIsFuture
                          ? "bg-muted/15 border-border/30 opacity-35 cursor-not-allowed select-none"
                          : "cursor-pointer hover:border-primary/60 hover:shadow-sm"
                      }
                      ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                          : !dayIsFuture && inCurrentMonth
                          ? "bg-card/90 border-border/70 hover:bg-muted/30"
                          : !dayIsFuture && !inCurrentMonth
                          ? "bg-muted/20 border-border/30 text-muted-foreground/60"
                          : ""
                      }
                    `}
                  >
                    {/* Top Row: Date Number & Count Badge */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`
                          inline-flex items-center justify-center text-xs font-semibold transition-all
                          ${
                            dayIsToday
                              ? "w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-xs font-bold"
                              : inCurrentMonth
                              ? "text-foreground"
                              : "text-muted-foreground/60"
                          }
                        `}
                      >
                        {format(day, "d")}
                      </span>

                      {dayEntries.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground border border-border/60">
                          {dayEntries.length}
                        </span>
                      )}
                    </div>

                    {/* Middle / Bottom Content: Entry Dots / Pills */}
                    <div className="mt-1 space-y-1 w-full overflow-hidden">
                      {dayEntries.length > 0 ? (
                        <>
                          {/* Large screen: Compact entry titles or pills */}
                          <div className="hidden sm:flex flex-col gap-1 w-full">
                            {dayEntries.slice(0, 2).map((entry) => {
                              const style = getMoodStyle(entry.mood);
                              return (
                                <div
                                  key={entry.id}
                                  className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${style.bg} ${style.text} ${style.border} border`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`}
                                  />
                                  <span className="truncate">
                                    {entry.title || entry.mood || "Reflection"}
                                  </span>
                                </div>
                              );
                            })}

                            {dayEntries.length > 2 && (
                              <span className="text-[9px] text-muted-foreground font-medium px-1">
                                +{dayEntries.length - 2} more
                              </span>
                            )}
                          </div>

                          {/* Mobile screen: Colored Dots Row */}
                          <div className="flex sm:hidden items-center gap-1 flex-wrap pt-1">
                            {dayEntries.slice(0, 3).map((entry) => {
                              const style = getMoodStyle(entry.mood);
                              return (
                                <span
                                  key={entry.id}
                                  className={`w-2 h-2 rounded-full ${style.dot}`}
                                />
                              );
                            })}
                            {dayEntries.length > 3 && (
                              <span className="text-[8px] text-muted-foreground">
                                +{dayEntries.length - 3}
                              </span>
                            )}
                          </div>
                        </>
                      ) : !dayIsFuture ? (
                        <div className="hidden sm:group-hover:flex items-center text-[10px] text-muted-foreground/50 h-5" />
                      ) : null}
                    </div>

                    {/* Footer cue: "Today" text tag if today */}
                    {dayIsToday && (
                      <div className="mt-auto pt-1">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-primary">
                          Today
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Day Dialog Modal */}
      <JournalDayDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        selectedDate={selectedDate}
        entries={selectedDateEntries}
      />
    </div>
  );
}
