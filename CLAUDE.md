# IronLog — Mission Control Source of Truth

## Project Overview
IronLog is a streak-tracking sobriety app built with Expo React Native and Supabase. Monochrome, military-precision aesthetic. Every pixel is intentional.

---

## 1. Aesthetic Standards

### Theme
- Background: `#0a0a0a` (defined in `src/constants/colors.js` as `colors.background`)
- Accent / text: `#FFFFFF` (defined as `colors.white`)
- No grays, no gradients, no color accents — pure monochrome only

### Typography
- **Display / Headers / Nav**: `OCRA` font (OCR-A TTF at `assets/fonts/OCRA.ttf`) — defined as `fonts.display`
- **Body / Dates / Numbers**: `SF Pro` — defined as `fonts.body`
- Constants live in `src/constants/fonts.js` and `src/constants/colors.js`

### Layout Strategy — "Bolted Console"
- UI elements (nav buttons, headers, stat labels) must use **absolute positioning** or **fixed-height containers**
- This prevents layout shift ("jumping") when data changes (e.g., streak number growing from 1 to 4 digits)
- The streak number container is a fixed `height: 160` with `width: '100%'` — never let it be auto-sized
- Calendar nav buttons are absolutely positioned so the month/year header cannot shift them

---

## 2. Calendar Logic

### Grid Configuration
- **Sunday-start** (S M T W T F S) — non-negotiable
- First column is always Sunday; `getDay() === 0` maps directly to column 0
- Grid width is computed exactly: `CELL_SIZE * 7 + COL_GAP * 6` (exported as `GRID_WIDTH` from `CalendarGrid.jsx`)

### Visual Trinity — Cell States
| State | Visual | Condition |
|-------|--------|-----------|
| **Solid White** | Filled white square with dark date number | `cleanDays.has(dateStr)` |
| **Hollow Square** | 1px white border, dim date number | Day exists, not clean, not a relapse |
| **White Skull** | Hollow square + skull icon | `relapseDays.has(dateStr) && dateStr <= todayString` |

- **No skulls in the future** — relapse state is only rendered if `dateStr <= todayString`
- Future unverified days are plain hollow squares, never skulls

### Today Indicator
- 1px white outer ring rendered as an absolutely positioned `View` overlay (`todayRingOverlay` style)
- Offset: `top: -4, left: -4, right: -4, bottom: -4` — sits outside the cell bounds, `borderRadius: 4`

---

## 3. Technical Architecture

### Stack
- **Framework**: Expo React Native (managed workflow)
- **Backend**: Supabase (auth + database + RLS)
- **Payments**: RevenueCat (`src/lib/revenuecat.js`)
- **Navigation**: React Navigation (`src/navigation/AppNavigator.jsx`, `OnboardingNavigator.jsx`)

### Security Rules
- **Row Level Security (RLS) is mandatory** on all Supabase tables
- **Never hardcode keys** — use `.env` with `EXPO_PUBLIC_` prefix for Supabase URL and anon key
- Supabase client is initialized in `src/lib/supabase.js` using `process.env.EXPO_PUBLIC_SUPABASE_URL` and `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Streak Logic
- **Passive streaks on Home screen**: Hollow squares (unverified/missing days) do NOT break the streak counter
- **Reset is an absolute zero-point**: Triggers the full reset animation sequence and writes a reset event to Supabase
- **Longest streak** is tracked separately and is never decremented by a reset
- Streak calculation must be driven by Supabase data, not local state (current `useStreak.js` hook is a placeholder)

---

## 4. Key File Map

```
src/
  constants/
    colors.js          # colors.background / colors.white
    fonts.js           # fonts.display (OCRA) / fonts.body (SF Pro)
    badges.js          # Badge definitions
    messages.js        # Motivational copy
  screens/
    HomeScreen.jsx     # Streak counter, hold-to-reset button, confirmation modal
    CalendarScreen.jsx # Month calendar with nav, check-in grid
    BadgeScreen.jsx    # Achievement badges
    SettingsScreen.jsx
    SignInScreen.jsx
    onboarding/        # Opening → Notifications → NotificationPermission → Intensity → Paywall → Demo
  components/
    CalendarGrid.jsx   # Core grid renderer — exports CELL_SIZE, GRID_WIDTH, toDateStr
    ResetButton.jsx    # Standalone reset button component
    StreakCounter.jsx
    BadgeGrid.jsx
    SpotlightOverlay.jsx
  hooks/
    useStreak.js       # Currently local-only — needs Supabase integration
    useBadges.js
    useNotifications.js
  lib/
    supabase.js        # Supabase client
    revenuecat.js      # RevenueCat client
  navigation/
    AppNavigator.jsx
    OnboardingNavigator.jsx
```

---

## 5. Supabase SQL Schema

Run this in the Supabase SQL Editor to scaffold the required tables.

```sql
-- ============================================================
-- IRONLOG DATABASE SCHEMA
-- ============================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  username      TEXT,
  -- Longest streak is stored denormalized for fast reads
  longest_streak INT NOT NULL DEFAULT 0
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- Profile is created automatically via trigger (see below)


-- Check-ins table — one row per day the user was clean
CREATE TABLE public.check_ins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- ISO date string: YYYY-MM-DD — one record per day, enforced by unique constraint
  date          DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own check_ins"
  ON public.check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own check_ins"
  ON public.check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own check_ins"
  ON public.check_ins FOR DELETE USING (auth.uid() = user_id);


-- Resets table — records every time the user hits the reset button
-- Each reset is a zero-point event; streak is counted from the latest reset date
CREATE TABLE public.resets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reset_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Optional: store the streak value at time of reset for history
  streak_at_reset INT NOT NULL DEFAULT 0
);

ALTER TABLE public.resets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own resets"
  ON public.resets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own resets"
  ON public.resets FOR INSERT WITH CHECK (auth.uid() = user_id);


-- Relapses table — days where the user marked a relapse (skull icon)
-- Separate from resets: a relapse is a historical marker; a reset zeroes the counter
CREATE TABLE public.relapses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.relapses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own relapses"
  ON public.relapses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own relapses"
  ON public.relapses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own relapses"
  ON public.relapses FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- TRIGGER: Auto-create profile row on new auth user signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- HELPER FUNCTION: Compute current streak for a user
-- Streak = days since last reset, counting only check_in days
-- Passive rule: missing days don't break the streak counter;
-- only an explicit reset zeroes it.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_current_streak(p_user_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start_date DATE;
  v_streak     INT;
BEGIN
  -- Find the date of the most recent reset (or epoch if none)
  SELECT COALESCE(MAX(reset_at::DATE), '1970-01-01'::DATE)
  INTO v_start_date
  FROM public.resets
  WHERE user_id = p_user_id;

  -- Count check_ins strictly after the last reset date
  SELECT COUNT(*)
  INTO v_streak
  FROM public.check_ins
  WHERE user_id = p_user_id
    AND date > v_start_date
    AND date <= CURRENT_DATE;

  RETURN v_streak;
END;
$$;
```

---

## 6. Streak Calculation Rules (App-Side)

When computing streak to display on HomeScreen:
1. Fetch the most recent reset timestamp from the `resets` table for the current user
2. `current_streak = number of full 24-hour periods elapsed since that reset timestamp`, calculated in the user's local timezone
3. If no reset exists, `streak_start_date` from the `streaks` table is used as the origin point
4. `longest_streak = MAX(current_streak, streaks.longest_streak)` — update `streaks` table if new high
5. A new reset inserts a row in `resets` and updates `streak_start_date` in `streaks` — it does not delete any existing rows in `resets` (full history is preserved)
6. All timestamps are stored in UTC and converted to local timezone for display and calculation only

---

## 7. Onboarding Restart Behavior

If the app is fully closed (not backgrounded) at any point during onboarding before `onboarding_complete` is set to `true`, the user must always be routed back to the Opening screen on next launch. Do not attempt to save or restore mid-onboarding navigation state. Onboarding always runs in full from the beginning.

---

## 8. Notification Gating

Push notifications (morning and danger period) must never fire unless the user has an active free trial or paid subscription confirmed by RevenueCat. Gate all notification scheduling behind an entitlement check — if no active entitlement exists, do not schedule any notifications regardless of what times the user selected during onboarding. Do not apply this rule to demo mode notifications, which have their own separate logic and should remain untouched.
