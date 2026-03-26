# FocusOS — Architecture & Technical Overview

FocusOS is a high-performance productivity web app built with the "Apple Minimalist" design philosophy. It integrates habit tracking, task management, and AI-driven insights to help users optimize their routines.

## Tech Stack
-   **Framework**: Next.js 14 (App Router)
-   **Styling**: Tailwind CSS
-   **Animations**: Framer Motion
-   **Database & Auth**: Supabase (PostgreSQL)
-   **State Management**: TanStack Query (React Query)
-   **Icons**: Lucide React / SF Pro-inspired custom SVG

## System Components

### 1. Dashboard (The Core)
The Dashboard is the central hub. It uses `useHabitsToday` and `useTasksToday` hooks to fetch data from Supabase.
-   **Habit Tracker**: Cycles through 4 states (`none` → `done` → `partial` → `failed`). This logic is handled by the `v_daily_habit_summary` view in Supabase.
-   **Task Agenda**: Manages daily tasks with priorities.
-   **Score Widget**: Calculates a combined productivity score from habits and tasks.

### 2. AI Insight Engine
Currently, FocusOS uses two layers of AI:
-   **Local Service (`lib/services/aiService.ts`)**: Fast, client-side logic that analyzes immediate patterns for instant feedback.
-   **AI API (`app/api/ai/insights/route.ts`)**: Integration with OpenAI (GPT-4o-mini) for deeper pattern discovery over historical data.

### 3. Database Schema
-   **`profiles`**: User metadata.
-   **`habits`**: User-defined habits (positive/negative).
-   **`habit_logs`**: Tracking records linked to habits.
-   **`tasks`**: Standard task management.
-   **`daily_scores`**: Cached scores for historical tracking.

## Deployment
FocusOS is designed to be hosted for free:
-   **Frontend**: Vercel
-   **Backend**: Supabase (Free Tier)
-   **AI**: OpenAI API (Credits or limited free-usage simulation)

## Getting Started
Users need to set up their `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in their `.env.local` to enable persistence.
