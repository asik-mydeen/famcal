import { createContext, useContext, useReducer, useMemo, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { supabase } from "lib/supabase";
import { useAuth } from "context/AuthContext";
import { getTokens } from "theme/tokens";
import { notifyEventAdded, notifyEventUpdated, notifyEventDeleted } from "lib/notifications";

const FamilyContext = createContext(null);
FamilyContext.displayName = "FamilyContext";

// Source member colors from theme tokens (light mode for DB storage)
const _tokens = getTokens("light");

const MEMBER_COLORS = _tokens.member;

const TASK_CATEGORIES = [
  { key: "chores", label: "Chores", icon: "cleaning_services", color: _tokens.category.chores },
  { key: "homework", label: "Homework", icon: "menu_book", color: _tokens.category.homework },
  { key: "errands", label: "Errands", icon: "shopping_cart", color: _tokens.category.errands },
  { key: "health", label: "Health", icon: "fitness_center", color: _tokens.category.health },
  { key: "cooking", label: "Cooking", icon: "restaurant", color: _tokens.category.cooking },
  { key: "pets", label: "Pets", icon: "pets", color: _tokens.category.pets },
  { key: "other", label: "Other", icon: "push_pin", color: _tokens.category.other },
];

// ── Achievement Definitions ──
const ACHIEVEMENT_DEFS = [
  // Streak badges
  { key: "streak_3", type: "streak", title: "3-Day Streak", description: "Complete tasks 3 days in a row", icon: "local_fire_department", threshold: 3, points_bonus: 15 },
  { key: "streak_7", type: "streak", title: "7-Day Streak", description: "Complete tasks 7 days in a row", icon: "whatshot", threshold: 7, points_bonus: 30 },
  { key: "streak_14", type: "streak", title: "14-Day Streak", description: "Complete tasks 14 days in a row", icon: "fireplace", threshold: 14, points_bonus: 50 },
  { key: "streak_30", type: "streak", title: "30-Day Streak", description: "Complete tasks 30 days in a row", icon: "military_tech", threshold: 30, points_bonus: 100 },
  // Milestone badges
  { key: "tasks_10", type: "milestone", title: "Getting Started", description: "Complete 10 tasks", icon: "star_outline", threshold: 10, points_bonus: 10 },
  { key: "tasks_25", type: "milestone", title: "Task Apprentice", description: "Complete 25 tasks", icon: "star_half", threshold: 25, points_bonus: 25 },
  { key: "tasks_50", type: "milestone", title: "Task Expert", description: "Complete 50 tasks", icon: "star", threshold: 50, points_bonus: 50 },
  { key: "tasks_100", type: "milestone", title: "Task Master", description: "Complete 100 tasks", icon: "stars", threshold: 100, points_bonus: 100 },
  { key: "tasks_250", type: "milestone", title: "Task Legend", description: "Complete 250 tasks", icon: "workspace_premium", threshold: 250, points_bonus: 150 },
  { key: "tasks_500", type: "milestone", title: "Task Supreme", description: "Complete 500 tasks", icon: "emoji_events", threshold: 500, points_bonus: 250 },
  // First-timer badges
  { key: "first_task", type: "special", title: "First Steps", description: "Complete your first task", icon: "rocket_launch", threshold: 1, points_bonus: 5 },
];

function checkAchievements(memberId, state) {
  const member = state.members.find((m) => m.id === memberId);
  if (!member) return [];

  const earned = state.achievements.filter((a) => a.member_id === memberId);
  const earnedKeys = new Set(earned.map((a) => a.key));
  const newAchievements = [];

  // Count total completed tasks by this member
  const totalCompleted = state.tasks.filter((t) => t.completed_by === memberId && (t.completed || t.completed_at)).length;
  const streakDays = member.streak_days || 0;

  ACHIEVEMENT_DEFS.forEach((def) => {
    if (earnedKeys.has(def.key)) return; // Already earned

    let qualifies = false;
    if (def.type === "streak") {
      qualifies = streakDays >= def.threshold;
    } else if (def.type === "milestone") {
      qualifies = totalCompleted >= def.threshold;
    } else if (def.key === "first_task") {
      qualifies = totalCompleted >= 1;
    }

    if (qualifies) {
      newAchievements.push({
        id: crypto.randomUUID(),
        family_id: state.family.id,
        member_id: memberId,
        type: def.type,
        key: def.key,
        title: def.title,
        description: def.description,
        icon: def.icon,
        points_bonus: def.points_bonus,
        earned_at: new Date().toISOString(),
      });
    }
  });

  return newAchievements;
}

const INITIAL_FAMILY = {
  id: "demo-family",
  name: "My Family",
};

const INITIAL_MEMBERS = [];

const INITIAL_TASKS = [];

const INITIAL_EVENTS = [];

const INITIAL_REWARDS = [
  // Kids - Both
  { id: "rw-1", family_id: "demo-family", title: "Extra Screen Time", description: "30 minutes of extra TV or iPad", points_cost: 30, icon: "devices" },
  { id: "rw-2", family_id: "demo-family", title: "Sweet Treat", description: "Pick a chocolate, candy, or dessert", points_cost: 25, icon: "cake" },
  { id: "rw-3", family_id: "demo-family", title: "Movie Night Pick", description: "You choose the family movie tonight", points_cost: 50, icon: "movie" },
  { id: "rw-4", family_id: "demo-family", title: "Stay Up Late", description: "30 minutes past bedtime", points_cost: 40, icon: "bedtime" },
  { id: "rw-5", family_id: "demo-family", title: "Ice Cream Outing", description: "Trip to the ice cream shop", points_cost: 75, icon: "icecream" },
  { id: "rw-6", family_id: "demo-family", title: "No Chores Day", description: "Skip your chores for one day", points_cost: 60, icon: "event_busy" },
  { id: "rw-7", family_id: "demo-family", title: "Pick Dinner", description: "Choose what the family eats tonight", points_cost: 35, icon: "restaurant" },
  // Aarish specials (cars, movies, books, sweets)
  { id: "rw-8", family_id: "demo-family", title: "New Toy Car", description: "Pick a new Hot Wheels or toy car", points_cost: 100, icon: "directions_car" },
  { id: "rw-9", family_id: "demo-family", title: "Book of Choice", description: "Get a new book from the bookstore", points_cost: 80, icon: "auto_stories" },
  { id: "rw-10", family_id: "demo-family", title: "Sweet Treat Box", description: "A box of your favorite sweets", points_cost: 60, icon: "redeem" },
  // Aaraa specials (TV, iPad, games, Dad time, sweets)
  { id: "rw-11", family_id: "demo-family", title: "Extra iPad Time", description: "30 minutes bonus iPad games", points_cost: 30, icon: "tablet" },
  { id: "rw-12", family_id: "demo-family", title: "Play Date with Dad", description: "Special 1-hour play session with Dad", points_cost: 50, icon: "family_restroom" },
  { id: "rw-13", family_id: "demo-family", title: "New Game Unlock", description: "Download a new game on the iPad", points_cost: 80, icon: "sports_esports" },
  { id: "rw-14", family_id: "demo-family", title: "Princess Sweet Surprise", description: "A special surprise treat just for you", points_cost: 35, icon: "star" },
  // Parents
  { id: "rw-15", family_id: "demo-family", title: "Movie Date Night", description: "Parents-only movie outing", points_cost: 100, icon: "local_movies" },
  { id: "rw-16", family_id: "demo-family", title: "Sleep In", description: "No early wake-up, kids handled by other parent", points_cost: 60, icon: "hotel" },
  { id: "rw-17", family_id: "demo-family", title: "Order In Night", description: "No cooking - order from your fav restaurant", points_cost: 80, icon: "delivery_dining" },
  { id: "rw-18", family_id: "demo-family", title: "Spa / Me Time", description: "One hour of uninterrupted relaxation", points_cost: 120, icon: "spa" },
  // House Help rewards
  { id: "rw-19", family_id: "demo-family", title: "House Help Deep Clean", description: "Get your room deep cleaned by house help", points_cost: 40, icon: "cleaning_services" },
  { id: "rw-20", family_id: "demo-family", title: "Dishwasher Duty Pass", description: "House help loads the dishwasher for you", points_cost: 30, icon: "countertops" },
  { id: "rw-21", family_id: "demo-family", title: "Laundry Pass", description: "House help handles your laundry this week", points_cost: 35, icon: "local_laundry_service" },
  { id: "rw-22", family_id: "demo-family", title: "Bed Making Pass", description: "House help makes your bed for a week", points_cost: 45, icon: "bed" },
];

const initialState = {
  family: INITIAL_FAMILY,
  members: INITIAL_MEMBERS,
  tasks: INITIAL_TASKS,
  events: INITIAL_EVENTS,
  rewards: INITIAL_REWARDS,
  selectedMembers: INITIAL_MEMBERS.map((m) => m.id),
  isSupabaseConnected: false,
  loading: false,
  dataLoaded: false,
  meals: [],
  lists: [],
  notes: [],
  countdowns: [],
  photos: [],
  weather: null,
  ai_preferences: null,
  conversations: [],
  activeConversation: null,
  memories: [],
  messages: [],
  routines: [],
  moodCheckins: [],
  allowanceTransactions: [],
  achievements: [],
};

function reducer(state, action) {
  const todayStr = new Date().toISOString().split("T")[0];
  switch (action.type) {
    case "SET_FAMILY":
      return { ...state, family: action.value };
    case "SET_MEMBERS":
      return { ...state, members: action.value };
    case "ADD_MEMBER": {
      const members = [...state.members, action.value];
      return { ...state, members, selectedMembers: [...state.selectedMembers, action.value.id] };
    }
    case "UPDATE_MEMBER": {
      const members = state.members.map((m) => (m.id === action.value.id ? { ...m, ...action.value } : m));
      return { ...state, members };
    }
    case "REMOVE_MEMBER": {
      const members = state.members.filter((m) => m.id !== action.value);
      const selectedMembers = state.selectedMembers.filter((id) => id !== action.value);
      return { ...state, members, selectedMembers };
    }
    case "TOGGLE_MEMBER_VISIBILITY": {
      if (action.value === "__reset__") {
        return { ...state, selectedMembers: state.members.map((m) => m.id) };
      }
      const sel = state.selectedMembers;
      const selectedMembers = sel.includes(action.value)
        ? sel.filter((id) => id !== action.value)
        : [...sel, action.value];
      return { ...state, selectedMembers };
    }
    case "SET_TASKS":
      return { ...state, tasks: action.value };
    case "ADD_TASK":
      return { ...state, tasks: [...state.tasks, action.value] };
    case "UPDATE_TASK": {
      const tasks = state.tasks.map((t) => (t.id === action.value.id ? { ...t, ...action.value } : t));
      return { ...state, tasks };
    }
    case "COMPLETE_TASK": {
      const completionDate = action.value.date || todayStr;
      const task = state.tasks.find((t) => t.id === action.value.taskId);
      if (!task) return state;
      // Recurring tasks: don't set completed=true (they reset daily)
      // Non-recurring: set completed=true (permanent)
      const tasks = state.tasks.map((t) => {
        if (t.id === action.value.taskId) {
          const updates = {
            ...t,
            completed: !t.recurring,
            completed_at: completionDate,
            completed_by: action.value.memberId,
          };
          // Rotation: increment rotation_index when recurring + rotation_members
          if (t.recurring && t.rotation_members && t.rotation_members.length > 1) {
            const nextIdx = ((t.rotation_index || 0) + 1) % t.rotation_members.length;
            updates.rotation_index = nextIdx;
            updates.assigned_to = t.rotation_members[nextIdx];
          }
          return updates;
        }
        return t;
      });
      // Award points with priority multiplier + update streak
      const PRIORITY_MULTIPLIER = { high: 2, medium: 1, low: 0.5 };
      const multiplier = PRIORITY_MULTIPLIER[task.priority] || 1;
      const earnedPoints = Math.ceil((task.points_value || 10) * multiplier);
      // Track allowance transaction if member has allowance_rate > 0
      let newAllowanceTransaction = null;
      const members = state.members.map((m) => {
        if (m.id === action.value.memberId) {
          const newPoints = m.points + earnedPoints;
          const newLevel = Math.floor(newPoints / 100) + 1;
          // Streak: check if member completed anything yesterday
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yStr = yesterday.toISOString().split("T")[0];
          const hadYesterday = state.tasks.some(
            (t) => t.completed_by === m.id && t.completed_at === yStr
          );
          const newStreak = hadYesterday ? (m.streak_days || 0) + 1 : 1;
          // Allowance: if member has allowance_rate, earn money per task
          const allowanceEarned = (m.allowance_rate || 0) > 0 ? Math.round(earnedPoints * (m.allowance_rate / 100) * 100) / 100 : 0;
          const newBalance = allowanceEarned > 0 ? (m.allowance_balance || 0) + allowanceEarned : (m.allowance_balance || 0);
          if (allowanceEarned > 0) {
            newAllowanceTransaction = {
              id: crypto.randomUUID(),
              family_id: state.family.id,
              member_id: m.id,
              amount: allowanceEarned,
              type: "earned",
              description: `Completed: ${task.title}`,
              task_id: task.id,
              created_at: new Date().toISOString(),
            };
          }
          const newWeeklyStars = (m.weekly_stars || 0) + earnedPoints;
          return { ...m, points: newPoints, level: newLevel, streak_days: newStreak, allowance_balance: newBalance, weekly_stars: newWeeklyStars };
        }
        return m;
      });
      const newTransactions = newAllowanceTransaction
        ? [newAllowanceTransaction, ...state.allowanceTransactions]
        : state.allowanceTransactions;
      return { ...state, tasks, members, allowanceTransactions: newTransactions };
    }
    case "UNCOMPLETE_TASK": {
      const task = state.tasks.find((t) => t.id === action.value.taskId);
      if (!task) return state;
      const tasks = state.tasks.map((t) => {
        if (t.id === action.value.taskId) {
          return { ...t, completed: false, completed_at: null, completed_by: null };
        }
        return t;
      });
      // Deduct points (with priority multiplier)
      const PRIORITY_MULTIPLIER_UNDO = { high: 2, medium: 1, low: 0.5 };
      const deduction = Math.ceil((task.points_value || 10) * (PRIORITY_MULTIPLIER_UNDO[task.priority] || 1));
      const members = state.members.map((m) => {
        if (m.id === task.completed_by) {
          const newPoints = Math.max(0, m.points - deduction);
          const newLevel = Math.floor(newPoints / 100) + 1;
          const newWeeklyStars = Math.max(0, (m.weekly_stars || 0) - deduction);
          return { ...m, points: newPoints, level: newLevel, weekly_stars: newWeeklyStars };
        }
        return m;
      });
      return { ...state, tasks, members };
    }
    case "REMOVE_TASK": {
      const tasks = state.tasks.filter((t) => t.id !== action.value);
      return { ...state, tasks };
    }
    case "SET_EVENTS":
      return { ...state, events: action.value };
    case "ADD_EVENT":
      return { ...state, events: [...state.events, action.value] };
    case "UPDATE_EVENT": {
      const events = state.events.map((e) => (e.id === action.value.id ? { ...e, ...action.value } : e));
      return { ...state, events };
    }
    case "REMOVE_EVENT": {
      const events = state.events.filter((e) => e.id !== action.value);
      return { ...state, events };
    }
    case "SET_REWARDS":
      return { ...state, rewards: action.value };
    case "ADD_REWARD":
      if (action.value === "__replace__") return state;
      return { ...state, rewards: [...state.rewards, action.value] };
    case "UPDATE_REWARD_ID": {
      const rewards = state.rewards.map((r) =>
        r.id === action.value.oldId ? { ...action.value.newRow } : r
      );
      return { ...state, rewards };
    }
    case "CLAIM_REWARD": {
      const { rewardId, memberId } = action.value;
      const reward = state.rewards.find((r) => r.id === rewardId);
      if (!reward) return state;
      const members = state.members.map((m) => {
        if (m.id === memberId && m.points >= reward.points_cost) {
          return { ...m, points: m.points - reward.points_cost };
        }
        return m;
      });
      return { ...state, members };
    }
    case "SET_SUPABASE_CONNECTED":
      return { ...state, isSupabaseConnected: action.value };
    case "SET_LOADING":
      return { ...state, loading: action.value };
    // Meals
    case "SET_MEALS":
      return { ...state, meals: action.value };
    case "ADD_MEAL":
      return { ...state, meals: [...state.meals, action.value] };
    case "UPDATE_MEAL":
      return { ...state, meals: state.meals.map((m) => (m.id === action.value.id ? action.value : m)) };
    case "REMOVE_MEAL": {
      const mealId = typeof action.value === "string" ? action.value : action.value?.id;
      return { ...state, meals: state.meals.filter((m) => m.id !== mealId) };
    }
    // Lists (nested items)
    case "SET_LISTS":
      return { ...state, lists: action.value };
    case "ADD_LIST":
      return { ...state, lists: [...state.lists, action.value] };
    case "REMOVE_LIST":
      return { ...state, lists: state.lists.filter((l) => l.id !== action.value) };
    case "UPDATE_LIST":
      return { ...state, lists: state.lists.map((l) => (l.id === action.value.id ? action.value : l)) };
    case "ADD_LIST_ITEM":
      return {
        ...state,
        lists: state.lists.map((l) =>
          l.id === action.value.listId ? { ...l, items: [...(l.items || []), action.value.item] } : l
        ),
      };
    case "TOGGLE_LIST_ITEM": {
      // Handle both formats: string (item ID) or { listId, itemId }
      const toggleItemId = typeof action.value === "string" ? action.value : action.value?.itemId;
      const toggleListId = typeof action.value === "string" ? null : action.value?.listId;
      return {
        ...state,
        lists: state.lists.map((l) => {
          if (toggleListId && l.id !== toggleListId) return l;
          return {
            ...l,
            items: (l.items || []).map((i) =>
              i.id === toggleItemId
                ? { ...i, checked: !i.checked, checked_at: !i.checked ? new Date().toISOString() : null }
                : i
            ),
          };
        }),
      };
    }
    case "REMOVE_LIST_ITEM": {
      // Handle both formats: string (item ID) or { listId, itemId }
      const removeItemId = typeof action.value === "string" ? action.value : action.value?.itemId;
      const removeListId = typeof action.value === "string" ? null : action.value?.listId;
      return {
        ...state,
        lists: state.lists.map((l) => {
          if (removeListId && l.id !== removeListId) return l;
          return {
            ...l,
            items: (l.items || []).filter((i) => i.id !== removeItemId),
          };
        }),
      };
    }
    // Notes
    case "SET_NOTES":
      return { ...state, notes: action.value };
    case "ADD_NOTE":
      return { ...state, notes: [action.value, ...state.notes] };
    case "UPDATE_NOTE":
      return { ...state, notes: state.notes.map((n) => (n.id === action.value.id ? action.value : n)) };
    case "REMOVE_NOTE":
      return { ...state, notes: state.notes.filter((n) => n.id !== action.value) };
    // Countdowns
    case "SET_COUNTDOWNS":
      return { ...state, countdowns: action.value };
    case "ADD_COUNTDOWN":
      return { ...state, countdowns: [...state.countdowns, action.value] };
    case "REMOVE_COUNTDOWN":
      return { ...state, countdowns: state.countdowns.filter((c) => c.id !== action.value) };
    // Photos
    case "SET_PHOTOS":
      return { ...state, photos: action.value };
    case "ADD_PHOTO":
      return { ...state, photos: [...state.photos, action.value] };
    case "REMOVE_PHOTO":
      return { ...state, photos: state.photos.filter((p) => p.id !== action.value) };
    // Weather
    case "SET_WEATHER":
      return { ...state, weather: action.value };
    // Data loaded state
    case "SET_DATA_LOADED":
      return { ...state, dataLoaded: action.value };
    // AI Assistant
    case "SET_AI_PREFERENCES":
      return { ...state, ai_preferences: action.value };
    case "UPDATE_AI_PREFERENCES":
      return { ...state, ai_preferences: { ...state.ai_preferences, ...action.value } };
    case "SET_CONVERSATIONS":
      return { ...state, conversations: action.value };
    case "SET_ACTIVE_CONVERSATION":
      return { ...state, activeConversation: action.value };
    case "ADD_MESSAGE": {
      const msg = action.value.message || action.value;
      return {
        ...state,
        activeConversation: {
          ...state.activeConversation,
          messages: [...(state.activeConversation?.messages || []), msg],
        },
      };
    }
    case "SET_MEMORIES":
      return { ...state, memories: action.value };
    case "ADD_MEMORY":
      return { ...state, memories: [...state.memories, action.value] };
    case "UPDATE_MEMORY":
      return {
        ...state,
        memories: state.memories.map((m) => (m.id === action.value.id ? { ...m, ...action.value } : m)),
      };
    case "REMOVE_MEMORY":
      return { ...state, memories: state.memories.filter((m) => m.id !== action.value.id) };
    // Message Board
    case "SET_MESSAGES":
      return { ...state, messages: action.value };
    case "ADD_MESSAGE_BOARD":
      return { ...state, messages: [action.value, ...state.messages] };
    case "UPDATE_MESSAGE_BOARD": {
      const messages = state.messages.map((m) => (m.id === action.value.id ? { ...m, ...action.value } : m));
      return { ...state, messages };
    }
    case "REMOVE_MESSAGE_BOARD":
      return { ...state, messages: state.messages.filter((m) => m.id !== action.value) };
    // ── Routines ──
    case "SET_ROUTINES":
      return { ...state, routines: action.value };
    case "ADD_ROUTINE":
      return { ...state, routines: [...state.routines, action.value] };
    case "UPDATE_ROUTINE":
      return { ...state, routines: state.routines.map((r) => (r.id === action.value.id ? { ...r, ...action.value } : r)) };
    case "REMOVE_ROUTINE":
      return { ...state, routines: state.routines.filter((r) => r.id !== action.value) };
    case "ADD_ROUTINE_STEP": {
      return {
        ...state,
        routines: state.routines.map((r) =>
          r.id === action.value.routine_id
            ? { ...r, steps: [...(r.steps || []), action.value] }
            : r
        ),
      };
    }
    case "UPDATE_ROUTINE_STEP": {
      return {
        ...state,
        routines: state.routines.map((r) => ({
          ...r,
          steps: (r.steps || []).map((s) => (s.id === action.value.id ? { ...s, ...action.value } : s)),
        })),
      };
    }
    case "REMOVE_ROUTINE_STEP": {
      return {
        ...state,
        routines: state.routines.map((r) => ({
          ...r,
          steps: (r.steps || []).filter((s) => s.id !== action.value),
        })),
      };
    }
    case "COMPLETE_ROUTINE_STEP": {
      const { routine_step_id, member_id: cMemberId } = action.value;
      const completion = {
        id: crypto.randomUUID(),
        routine_step_id,
        member_id: cMemberId,
        completed_date: todayStr,
        completed_at: new Date().toISOString(),
      };
      // Find the step to award points
      let stepPoints = 0;
      const updatedRoutines = state.routines.map((r) => ({
        ...r,
        steps: (r.steps || []).map((s) => {
          if (s.id === routine_step_id) {
            stepPoints = s.points_value || 5;
            return { ...s, completions: [...(s.completions || []), completion] };
          }
          return s;
        }),
      }));
      // Award points + weekly stars to member
      const updatedMembers = state.members.map((m) => {
        if (m.id === cMemberId && stepPoints > 0) {
          const newPts = m.points + stepPoints;
          return { ...m, points: newPts, level: Math.floor(newPts / 100) + 1, weekly_stars: (m.weekly_stars || 0) + stepPoints };
        }
        return m;
      });
      return { ...state, routines: updatedRoutines, members: updatedMembers };
    }
    case "UNCOMPLETE_ROUTINE_STEP": {
      const { routine_step_id: uncStepId, member_id: uncMemberId } = action.value;
      let uncPoints = 0;
      const uncRoutines = state.routines.map((r) => ({
        ...r,
        steps: (r.steps || []).map((s) => {
          if (s.id === uncStepId) {
            uncPoints = s.points_value || 5;
            const completions = (s.completions || []).filter(
              (c) => !(c.member_id === uncMemberId && c.completed_date === todayStr)
            );
            return { ...s, completions };
          }
          return s;
        }),
      }));
      const uncMembers = state.members.map((m) => {
        if (m.id === uncMemberId && uncPoints > 0) {
          const newPts = Math.max(0, m.points - uncPoints);
          return { ...m, points: newPts, level: Math.floor(newPts / 100) + 1, weekly_stars: Math.max(0, (m.weekly_stars || 0) - uncPoints) };
        }
        return m;
      });
      return { ...state, routines: uncRoutines, members: uncMembers };
    }
    // ── Mood Check-ins ──
    case "SET_MOOD_CHECKINS":
      return { ...state, moodCheckins: action.value };
    case "ADD_MOOD_CHECKIN": {
      // Upsert: replace existing check-in for same member+date
      const existing = state.moodCheckins.find(
        (m) => m.member_id === action.value.member_id && m.checkin_date === action.value.checkin_date
      );
      if (existing) {
        return {
          ...state,
          moodCheckins: state.moodCheckins.map((m) =>
            m.id === existing.id ? { ...m, ...action.value } : m
          ),
        };
      }
      return { ...state, moodCheckins: [...state.moodCheckins, action.value] };
    }
    case "UPDATE_MOOD_CHECKIN":
      return {
        ...state,
        moodCheckins: state.moodCheckins.map((m) => (m.id === action.value.id ? { ...m, ...action.value } : m)),
      };
    // ── Allowance Transactions ──
    case "SET_ALLOWANCE_TRANSACTIONS":
      return { ...state, allowanceTransactions: action.value };
    case "ADD_ALLOWANCE_TRANSACTION":
      return { ...state, allowanceTransactions: [action.value, ...state.allowanceTransactions] };
    // ── Achievements ──
    case "SET_ACHIEVEMENTS":
      return { ...state, achievements: action.value };
    case "ADD_ACHIEVEMENT":
      return { ...state, achievements: [...state.achievements, action.value] };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

// ── DB ↔ App field mappers ──

function eventFromDb(row) {
  // Strip timezone suffix to treat stored time as local time (naive UTC in DB = intended local time)
  const stripTimezone = (isoString) => {
    if (!isoString) return null;
    return isoString.replace(/([+-]\d{2}:\d{2})$/, "").replace(/Z$/, "");
  };

  return {
    id: row.id,
    family_id: row.family_id,
    member_id: row.member_id,
    title: row.title,
    start: stripTimezone(row.start_time),
    end: stripTimezone(row.end_time),
    allDay: row.all_day,
    className: row.color || "info",
    source: row.source,
    google_event_id: row.google_event_id || null,
    updated_at: row.updated_at || null,
    recurrence_rule: row.recurrence_rule || null,
    reminder_minutes: row.reminder_minutes ?? null,
  };
}

function eventToDb(evt) {
  const row = {
    family_id: evt.family_id,
    member_id: evt.member_id || null,
    title: evt.title,
    start_time: evt.start,
    end_time: evt.end || evt.start,
    all_day: evt.allDay || false,
    color: evt.className || "info",
    source: evt.source || "manual",
    updated_at: new Date().toISOString(),
  };
  if (evt.google_event_id) row.google_event_id = evt.google_event_id;
  if (evt.id && !evt.id.startsWith("evt-")) row.id = evt.id;
  if (evt.recurrence_rule !== undefined) row.recurrence_rule = evt.recurrence_rule || null;
  if (evt.reminder_minutes !== undefined) row.reminder_minutes = evt.reminder_minutes;
  return row;
}

function taskFromDb(row) {
  return {
    ...row,
    due_time: row.due_time ? row.due_time.slice(0, 5) : "",
    completed_at: row.completed_at ? row.completed_at.split("T")[0] : null,
  };
}

function taskToDb(t) {
  const row = { ...t };
  if (row.due_time === "") row.due_time = null;
  delete row.visible;
  if (row.id && row.id.startsWith("task-")) delete row.id;
  return row;
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.getFullYear(), date.getMonth(), diff).toISOString().split("T")[0];
}

function memberFromDb(row) {
  const { google_refresh_token, ...rest } = row;
  const member = { ...rest, visible: true, has_server_sync: !!google_refresh_token };
  // Weekly stars reset check: if last reset was before this Monday, reset to 0
  const thisMonday = getMonday(new Date());
  if (!member.weekly_stars_reset_at || member.weekly_stars_reset_at < thisMonday) {
    member.weekly_stars = 0;
    member.weekly_stars_reset_at = thisMonday;
  }
  return member;
}

function memberToDb(m) {
  const row = { ...m };
  delete row.visible;
  delete row.has_server_sync;
  if (row.id && row.id.startsWith("member-")) delete row.id;
  return row;
}

// ── Supabase persistence (fire-and-forget, non-blocking) ──

function persist(table, action, payload) {
  if (action === "insert") {
    supabase.from(table).insert(payload).then(({ error }) => {
      if (error) console.warn(`[supabase] ${table} insert failed:`, error.message);
    });
  } else if (action === "update") {
    const { id, ...rest } = payload;
    supabase.from(table).update(rest).eq("id", id).then(({ error }) => {
      if (error) console.warn(`[supabase] ${table} update failed:`, error.message);
    });
  } else if (action === "delete") {
    supabase.from(table).delete().eq("id", payload).then(({ error }) => {
      if (error) console.warn(`[supabase] ${table} delete failed:`, error.message);
    });
  }
}

function FamilyProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { user } = useAuth();
  const userEmail = user?.email || null;

  // Supabase Realtime: subscribe to broadcast changes for this family.
  // Uses broadcast+triggers approach. Database triggers broadcast
  // INSERT/UPDATE/DELETE to topic "family:<id>".
  const familyIdRef = useRef(null);
  const channelRef = useRef(null);
  const [realtimeReady, setRealtimeReady] = useState(false);
  const [photosPage, setPhotosPage] = useState(0);
  const [hasMorePhotos, setHasMorePhotos] = useState(true);

  // Notification tracking: compare events before/after a remote refresh
  const prevEventsRef = useRef(null);       // snapshot before remote refresh
  const realtimeEventsFlagRef = useRef(false); // set true when refresh is triggered by remote broadcast

  // Wait for auth session to be fully established before subscribing.
  // Listen for the Supabase auth state change to ensure the client
  // has an active session token before opening the WebSocket.
  useEffect(() => {
    if (!user || !state.dataLoaded) return;
    let cancelled = false;

    const checkSession = async () => {
      // Wait for auth to fully initialize
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !cancelled) {
        setRealtimeReady(true);
        return;
      }
      // If no session yet, listen for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session && !cancelled) {
          setRealtimeReady(true);
          subscription.unsubscribe();
        }
      });
      // Fallback: try after 3 seconds regardless
      setTimeout(() => { if (!cancelled) setRealtimeReady(true); }, 3000);
    };

    checkSession().catch(() => { if (!cancelled) setRealtimeReady(true); });
    return () => { cancelled = true; };
  }, [user, state.dataLoaded]);

  useEffect(() => {
    const fid = state.family?.id;
    if (!fid || fid === "demo-family" || !realtimeReady) return;
    if (familyIdRef.current === fid) return;
    familyIdRef.current = fid;

    const url = supabase?.supabaseUrl || "";
    if (!url || url.includes("your-project")) return;

    const ACTION_MAP = {
      events: "SET_EVENTS", tasks: "SET_TASKS", family_members: "SET_MEMBERS",
      meals: "SET_MEALS", lists: "SET_LISTS", notes: "SET_NOTES",
      countdowns: "SET_COUNTDOWNS", rewards: "SET_REWARDS",
      family_messages: "SET_MESSAGES",
    };
    const MAPPER_MAP = { events: eventFromDb, tasks: taskFromDb, family_members: memberFromDb };

    // Debounce: avoid refetching the same table multiple times in quick succession
    const pendingRefresh = {};
    const refreshTable = async (table) => {
      if (pendingRefresh[table]) return;
      pendingRefresh[table] = true;
      setTimeout(() => { pendingRefresh[table] = false; }, 500);

      try {
        const { data } = await supabase.from(table).select("*").eq("family_id", fid);
        if (!data) return;
        if (table === "lists") {
          const ids = data.map((l) => l.id);
          const { data: items } = ids.length
            ? await supabase.from("list_items").select("*").in("list_id", ids)
            : { data: [] };
          dispatch({ type: "SET_LISTS", value: data.map((l) => ({ ...l, items: (items || []).filter((i) => i.list_id === l.id) })) });
          return;
        }
        const mapper = MAPPER_MAP[table];
        dispatch({ type: ACTION_MAP[table], value: mapper ? data.map(mapper) : data });
      } catch (err) {
        console.warn(`[realtime] Refresh ${table} failed:`, err.message);
      }
    };

    const channel = supabase.channel(`family:${fid}`, {
      config: { broadcast: { self: false, ack: true } },
    });

    // Listen for "change" broadcasts from OTHER clients.
    // When any client writes data, it broadcasts { event: "change", table: "events" }
    // and all other clients refetch that table.
    channel.on("broadcast", { event: "change" }, (payload) => {
      const table = payload.payload?.table;
      console.log("[realtime] Change on", table, "from another client");
      if (table === "events") {
        // Snapshot current events so the notification effect can diff them
        prevEventsRef.current = state.events.slice();
        realtimeEventsFlagRef.current = true;
      }
      if (table && ACTION_MAP[table]) refreshTable(table);
      if (table === "list_items") refreshTable("lists");
    });

    // Also listen for trigger-based broadcasts (if triggers are set up)
    ["INSERT", "UPDATE", "DELETE"].forEach((evt) => {
      channel.on("broadcast", { event: evt }, (payload) => {
        const table = payload.payload?.table || payload.table;
        if (table === "events") {
          prevEventsRef.current = state.events.slice();
          realtimeEventsFlagRef.current = true;
        }
        if (table && ACTION_MAP[table]) refreshTable(table);
        if (table === "list_items") refreshTable("lists");
      });
    });

    let fallbackStarted = false;
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        console.log("[realtime] Connected — instant sync active");
        channelRef.current = channel;
        // Cancel any fallback polling if realtime recovers
        if (channel._fallbackPoll) {
          clearInterval(channel._fallbackPoll);
          channel._fallbackPoll = null;
        }
      } else if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && !fallbackStarted) {
        fallbackStarted = true;
        console.log("[realtime] WebSocket unavailable — using 30s polling");
        channel._fallbackPoll = setInterval(async () => {
          for (const table of Object.keys(ACTION_MAP)) {
            await refreshTable(table);
          }
        }, 30000);
      }
    });

    return () => {
      familyIdRef.current = null;
      if (channel._fallbackPoll) clearInterval(channel._fallbackPoll);
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.family?.id, realtimeReady]);

  // Fire browser notifications when events change due to a remote (other-user) broadcast
  useEffect(() => {
    if (!realtimeEventsFlagRef.current) return;
    realtimeEventsFlagRef.current = false;

    const prev = prevEventsRef.current;
    if (!prev) return;

    const prevIds = new Set(prev.map((e) => e.id));
    const currIds = new Set(state.events.map((e) => e.id));

    // Determine actor name: look for the member who owns the changed event.
    // Fall back to "Someone" when member can't be resolved.
    const getActor = (memberIdOrNull) => {
      if (!memberIdOrNull) return "Someone";
      const m = state.members.find((mb) => mb.id === memberIdOrNull);
      return m ? m.name : "Someone";
    };

    // Added events
    state.events
      .filter((e) => !prevIds.has(e.id))
      .forEach((e) => notifyEventAdded(e, getActor(e.member_id)));

    // Deleted events
    prev
      .filter((e) => !currIds.has(e.id))
      .forEach((e) => notifyEventDeleted(e.title, getActor(e.member_id)));

    // Updated events (same id, different title or start time)
    state.events
      .filter((e) => {
        if (!prevIds.has(e.id)) return false; // already handled as added
        const old = prev.find((p) => p.id === e.id);
        return old && (old.title !== e.title || old.start !== e.start);
      })
      .forEach((e) => notifyEventUpdated(e, getActor(e.member_id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.events]);

  // Load from Supabase on mount (or when user changes)
  useEffect(() => {
    async function loadFromSupabase() {
      try {
        const url = supabase.supabaseUrl || "";
        if (!url || url.includes("your-project")) return;

        // Don't load until we have a user email (prevents loading ALL families)
        const joinedFamilyId = localStorage.getItem("famcal_joined_family_id");
        if (!userEmail && !joinedFamilyId) return;

        // Priority: 1) Joined family (via code), 2) Owner email, 3) Unclaimed family
        let families;
        let famErr;

        // Check if user previously joined a family via family code
        if (joinedFamilyId) {
          const result = await supabase.from("families").select("*").eq("id", joinedFamilyId);
          families = result.data;
          famErr = result.error;
          if (families && families.length > 0) {
            console.log("[family] Loaded joined family:", families[0].name);
          } else {
            // Joined family no longer exists, clear it
            localStorage.removeItem("famcal_joined_family_id");
            families = null;
          }
        }

        // Fallback: find family by owner email
        if (!families || families.length === 0) {
          if (userEmail) {
            const result = await supabase.from("families").select("*").eq("owner_email", userEmail);
            families = result.data;
            famErr = result.error;
            // If no family found for this email, check for unclaimed families
            if (!famErr && (!families || families.length === 0)) {
              const fallback = await supabase.from("families").select("*").is("owner_email", null);
              if (fallback.data && fallback.data.length > 0) {
                families = fallback.data;
                await supabase.from("families").update({ owner_email: userEmail }).eq("id", families[0].id);
                families[0].owner_email = userEmail;
              }
            }
          } else {
            // No email and no joined family — cannot determine which family to load
            // This guard prevents loading ALL families (data breach risk)
            console.warn("[family] No user email — skipping family load");
            return;
          }
        }

        if (famErr) {
          console.warn("[supabase] families query failed:", famErr.message);
          return;
        }

        dispatch({ type: "SET_SUPABASE_CONNECTED", value: true });

        let family;
        if (!families || families.length === 0) {
          // No family exists — create one linked to this user
          const insertData = { name: "My Family" };
          if (userEmail) insertData.owner_email = userEmail;
          const { data: newFam } = await supabase.from("families").insert(insertData).select();
          if (!newFam || !newFam[0]) return;
          family = newFam[0];
        } else {
          family = families[0];
        }

        dispatch({ type: "SET_FAMILY", value: family });

        // Restore google_client_id from DB to localStorage
        if (family.google_client_id) {
          localStorage.setItem("famcal_google_client_id", family.google_client_id);
        }

        // Load members
        const { data: dbMembers } = await supabase.from("family_members").select("*").eq("family_id", family.id);
        if (dbMembers) {
          const mapped = dbMembers.map(memberFromDb);
          dispatch({ type: "SET_MEMBERS", value: mapped });
          // Persist weekly star resets if any member was reset
          const thisMonday = getMonday(new Date());
          for (const m of mapped) {
            const raw = dbMembers.find((r) => r.id === m.id);
            if (raw && (!raw.weekly_stars_reset_at || raw.weekly_stars_reset_at < thisMonday)) {
              persist("family_members", "update", { id: m.id, weekly_stars: 0, weekly_stars_reset_at: thisMonday });
            }
          }
        }

        // Load tasks
        const { data: dbTasks } = await supabase.from("tasks").select("*").eq("family_id", family.id);
        if (dbTasks) dispatch({ type: "SET_TASKS", value: dbTasks.map(taskFromDb) });

        // Load events
        const { data: dbEvents } = await supabase.from("events").select("*").eq("family_id", family.id);
        if (dbEvents) dispatch({ type: "SET_EVENTS", value: dbEvents.map(eventFromDb) });

        // Load rewards — seed defaults if none exist
        const { data: dbRewards } = await supabase.from("rewards").select("*").eq("family_id", family.id);
        if (dbRewards && dbRewards.length > 0) {
          dispatch({ type: "SET_REWARDS", value: dbRewards });
        } else if (INITIAL_REWARDS.length > 0) {
          const rewardRows = INITIAL_REWARDS.map((r) => ({
            family_id: family.id,
            title: r.title,
            description: r.description,
            points_cost: r.points_cost,
            icon: r.icon,
          }));
          const { data: seeded } = await supabase.from("rewards").insert(rewardRows).select();
          if (seeded) dispatch({ type: "SET_REWARDS", value: seeded });
        }

        // ── Phase 1 critical: lists (used on dashboard/ambient) ──
        try {
          const { fetchLists } = await import("lib/supabase");
          const listsData = await fetchLists(family.id);
          dispatch({ type: "SET_LISTS", value: listsData });
        } catch (e) {
          console.log("[supabase] lists table not available yet:", e.message);
        }

        // Load routines with steps and today's completions
        try {
          const { data: dbRoutines } = await supabase
            .from("routines")
            .select("*")
            .eq("family_id", family.id)
            .order("sort_order", { ascending: true });
          if (dbRoutines && dbRoutines.length > 0) {
            const routineIds = dbRoutines.map((r) => r.id);
            const { data: dbSteps } = await supabase
              .from("routine_steps")
              .select("*")
              .in("routine_id", routineIds)
              .order("sort_order", { ascending: true });
            const todayDate = new Date().toISOString().split("T")[0];
            const { data: dbCompletions } = await supabase
              .from("routine_completions")
              .select("*")
              .eq("completed_date", todayDate);
            const routinesWithSteps = dbRoutines.map((r) => ({
              ...r,
              steps: (dbSteps || [])
                .filter((s) => s.routine_id === r.id)
                .map((s) => ({
                  ...s,
                  completions: (dbCompletions || []).filter((c) => c.routine_step_id === s.id),
                })),
            }));
            dispatch({ type: "SET_ROUTINES", value: routinesWithSteps });
          }
        } catch (e) {
          console.log("[supabase] routines tables not available yet:", e.message);
        }

        // Load mood check-ins (last 30 days)
        try {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const { data: dbMoods } = await supabase
            .from("mood_checkins")
            .select("*")
            .eq("family_id", family.id)
            .gte("checkin_date", thirtyDaysAgo.toISOString().split("T")[0])
            .order("checkin_date", { ascending: false });
          if (dbMoods) dispatch({ type: "SET_MOOD_CHECKINS", value: dbMoods });
        } catch (e) {
          console.log("[supabase] mood_checkins table not available yet:", e.message);
        }

        // Load allowance transactions (last 90 days)
        try {
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          const { data: dbTransactions } = await supabase
            .from("allowance_transactions")
            .select("*")
            .eq("family_id", family.id)
            .gte("created_at", ninetyDaysAgo.toISOString())
            .order("created_at", { ascending: false });
          if (dbTransactions) dispatch({ type: "SET_ALLOWANCE_TRANSACTIONS", value: dbTransactions });
        } catch (e) {
          console.log("[supabase] allowance_transactions table not available yet:", e.message);
        }

        // Load achievements
        try {
          const { data: dbAchievements } = await supabase
            .from("achievements")
            .select("*")
            .eq("family_id", family.id)
            .order("earned_at", { ascending: false });
          if (dbAchievements) dispatch({ type: "SET_ACHIEVEMENTS", value: dbAchievements });
        } catch (e) {
          console.log("[supabase] achievements table not available yet:", e.message);
        }

        // Mark critical data as loaded — app is interactive from this point
        dispatch({ type: "SET_DATA_LOADED", value: true });

        // ── Phase 2 deferred: heavy/non-critical data loaded after a short delay ──
        // Meals, photos, countdowns, notes, messages, and AI data are not needed on
        // the calendar page and are deferred to avoid blocking the initial render.
        setTimeout(() => {
          loadDeferredData(family.id);
        }, 1500);
      } catch (e) {
        console.warn("[supabase] Load failed, using local state:", e.message);
        // Still mark as loaded even on error, so app doesn't stay in loading state
        dispatch({ type: "SET_DATA_LOADED", value: true });
      }
    }
    loadFromSupabase();
  }, [userEmail]);

  // Wrap dispatch to persist mutations to Supabase + broadcast changes
  const persistingDispatch = useMemo(() => {
    // Map action types to table names for broadcast
    const ACTION_TABLE_MAP = {
      ADD_MEMBER: "family_members", UPDATE_MEMBER: "family_members", REMOVE_MEMBER: "family_members",
      ADD_TASK: "tasks", UPDATE_TASK: "tasks", COMPLETE_TASK: "tasks", UNCOMPLETE_TASK: "tasks", REMOVE_TASK: "tasks",
      ADD_EVENT: "events", UPDATE_EVENT: "events", REMOVE_EVENT: "events",
      ADD_REWARD: "rewards", CLAIM_REWARD: "rewards",
      ADD_MEAL: "meals", UPDATE_MEAL: "meals", REMOVE_MEAL: "meals",
      ADD_LIST: "lists", UPDATE_LIST: "lists", REMOVE_LIST: "lists",
      ADD_LIST_ITEM: "list_items", TOGGLE_LIST_ITEM: "list_items", REMOVE_LIST_ITEM: "list_items",
      ADD_NOTE: "notes", REMOVE_NOTE: "notes",
      ADD_COUNTDOWN: "countdowns", REMOVE_COUNTDOWN: "countdowns",
      ADD_MESSAGE_BOARD: "family_messages", UPDATE_MESSAGE_BOARD: "family_messages", REMOVE_MESSAGE_BOARD: "family_messages",
      ADD_ROUTINE: "routines", UPDATE_ROUTINE: "routines", REMOVE_ROUTINE: "routines",
      ADD_ROUTINE_STEP: "routine_steps", REMOVE_ROUTINE_STEP: "routine_steps",
      COMPLETE_ROUTINE_STEP: "routine_completions", UNCOMPLETE_ROUTINE_STEP: "routine_completions",
      ADD_MOOD_CHECKIN: "mood_checkins", UPDATE_MOOD_CHECKIN: "mood_checkins",
      ADD_ALLOWANCE_TRANSACTION: "allowance_transactions",
      ADD_ACHIEVEMENT: "achievements",
    };

    return (action) => {
      dispatch(action);

      // Broadcast change to other clients via realtime channel.
      // Delay 1.5s so Supabase INSERT completes before other clients refetch.
      const table = ACTION_TABLE_MAP[action.type];
      if (table && channelRef.current) {
        setTimeout(() => {
          if (channelRef.current) {
            channelRef.current.send({
              type: "broadcast",
              event: "change",
              payload: { table },
            }).catch(() => {});
          }
        }, 1500);
      }

      if (!state.isSupabaseConnected) {
        if (["ADD_MEAL", "UPDATE_AI_PREFERENCES", "SET_AI_PREFERENCES", "ADD_LIST_ITEM"].includes(action.type)) {
          console.warn("[persist] SKIPPED", action.type, "— Supabase not connected");
        }
        return;
      }

      switch (action.type) {
        case "ADD_MEMBER": {
          const row = memberToDb({ ...action.value, family_id: state.family.id });
          supabase.from("family_members").insert(row).select().then(({ data }) => {
            if (data && data[0]) dispatch({ type: "UPDATE_MEMBER", value: { ...memberFromDb(data[0]) } });
          });
          break;
        }
        case "UPDATE_MEMBER": {
          const mv = action.value;
          const updatePayload = { id: mv.id };
          if (mv.name !== undefined) updatePayload.name = mv.name;
          if (mv.avatar_color !== undefined) updatePayload.avatar_color = mv.avatar_color;
          if (mv.avatar_emoji !== undefined) updatePayload.avatar_emoji = mv.avatar_emoji;
          if (mv.points !== undefined) updatePayload.points = mv.points;
          if (mv.level !== undefined) updatePayload.level = mv.level;
          if (mv.streak_days !== undefined) updatePayload.streak_days = mv.streak_days;
          if (mv.avatar_url !== undefined) updatePayload.avatar_url = mv.avatar_url;
          if (mv.google_calendar_id !== undefined) updatePayload.google_calendar_id = mv.google_calendar_id;
          if (mv.birth_date !== undefined) updatePayload.birth_date = mv.birth_date;
          if (mv.allowance_balance !== undefined) updatePayload.allowance_balance = mv.allowance_balance;
          if (mv.allowance_rate !== undefined) updatePayload.allowance_rate = mv.allowance_rate;
          if (mv.weekly_stars !== undefined) updatePayload.weekly_stars = mv.weekly_stars;
          if (mv.weekly_stars_reset_at !== undefined) updatePayload.weekly_stars_reset_at = mv.weekly_stars_reset_at;
          persist("family_members", "update", updatePayload);
          break;
        }
        case "REMOVE_MEMBER":
          persist("family_members", "delete", action.value);
          break;
        case "ADD_TASK": {
          const row = taskToDb({ ...action.value, family_id: state.family.id });
          supabase.from("tasks").insert(row).select().then(({ data }) => {
            if (data && data[0]) dispatch({ type: "UPDATE_TASK", value: taskFromDb(data[0]) });
          });
          break;
        }
        case "COMPLETE_TASK": {
          const task = state.tasks.find((t) => t.id === action.value.taskId);
          if (task) {
            const completedFlag = !task.recurring; // recurring stays false
            const taskUpdate = { id: task.id, completed: completedFlag, completed_at: new Date().toISOString(), completed_by: action.value.memberId };
            // Rotation: persist rotation_index and new assigned_to
            if (task.recurring && task.rotation_members && task.rotation_members.length > 1) {
              const nextIdx = ((task.rotation_index || 0) + 1) % task.rotation_members.length;
              taskUpdate.rotation_index = nextIdx;
              taskUpdate.assigned_to = task.rotation_members[nextIdx];
            }
            persist("tasks", "update", taskUpdate);
            const member = state.members.find((m) => m.id === action.value.memberId);
            if (member) {
              const pmul = { high: 2, medium: 1, low: 0.5 };
              const earned = Math.ceil((task.points_value || 10) * (pmul[task.priority] || 1));
              const newPoints = member.points + earned;
              const newLevel = Math.floor(newPoints / 100) + 1;
              const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
              const yStr = yesterday.toISOString().split("T")[0];
              const hadYesterday = state.tasks.some((t) => t.completed_by === member.id && t.completed_at === yStr);
              const newStreak = hadYesterday ? (member.streak_days || 0) + 1 : 1;
              const newWeeklyStars = (member.weekly_stars || 0) + earned;
              persist("family_members", "update", { id: member.id, points: newPoints, level: newLevel, streak_days: newStreak, weekly_stars: newWeeklyStars });
              // Allowance: create transaction if member has allowance_rate
              if ((member.allowance_rate || 0) > 0) {
                const allowanceEarned = Math.round(earned * (member.allowance_rate / 100) * 100) / 100;
                if (allowanceEarned > 0) {
                  const newBal = (member.allowance_balance || 0) + allowanceEarned;
                  persist("family_members", "update", { id: member.id, allowance_balance: newBal });
                  supabase.from("allowance_transactions").insert({
                    family_id: state.family.id,
                    member_id: member.id,
                    amount: allowanceEarned,
                    type: "earned",
                    description: `Completed: ${task.title}`,
                    task_id: task.id,
                  }).then(({ error }) => {
                    if (error) console.warn("[supabase] allowance_transactions insert failed:", error.message);
                  });
                }
              }
            }
          }
          // Achievement check: run after state updates (setTimeout so reducer runs first)
          if (action.value.memberId) {
            setTimeout(() => {
              const newAchievements = checkAchievements(action.value.memberId, state);
              newAchievements.forEach((ach) => {
                dispatch({ type: "ADD_ACHIEVEMENT", value: ach });
                // Award bonus points
                if (ach.points_bonus > 0) {
                  const achMember = state.members.find((m) => m.id === action.value.memberId);
                  if (achMember) {
                    const newPts = achMember.points + ach.points_bonus;
                    dispatch({ type: "UPDATE_MEMBER", value: { id: achMember.id, points: newPts, level: Math.floor(newPts / 100) + 1 } });
                  }
                }
              });
            }, 100);
          }
          break;
        }
        case "UNCOMPLETE_TASK": {
          const task = state.tasks.find((t) => t.id === action.value.taskId);
          if (task) {
            const pmul = { high: 2, medium: 1, low: 0.5 };
            const earned = Math.ceil((task.points_value || 10) * (pmul[task.priority] || 1));
            persist("tasks", "update", { id: task.id, completed: false, completed_at: null, completed_by: null });
            const member = state.members.find((m) => m.id === task.completed_by);
            if (member) {
              const newPoints = Math.max(0, member.points - earned);
              const newWeeklyStars = Math.max(0, (member.weekly_stars || 0) - earned);
              persist("family_members", "update", { id: member.id, points: newPoints, level: Math.floor(newPoints / 100) + 1, weekly_stars: newWeeklyStars });
            }
          }
          break;
        }
        case "REMOVE_TASK":
          persist("tasks", "delete", action.value);
          break;
        case "ADD_EVENT": {
          const row = eventToDb({ ...action.value, family_id: state.family.id });
          supabase.from("events").insert(row).select().then(({ data }) => {
            if (data && data[0]) dispatch({ type: "UPDATE_EVENT", value: eventFromDb(data[0]) });
          });
          break;
        }
        case "UPDATE_EVENT": {
          const ev = action.value;
          // Skip Supabase update for temp IDs (not yet in DB)
          if (ev.id && ev.id.startsWith("evt-")) break;
          const evUpdate = { id: ev.id };
          if (ev.title !== undefined) evUpdate.title = ev.title;
          if (ev.start !== undefined) evUpdate.start_time = ev.start;
          if (ev.end !== undefined) evUpdate.end_time = ev.end;
          if (ev.allDay !== undefined) evUpdate.all_day = ev.allDay;
          if (ev.member_id !== undefined) evUpdate.member_id = ev.member_id;
          if (ev.google_event_id !== undefined) evUpdate.google_event_id = ev.google_event_id;
          if (ev.source !== undefined) evUpdate.source = ev.source;
          if (ev.className !== undefined) evUpdate.color = ev.className;
          if (ev.recurrence_rule !== undefined) evUpdate.recurrence_rule = ev.recurrence_rule;
          if (ev.reminder_minutes !== undefined) evUpdate.reminder_minutes = ev.reminder_minutes;
          evUpdate.updated_at = new Date().toISOString();
          persist("events", "update", evUpdate);
          break;
        }
        case "REMOVE_EVENT": {
          const evId = typeof action.value === "string" ? action.value : action.value?.id;
          if (evId && !evId.startsWith("evt-")) persist("events", "delete", evId);
          break;
        }
        case "ADD_REWARD": {
          if (action.value === "__replace__") break;
          const row = { family_id: state.family.id, title: action.value.title, description: action.value.description, points_cost: action.value.points_cost, icon: action.value.icon };
          supabase.from("rewards").insert(row).select().then(({ data }) => {
            if (data && data[0]) dispatch({ type: "UPDATE_REWARD_ID", value: { oldId: action.value.id, newRow: data[0] } });
          });
          break;
        }
        case "CLAIM_REWARD": {
          const member = state.members.find((m) => m.id === action.value.memberId);
          const reward = state.rewards.find((r) => r.id === action.value.rewardId);
          if (member && reward && member.points >= reward.points_cost) {
            persist("family_members", "update", { id: member.id, points: member.points - reward.points_cost });
          }
          break;
        }
        // ── v3 entities: meals, lists, notes, countdowns ──
        case "ADD_MEAL": {
          import("lib/supabase").then(({ upsertMeal }) => {
            const { id: _localId, ...mealData } = action.value;
            const row = { ...mealData, family_id: state.family.id };
            console.log("[persist] ADD_MEAL:", row);
            upsertMeal(row).then((result) => {
              if (result) console.log("[persist] Meal saved:", result.id);
              else console.warn("[persist] Meal save returned null — check Supabase logs");
            });
          }).catch((err) => console.error("[persist] ADD_MEAL import failed:", err));
          break;
        }
        case "UPDATE_MEAL": {
          import("lib/supabase").then(({ upsertMeal }) => {
            upsertMeal(action.value);
          });
          break;
        }
        case "REMOVE_MEAL": {
          const mealId = typeof action.value === "string" ? action.value : action.value?.id;
          // Only persist DELETE for real UUIDs (not composite keys like "2026-03-24-lunch")
          if (mealId && mealId.includes("-") && mealId.length > 30) {
            import("lib/supabase").then(({ deleteMeal }) => {
              deleteMeal(mealId);
            });
          }
          break;
        }
        case "ADD_LIST": {
          import("lib/supabase").then(({ createList }) => {
            const { items: _items, id: _localId, ...listData } = action.value;
            createList({ ...listData, family_id: state.family.id }).then((newList) => {
              if (newList) {
                // Replace temp ID with real UUID so future item adds use the correct ID
                dispatch({ type: "UPDATE_LIST", value: { id: action.value.id, ...newList } });
              }
            });
          });
          break;
        }
        case "ADD_LIST_ITEM": {
          import("lib/supabase").then(async ({ createListItem, fetchLists }) => {
            const item = action.value.item || action.value;
            const { id: _localId, ...itemData } = item;
            let listId = action.value.listId || item.list_id;
            // If list has a temp ID, resolve to real UUID with retry
            if (listId && listId.startsWith("list-")) {
              let resolved = null;
              for (let attempt = 0; attempt < 5; attempt++) {
                const dbLists = await fetchLists(state.family.id);
                resolved = dbLists?.find((l) =>
                  state.lists.some((sl) => sl.id === listId && sl.name.toLowerCase() === l.name.toLowerCase())
                );
                if (resolved) break;
                // Wait before retrying — list may still be inserting
                await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
              }
              if (resolved) listId = resolved.id;
              else { console.warn("[persist] ADD_LIST_ITEM: list not found after retries:", listId); return; }
            }
            if (listId) {
              createListItem({ ...itemData, list_id: listId });
            }
          });
          break;
        }
        case "TOGGLE_LIST_ITEM": {
          import("lib/supabase").then(({ updateListItem }) => {
            // Find the item to get its current checked state
            const list = state.lists.find((l) => l.id === action.value.listId);
            const item = list?.items?.find((i) => i.id === action.value.itemId);
            if (item) {
              updateListItem(item.id, { checked: !item.checked, checked_at: !item.checked ? new Date().toISOString() : null });
            }
          });
          break;
        }
        case "REMOVE_LIST_ITEM": {
          import("lib/supabase").then(({ deleteListItem }) => {
            deleteListItem(action.value.itemId || action.value.id);
          });
          break;
        }
        case "ADD_NOTE": {
          import("lib/supabase").then(({ createNote }) => {
            const { id: _localId, ...noteData } = action.value;
            createNote({ ...noteData, family_id: state.family.id });
          });
          break;
        }
        case "REMOVE_NOTE": {
          import("lib/supabase").then(({ deleteNote }) => {
            deleteNote(action.value.id || action.value);
          });
          break;
        }
        case "ADD_COUNTDOWN": {
          import("lib/supabase").then(({ createCountdown }) => {
            const { id: _localId, ...cdData } = action.value;
            createCountdown({ ...cdData, family_id: state.family.id });
          });
          break;
        }
        case "REMOVE_COUNTDOWN": {
          import("lib/supabase").then(({ deleteCountdown }) => {
            deleteCountdown(action.value.id || action.value);
          });
          break;
        }
        case "UPDATE_TASK": {
          if (action.value.id && action.value.id.startsWith("task-")) break;
          const taskRow = taskToDb(action.value);
          persist("tasks", "update", taskRow);
          break;
        }
        case "UPDATE_LIST": {
          const { id, ...updates } = action.value;
          if (id && !id.startsWith("list-")) {
            supabase.from("lists").update(updates).eq("id", id).then(({ error }) => {
              if (error) console.warn("[supabase] lists update failed:", error.message);
            });
          }
          break;
        }
        case "REMOVE_LIST": {
          const listId = typeof action.value === "string" ? action.value : action.value?.id;
          if (listId && !listId.startsWith("list-")) {
            // Delete list items first (cascade), then the list
            supabase.from("list_items").delete().eq("list_id", listId).then(() => {
              supabase.from("lists").delete().eq("id", listId).then(({ error }) => {
                if (error) console.warn("[supabase] lists delete failed:", error.message);
              });
            });
          }
          break;
        }
        case "UPDATE_NOTE": {
          import("lib/supabase").then(({ updateNote }) => {
            if (action.value?.id && !action.value.id.startsWith("note-")) {
              updateNote(action.value.id, action.value);
            }
          });
          break;
        }
        case "UPDATE_MEMORY": {
          import("lib/supabase").then(({ updateMemory }) => {
            if (action.value?.id) {
              updateMemory(action.value.id, action.value);
            }
          });
          break;
        }
        case "SET_FAMILY": {
          if (action.value.id && !action.value.id.startsWith("demo")) {
            const famUpdate = { id: action.value.id, name: action.value.name };
            if (action.value.google_client_id !== undefined) {
              famUpdate.google_client_id = action.value.google_client_id;
              localStorage.setItem("famcal_google_client_id", action.value.google_client_id);
            }
            if (action.value.setup_done !== undefined) {
              famUpdate.setup_done = action.value.setup_done;
            }
            if (action.value.weather_location !== undefined) {
              famUpdate.weather_location = action.value.weather_location;
            }
            if (action.value.kiosk_enabled !== undefined) {
              famUpdate.kiosk_enabled = action.value.kiosk_enabled;
            }
            if (action.value.photo_interval !== undefined) {
              famUpdate.photo_interval = action.value.photo_interval;
            }
            if (action.value.idle_timeout !== undefined) {
              famUpdate.idle_timeout = action.value.idle_timeout;
            }
            if (action.value.font_scale !== undefined) {
              famUpdate.font_scale = action.value.font_scale;
            }
            if (action.value.dashboard_slug !== undefined) {
              famUpdate.dashboard_slug = action.value.dashboard_slug;
            }
            if (action.value.dashboard_token !== undefined) {
              famUpdate.dashboard_token = action.value.dashboard_token;
            }
            if (action.value.theme_preset !== undefined) {
              famUpdate.theme_preset = action.value.theme_preset;
            }
            if (action.value.dark_mode !== undefined) {
              famUpdate.dark_mode = action.value.dark_mode;
            }
            persist("families", "update", famUpdate);
          }
          break;
        }
        case "SET_AI_PREFERENCES":
        case "UPDATE_AI_PREFERENCES": {
          import("lib/supabase").then(({ updateAIPreferences }) => {
            const prefs = action.type === "SET_AI_PREFERENCES" ? action.value : action.value;
            console.log("[persist] Saving AI preferences:", prefs);
            updateAIPreferences(state.family.id, prefs).then((result) => {
              if (result) console.log("[persist] AI preferences saved:", result);
              else console.warn("[persist] AI preferences save returned null — check Supabase");
            });
          }).catch((err) => console.error("[persist] Dynamic import failed:", err));
          break;
        }
        case "ADD_MESSAGE": {
          const msg = action.value.message || action.value;
          import("lib/supabase").then(({ createMessage }) => {
            if (state.activeConversation) {
              createMessage(
                state.activeConversation.id,
                msg.role,
                msg.content,
                msg.actions || []
              );
            }
          });
          break;
        }
        case "ADD_MEMORY": {
          import("lib/supabase").then(({ createMemory }) => {
            createMemory(
              state.family.id,
              action.value.category,
              action.value.content,
              action.value.source_conversation_id || null
            );
          });
          break;
        }
        case "REMOVE_MEMORY": {
          import("lib/supabase").then(({ deleteMemory }) => {
            deleteMemory(action.value.id);
          });
          break;
        }
        // ── Message Board ──
        case "ADD_MESSAGE_BOARD": {
          const { id: _localId, ...msgData } = action.value;
          const row = { ...msgData, family_id: state.family.id };
          supabase.from("family_messages").insert(row).select().then(({ data }) => {
            if (data && data[0]) dispatch({ type: "UPDATE_MESSAGE_BOARD", value: { id: action.value.id, ...data[0] } });
          });
          break;
        }
        case "UPDATE_MESSAGE_BOARD": {
          const msgId = action.value.id;
          if (msgId && !msgId.startsWith("msg-")) {
            const { id, ...updates } = action.value;
            supabase.from("family_messages").update(updates).eq("id", id).then(({ error }) => {
              if (error) console.warn("[supabase] family_messages update failed:", error.message);
            });
          }
          break;
        }
        case "REMOVE_MESSAGE_BOARD": {
          const msgId = typeof action.value === "string" ? action.value : action.value?.id;
          if (msgId && !msgId.startsWith("msg-")) {
            supabase.from("family_messages").delete().eq("id", msgId).then(({ error }) => {
              if (error) console.warn("[supabase] family_messages delete failed:", error.message);
            });
          }
          break;
        }
        // ── Routines ──
        case "ADD_ROUTINE": {
          const { steps: rSteps, id: _rId, ...routineData } = action.value;
          const rRow = { ...routineData, family_id: state.family.id };
          supabase.from("routines").insert(rRow).select().then(({ data }) => {
            if (data && data[0]) {
              const realId = data[0].id;
              dispatch({ type: "UPDATE_ROUTINE", value: { id: action.value.id, ...data[0], steps: rSteps || [] } });
              // Insert steps
              if (rSteps && rSteps.length > 0) {
                const stepRows = rSteps.map((s, idx) => ({
                  routine_id: realId,
                  title: s.title,
                  icon: s.icon || "check_circle",
                  duration_minutes: s.duration_minutes || 5,
                  points_value: s.points_value || 5,
                  sort_order: idx,
                }));
                supabase.from("routine_steps").insert(stepRows).select().then(({ data: stepData }) => {
                  if (stepData) {
                    dispatch({ type: "UPDATE_ROUTINE", value: { id: realId, steps: stepData.map((s) => ({ ...s, completions: [] })) } });
                  }
                });
              }
            }
          });
          break;
        }
        case "UPDATE_ROUTINE": {
          const { id: rId, steps: _rSteps, ...rUpdates } = action.value;
          if (rId && !rId.startsWith("routine-")) {
            const cleanUpdates = {};
            if (rUpdates.name !== undefined) cleanUpdates.name = rUpdates.name;
            if (rUpdates.type !== undefined) cleanUpdates.type = rUpdates.type;
            if (rUpdates.icon !== undefined) cleanUpdates.icon = rUpdates.icon;
            if (rUpdates.sort_order !== undefined) cleanUpdates.sort_order = rUpdates.sort_order;
            if (rUpdates.active !== undefined) cleanUpdates.active = rUpdates.active;
            if (rUpdates.member_id !== undefined) cleanUpdates.member_id = rUpdates.member_id;
            if (Object.keys(cleanUpdates).length > 0) {
              supabase.from("routines").update(cleanUpdates).eq("id", rId).then(({ error }) => {
                if (error) console.warn("[supabase] routines update failed:", error.message);
              });
            }
          }
          break;
        }
        case "REMOVE_ROUTINE": {
          const rDelId = typeof action.value === "string" ? action.value : action.value?.id;
          if (rDelId && !rDelId.startsWith("routine-")) {
            persist("routines", "delete", rDelId);
          }
          break;
        }
        case "ADD_ROUTINE_STEP": {
          const { id: _sId, completions: _sComps, ...stepData } = action.value;
          if (stepData.routine_id && !stepData.routine_id.startsWith("routine-")) {
            supabase.from("routine_steps").insert(stepData).select().then(({ data }) => {
              if (data && data[0]) {
                dispatch({ type: "UPDATE_ROUTINE_STEP", value: { id: action.value.id, ...data[0], completions: [] } });
              }
            });
          }
          break;
        }
        case "UPDATE_ROUTINE_STEP": {
          const { id: sId, completions: _sComps2, ...sUpdates } = action.value;
          if (sId && !sId.startsWith("step-")) {
            const cleanSUpdates = {};
            if (sUpdates.title !== undefined) cleanSUpdates.title = sUpdates.title;
            if (sUpdates.icon !== undefined) cleanSUpdates.icon = sUpdates.icon;
            if (sUpdates.duration_minutes !== undefined) cleanSUpdates.duration_minutes = sUpdates.duration_minutes;
            if (sUpdates.points_value !== undefined) cleanSUpdates.points_value = sUpdates.points_value;
            if (sUpdates.sort_order !== undefined) cleanSUpdates.sort_order = sUpdates.sort_order;
            if (Object.keys(cleanSUpdates).length > 0) {
              supabase.from("routine_steps").update(cleanSUpdates).eq("id", sId).then(({ error }) => {
                if (error) console.warn("[supabase] routine_steps update failed:", error.message);
              });
            }
          }
          break;
        }
        case "REMOVE_ROUTINE_STEP": {
          const sDelId = typeof action.value === "string" ? action.value : action.value?.id;
          if (sDelId && !sDelId.startsWith("step-")) {
            persist("routine_steps", "delete", sDelId);
          }
          break;
        }
        case "COMPLETE_ROUTINE_STEP": {
          const { routine_step_id: csId, member_id: csMemberId } = action.value;
          const csRow = {
            routine_step_id: csId,
            member_id: csMemberId,
            completed_date: new Date().toISOString().split("T")[0],
          };
          supabase.from("routine_completions").insert(csRow).then(({ error }) => {
            if (error) console.warn("[supabase] routine_completions insert failed:", error.message);
          });
          // Award points + weekly stars to member
          const csStep = state.routines.flatMap((r) => r.steps || []).find((s) => s.id === csId);
          if (csStep) {
            const csMember = state.members.find((m) => m.id === csMemberId);
            if (csMember) {
              const newPts = csMember.points + (csStep.points_value || 5);
              const newWS = (csMember.weekly_stars || 0) + (csStep.points_value || 5);
              persist("family_members", "update", { id: csMemberId, points: newPts, level: Math.floor(newPts / 100) + 1, weekly_stars: newWS });
            }
          }
          break;
        }
        case "UNCOMPLETE_ROUTINE_STEP": {
          const { routine_step_id: ucId, member_id: ucMemberId } = action.value;
          const ucToday = new Date().toISOString().split("T")[0];
          supabase.from("routine_completions")
            .delete()
            .eq("routine_step_id", ucId)
            .eq("member_id", ucMemberId)
            .eq("completed_date", ucToday)
            .then(({ error }) => {
              if (error) console.warn("[supabase] routine_completions delete failed:", error.message);
            });
          // Deduct points + weekly stars
          const ucStep = state.routines.flatMap((r) => r.steps || []).find((s) => s.id === ucId);
          if (ucStep) {
            const ucMember = state.members.find((m) => m.id === ucMemberId);
            if (ucMember) {
              const newPts = Math.max(0, ucMember.points - (ucStep.points_value || 5));
              const newWS = Math.max(0, (ucMember.weekly_stars || 0) - (ucStep.points_value || 5));
              persist("family_members", "update", { id: ucMemberId, points: newPts, level: Math.floor(newPts / 100) + 1, weekly_stars: newWS });
            }
          }
          break;
        }
        // ── Mood Check-ins ──
        case "ADD_MOOD_CHECKIN": {
          const { id: _mId, ...moodData } = action.value;
          const mRow = { ...moodData, family_id: state.family.id };
          // Upsert: use ON CONFLICT for member_id + checkin_date unique constraint
          supabase.from("mood_checkins").upsert(mRow, { onConflict: "member_id,checkin_date" }).select().then(({ data }) => {
            if (data && data[0]) {
              dispatch({ type: "UPDATE_MOOD_CHECKIN", value: data[0] });
            }
          });
          break;
        }
        case "UPDATE_MOOD_CHECKIN": {
          const { id: mcId, ...mcUpdates } = action.value;
          if (mcId && !mcId.startsWith("mood-")) {
            const clean = {};
            if (mcUpdates.mood !== undefined) clean.mood = mcUpdates.mood;
            if (mcUpdates.note !== undefined) clean.note = mcUpdates.note;
            if (Object.keys(clean).length > 0) {
              supabase.from("mood_checkins").update(clean).eq("id", mcId).then(({ error }) => {
                if (error) console.warn("[supabase] mood_checkins update failed:", error.message);
              });
            }
          }
          break;
        }
        // ── Allowance Transactions ──
        case "ADD_ALLOWANCE_TRANSACTION": {
          const { id: _atId, ...atData } = action.value;
          const atRow = { ...atData, family_id: state.family.id };
          supabase.from("allowance_transactions").insert(atRow).then(({ error }) => {
            if (error) console.warn("[supabase] allowance_transactions insert failed:", error.message);
          });
          // Also update member's allowance_balance
          if (action.value.member_id) {
            const atMember = state.members.find((m) => m.id === action.value.member_id);
            if (atMember) {
              const newBal = (atMember.allowance_balance || 0) + action.value.amount;
              persist("family_members", "update", { id: atMember.id, allowance_balance: newBal });
            }
          }
          break;
        }
        // ── Achievements ──
        case "ADD_ACHIEVEMENT": {
          const { id: _achId, ...achData } = action.value;
          const achRow = { ...achData, family_id: state.family.id };
          supabase.from("achievements").insert(achRow).then(({ error }) => {
            if (error && !error.message.includes("duplicate")) {
              console.warn("[supabase] achievements insert failed:", error.message);
            }
          });
          break;
        }
        default:
          break;
      }
    };
  }, [state.isSupabaseConnected, state.family.id, state.tasks, state.members, state.rewards]);

  // ── Deferred data loader ──
  // Loads non-critical data (meals, photos, countdowns, notes, messages, AI).
  // Called automatically 1.5 s after critical data is ready, and can also be
  // called directly from page components that need the data immediately.
  const loadDeferredData = async (familyId) => {
    if (!familyId || familyId === "demo-family") return;
    console.log("[deferred-load] Starting deferred data load for family:", familyId);
    try {
      const { fetchMeals, fetchNotes, fetchCountdowns, fetchPhotos } = await import("lib/supabase");

      // Calculate current week for meals
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

      const [mealsData, notesData, countdownsData, photosData] = await Promise.all([
        fetchMeals(familyId, weekStart.toISOString().split("T")[0], weekEnd.toISOString().split("T")[0]),
        fetchNotes(familyId),
        fetchCountdowns(familyId),
        fetchPhotos(familyId, 0),
      ]);

      dispatch({ type: "SET_MEALS", value: mealsData });
      dispatch({ type: "SET_NOTES", value: notesData });
      dispatch({ type: "SET_COUNTDOWNS", value: countdownsData });
      dispatch({ type: "SET_PHOTOS", value: photosData });
      setPhotosPage(0);
      setHasMorePhotos(photosData.length === 50);
    } catch (e) {
      console.warn("[deferred-load] v3 tables error:", e.message);
    }

    // Messages
    try {
      const { data: dbMessages } = await supabase
        .from("family_messages")
        .select("*")
        .eq("family_id", familyId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (dbMessages) dispatch({ type: "SET_MESSAGES", value: dbMessages });
    } catch (e) {
      console.warn("[deferred-load] family_messages error:", e.message);
    }

    // AI Assistant data
    try {
      const { fetchAIPreferences, fetchMemories, fetchConversations } = await import("lib/supabase");
      const [aiPrefs, memoriesData, conversationsData] = await Promise.all([
        fetchAIPreferences(familyId),
        fetchMemories(familyId),
        fetchConversations(familyId, 10),
      ]);
      if (aiPrefs) dispatch({ type: "SET_AI_PREFERENCES", value: aiPrefs });
      dispatch({ type: "SET_MEMORIES", value: memoriesData || [] });
      dispatch({ type: "SET_CONVERSATIONS", value: conversationsData || [] });
    } catch (e) {
      console.warn("[deferred-load] AI tables error:", e.message);
    }
  };

  const loadMorePhotos = async () => {
    if (!hasMorePhotos || !state.family?.id || state.family.id === "demo-family") return;
    try {
      const { fetchPhotos } = await import("lib/supabase");
      const nextPage = photosPage + 1;
      const newPhotos = await fetchPhotos(state.family.id, nextPage);
      if (newPhotos.length === 0) {
        setHasMorePhotos(false);
      } else {
        dispatch({ type: "SET_PHOTOS", value: [...state.photos, ...newPhotos] });
        setPhotosPage(nextPage);
        if (newPhotos.length < 50) setHasMorePhotos(false);
      }
    } catch (e) {
      console.warn("[loadMorePhotos] failed:", e.message);
    }
  };

  const value = useMemo(
    () => [state, persistingDispatch, { hasMorePhotos, loadMorePhotos, loadDeferredData }],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, persistingDispatch, hasMorePhotos]
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

function useFamilyController() {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error("useFamilyController should be used inside FamilyProvider.");
  }
  return context;
}

FamilyProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export {
  FamilyContext,
  FamilyProvider,
  useFamilyController,
  reducer as familyReducer,
  MEMBER_COLORS,
  TASK_CATEGORIES,
  ACHIEVEMENT_DEFS,
};
