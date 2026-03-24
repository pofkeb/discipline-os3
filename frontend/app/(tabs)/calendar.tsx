import { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius, fontSize } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import * as Haptics from 'expo-haptics';

// ─── Constants ───

const DAY_LABELS  = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Helpers ───

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getMonthGrid(year: number, month: number): (number | null)[][] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function formatDetailDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
}

// ─── Task type helpers (migration shim included) ───

const isNonNeg  = (type: string | undefined) => { const t = type ?? 'routine'; return t === 'routine' || t === 'non_negotiable'; };
const isNeg     = (type: string | undefined) => type === 'negotiable';
const isOneTime = (type: string | undefined) => type === 'one_time';

// ─── Types ───

type DayInfo = {
  nonNegDone:  number;
  nonNegTotal: number;
  negDone:     number;
  negTotal:    number;
  oneTimeDone: number;
  msDone:      number;
  stepsDone:   number;
};

type DayVariant = 'perfect' | 'partial' | 'missed' | 'activity' | 'empty' | 'future';

// ─── Main component ───

export default function CalendarScreen() {
  const c = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const cellSize = Math.floor((screenWidth - spacing.lg * 2) / 7);

  const now   = new Date();
  const [year,        setYear]        = useState(now.getFullYear());
  const [month,       setMonth]       = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string>(todayStr());
  const [tasks,       setTasks]       = useState<any[]>([]);
  const [completions, setCompletions] = useState<Record<string, string[]>>({});
  const [goals,       setGoals]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        try {
          const [t, comp, g] = await Promise.all([api.getTasks(), api.getCompletions(), api.getGoals()]);
          if (!active) return;
          setTasks(t);
          setCompletions(comp);
          setGoals(g);
        } finally {
          if (active) setLoading(false);
        }
      }
      load();
      return () => { active = false; };
    }, [])
  );

  // ─── Derived: task ID sets ───

  const { nonNegIds, negIds, oneTimeIds } = useMemo(() => ({
    nonNegIds:  new Set(tasks.filter(t => isNonNeg(t.type)).map(t => t.id as string)),
    negIds:     new Set(tasks.filter(t => isNeg(t.type)).map(t => t.id as string)),
    oneTimeIds: new Set(tasks.filter(t => isOneTime(t.type)).map(t => t.id as string)),
  }), [tasks]);

  // ─── Derived: streak (non-neg only) ───

  const streak = useMemo(() => {
    if (nonNegIds.size === 0) return 0;
    let s = 0;
    const base = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const hasDone = (completions[ds] || []).some(id => nonNegIds.has(id));
      if (hasDone) s++; else break;
    }
    return s;
  }, [completions, nonNegIds]);

  // ─── Per-day computation (memoized per visible month) ───

  const monthData = useMemo(() => {
    const data: Record<string, DayInfo> = {};
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = todayStr();

    for (let d = 1; d <= daysInMonth; d++) {
      const ds     = toDateStr(year, month, d);
      const doneIds: string[] = completions[ds] || [];

      // Tasks that existed on this day (created_at <= ds)
      const nonNegExisted = tasks.filter(t => isNonNeg(t.type)  && (t.created_at?.split('T')[0] ?? '2000-01-01') <= ds);
      const negExisted    = tasks.filter(t => isNeg(t.type)     && (t.created_at?.split('T')[0] ?? '2000-01-01') <= ds);

      // Roadmap nodes completed on this day via completed_at timestamp
      let msDone = 0, stepsDone = 0;
      goals.forEach((g: any) => {
        (g.milestones || []).forEach((m: any) => {
          if (m.completed_at?.split('T')[0] === ds) msDone++;
          (m.steps ?? []).forEach((s: any) => {
            if (s.completed_at?.split('T')[0] === ds) stepsDone++;
          });
        });
      });

      data[ds] = {
        nonNegDone:  doneIds.filter(id => nonNegIds.has(id)).length,
        nonNegTotal: nonNegExisted.length,
        negDone:     doneIds.filter(id => negIds.has(id)).length,
        negTotal:    negExisted.length,
        oneTimeDone: doneIds.filter(id => oneTimeIds.has(id)).length,
        msDone,
        stepsDone,
      };
    }
    return data;
  }, [year, month, tasks, completions, goals, nonNegIds, negIds, oneTimeIds]);

  // ─── Day variant (for cell color) ───

  const getDayVariant = (ds: string): DayVariant => {
    if (ds > todayStr()) return 'future';
    const info = monthData[ds];
    if (!info) return 'empty';
    const hasAny = info.nonNegDone + info.negDone + info.oneTimeDone + info.msDone + info.stepsDone > 0;
    if (info.nonNegTotal === 0) return hasAny ? 'activity' : 'empty';
    if (info.nonNegDone === info.nonNegTotal) return 'perfect';
    if (info.nonNegDone > 0) return 'partial';
    return 'missed';
  };

  // ─── Month stats (active days this month) ───

  const { activeDays, daysInMonth } = useMemo(() => {
    const dim = new Date(year, month + 1, 0).getDate();
    const today = todayStr();
    let active = 0;
    for (let d = 1; d <= dim; d++) {
      const ds = toDateStr(year, month, d);
      if (ds > today) break;
      const v = getDayVariant(ds);
      if (v !== 'empty' && v !== 'missed') active++;
    }
    return { activeDays: active, daysInMonth: dim };
  }, [monthData, year, month]);

  // ─── Navigation ───

  const prevMonth = () => {
    Haptics.selectionAsync();
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else              { setMonth(m => m - 1); }
    setSelectedDay('');
  };

  const nextMonth = () => {
    const n = new Date();
    if (year > n.getFullYear() || (year === n.getFullYear() && month >= n.getMonth())) return;
    Haptics.selectionAsync();
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else               { setMonth(m => m + 1); }
    setSelectedDay('');
  };

  const selectDay = (ds: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDay(ds);
  };

  // ─── Grid data ───

  const weeks = getMonthGrid(year, month);
  const today = todayStr();
  const canGoNext = !(year === now.getFullYear() && month >= now.getMonth());

  // ─── Selected day info ───

  const selInfo: DayInfo | null = selectedDay ? (monthData[selectedDay] ?? null) : null;
  const hasSelActivity = selInfo
    ? selInfo.nonNegDone + selInfo.negDone + selInfo.oneTimeDone + selInfo.msDone + selInfo.stepsDone > 0
    : false;

  if (loading) return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <View style={s.center}><ActivityIndicator size="large" color={c.accent} /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Page header ── */}
        <View style={s.pageHeader}>
          <Text style={[s.pageTitle, { color: c.textPrimary }]}>HISTORY</Text>
          {streak > 0 && (
            <View style={[s.streakChip, { backgroundColor: c.accent + '18', borderColor: c.accent + '30' }]}>
              <Text style={s.streakEmoji}>🔥</Text>
              <Text style={[s.streakTxt, { color: c.accent }]}>{streak} day streak</Text>
            </View>
          )}
        </View>

        {/* ── Month navigation ── */}
        <View style={s.monthNav}>
          <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={22} color={c.textPrimary} />
          </TouchableOpacity>
          <View style={s.monthCenter}>
            <Text style={[s.monthName, { color: c.textPrimary }]}>{MONTH_NAMES[month].toUpperCase()} {year}</Text>
            <Text style={[s.monthSub, { color: c.textTertiary }]}>
              {activeDays} active day{activeDays !== 1 ? 's' : ''} this month
            </Text>
          </View>
          <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ opacity: canGoNext ? 1 : 0.25 }}>
            <Ionicons name="chevron-forward" size={22} color={c.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* ── Day-of-week header ── */}
        <View style={s.dowRow}>
          {DAY_LABELS.map((l, i) => (
            <View key={i} style={[s.cell, { width: cellSize }]}>
              <Text style={[s.dowLabel, { color: c.textTertiary }]}>{l}</Text>
            </View>
          ))}
        </View>

        {/* ── Calendar grid ── */}
        {weeks.map((week, wi) => (
          <View key={wi} style={s.week}>
            {week.map((day, di) => {
              if (!day) return <View key={di} style={[s.cell, { width: cellSize }]} />;
              const ds      = toDateStr(year, month, day);
              const variant = getDayVariant(ds);
              const isToday = ds === today;
              const isSel   = ds === selectedDay;
              const isFut   = variant === 'future';

              // Circle background color
              let circleBg = 'transparent';
              if (variant === 'perfect')  circleBg = c.accent;
              if (variant === 'partial')  circleBg = c.accent + '55';
              if (variant === 'activity') circleBg = c.accent + '30';

              // Day number color
              let numColor = c.textPrimary;
              if (isFut)                 numColor = c.textTertiary;
              if (variant === 'perfect') numColor = '#fff';
              if (variant === 'empty' || variant === 'missed') numColor = c.textSecondary;

              return (
                <TouchableOpacity
                  key={di}
                  style={[s.cell, { width: cellSize }]}
                  onPress={() => !isFut && selectDay(ds)}
                  activeOpacity={isFut ? 1 : 0.7}
                >
                  {/* Circle indicator */}
                  <View style={[
                    s.dayCircle,
                    { backgroundColor: circleBg },
                    isToday && !isSel && { borderWidth: 2, borderColor: c.accent },
                    isSel && !isToday && { borderWidth: 2, borderColor: c.textSecondary },
                    isSel && isToday && { borderWidth: 2, borderColor: c.accent },
                  ]}>
                    <Text style={[s.dayNum, { color: numColor }]}>{day}</Text>
                  </View>

                  {/* Missed dot */}
                  {variant === 'missed' && (
                    <View style={[s.missedDot, { backgroundColor: c.error }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* ── Legend ── */}
        <View style={[s.legend, { borderTopColor: c.border }]}>
          {[
            { color: c.accent,          label: 'All done' },
            { color: c.accent + '55',   label: 'Partial' },
            { color: c.error,           label: 'Missed', dot: true },
          ].map((item, i) => (
            <View key={i} style={s.legendItem}>
              {item.dot
                ? <View style={[s.legendDot, { backgroundColor: item.color }]} />
                : <View style={[s.legendCircle, { backgroundColor: item.color }]} />
              }
              <Text style={[s.legendLabel, { color: c.textTertiary }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Selected day detail ── */}
        {selectedDay !== '' && (
          <View style={[s.detailCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.detailDate, { color: c.textTertiary }]}>
              {formatDetailDate(selectedDay)}
            </Text>

            {!hasSelActivity && (
              <View style={s.noActivity}>
                <Ionicons name="moon-outline" size={22} color={c.textTertiary} />
                <Text style={[s.noActivityTxt, { color: c.textTertiary }]}>No activity recorded</Text>
              </View>
            )}

            {/* Show missed non-negotiables even if no activity was done */}
            {!hasSelActivity && selInfo && selInfo.nonNegTotal > 0 && selInfo.nonNegDone === 0 && (
              <View style={[s.detailRows, { marginTop: spacing.md }]}>
                <DetailRow
                  icon="shield-checkmark-outline"
                  label="Non-Negotiables"
                  done={0}
                  total={selInfo.nonNegTotal}
                  colors={c}
                />
              </View>
            )}

            {hasSelActivity && selInfo && (
              <View style={s.detailRows}>
                {selInfo.nonNegTotal > 0 && (
                  <DetailRow
                    icon="shield-checkmark-outline"
                    label="Non-Negotiables"
                    done={selInfo.nonNegDone}
                    total={selInfo.nonNegTotal}
                    colors={c}
                  />
                )}
                {selInfo.negTotal > 0 && (
                  <DetailRow
                    icon="repeat-outline"
                    label="Negotiables"
                    done={selInfo.negDone}
                    total={selInfo.negTotal}
                    colors={c}
                  />
                )}
                {selInfo.oneTimeDone > 0 && (
                  <View style={s.detailRow}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={c.success} />
                    <Text style={[s.detailLabel, { color: c.textSecondary }]}>One-Time</Text>
                    <Text style={[s.detailCount, { color: c.textPrimary }]}>{selInfo.oneTimeDone} done</Text>
                  </View>
                )}
                {(selInfo.msDone > 0 || selInfo.stepsDone > 0) && (
                  <View style={s.detailRow}>
                    <Ionicons name="flag-outline" size={16} color={c.accent} />
                    <Text style={[s.detailLabel, { color: c.textSecondary }]}>Roadmap</Text>
                    <Text style={[s.detailCount, { color: c.textPrimary }]}>
                      {[
                        selInfo.msDone > 0   ? `${selInfo.msDone} milestone${selInfo.msDone !== 1 ? 's' : ''}` : '',
                        selInfo.stepsDone > 0 ? `${selInfo.stepsDone} step${selInfo.stepsDone !== 1 ? 's' : ''}` : '',
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Detail row sub-component ───

function DetailRow({ icon, label, done, total, colors }: {
  icon: string; label: string; done: number; total: number; colors: any;
}) {
  const pct = total > 0 ? done / total : 0;
  const isPerfect = done === total;
  const isMissed  = done === 0;

  const barColor = isPerfect ? colors.success : isMissed ? colors.error : colors.accent;
  const countColor = isPerfect ? colors.success : isMissed ? colors.error : colors.textPrimary;

  return (
    <View style={s.detailRow}>
      <Ionicons name={icon as any} size={16} color={barColor} />
      <Text style={[s.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={s.detailBarWrap}>
        <View style={[s.detailBar, { backgroundColor: colors.surfaceHighlight }]}>
          <View style={[s.detailBarFill, { backgroundColor: barColor, width: `${pct * 100}%` }]} />
        </View>
        <Text style={[s.detailCount, { color: countColor }]}>{done}/{total}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───

const s = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: spacing.lg },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.md, marginBottom: spacing.lg },
  pageTitle:  { fontFamily: 'BarlowCondensed_700Bold', fontSize: 28, letterSpacing: 1 },
  streakChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1 },
  streakEmoji:{ fontSize: 14 },
  streakTxt:  { fontFamily: 'Inter_700Bold', fontSize: fontSize.xs },

  monthNav:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  monthCenter:{ alignItems: 'center' },
  monthName:  { fontFamily: 'BarlowCondensed_700Bold', fontSize: 20, letterSpacing: 1 },
  monthSub:   { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },

  dowRow:  { flexDirection: 'row', marginBottom: 4 },
  dowLabel:{ fontFamily: 'Inter_500Medium', fontSize: 11, textAlign: 'center' },

  week: { flexDirection: 'row' },
  cell: { height: 48, alignItems: 'center', justifyContent: 'center', position: 'relative' },

  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayNum:    { fontFamily: 'Inter_500Medium', fontSize: 14 },
  missedDot: { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: 5 },

  legend:      { flexDirection: 'row', gap: spacing.lg, paddingTop: spacing.md, marginTop: spacing.xs, borderTopWidth: 0.5, marginBottom: spacing.xl },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendCircle:{ width: 12, height: 12, borderRadius: 6 },
  legendDot:   { width: 6, height: 6, borderRadius: 3 },
  legendLabel: { fontFamily: 'Inter_400Regular', fontSize: 11 },

  detailCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.md },
  detailDate: { fontFamily: 'BarlowCondensed_700Bold', fontSize: fontSize.xs, letterSpacing: 1, marginBottom: spacing.md },
  detailRows: { gap: spacing.md },
  detailRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailLabel:{ fontFamily: 'Inter_500Medium', fontSize: fontSize.sm, flex: 1 },
  detailBarWrap:{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailBar:   { width: 80, height: 6, borderRadius: 3, overflow: 'hidden' },
  detailBarFill:{ height: '100%', borderRadius: 3, minWidth: 1 },
  detailCount: { fontFamily: 'Inter_700Bold', fontSize: fontSize.xs, width: 36, textAlign: 'right' },

  noActivity:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  noActivityTxt:{ fontFamily: 'Inter_400Regular', fontSize: fontSize.sm },
});
