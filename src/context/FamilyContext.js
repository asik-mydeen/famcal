import { createContext, useContext, useReducer, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import { supabase } from "lib/supabase";
import { useAuth } from "context/AuthContext";
import { getTokens } from "theme/tokens";

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
          return {
            ...t,
            completed: !t.recurring,
            completed_at: completionDate,
            completed_by: action.value.memberId,
          };
        }
        return t;
      });
      // Award points with priority multiplier + update streak
      const PRIORITY_MULTIPLIER = { high: 2, medium: 1, low: 0.5 };
      const multiplier = PRIORITY_MULTIPLIER[task.priority] || 1;
      const earnedPoints = Math.ceil((task.points_value || 10) * multiplier);
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
          return { ...m, points: newPoints, level: newLevel, streak_days: newStreak };
        }
        return m;
      });
      return { ...state, tasks, members };
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
          return { ...m, points: newPoints, level: newLevel };
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
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

// ── DB ↔ App field mappers ──

function eventFromDb(row) {
  return {
    id: row.id,
    family_id: row.family_id,
    member_id: row.member_id,
    title: row.title,
    start: row.start_time,
    end: row.end_time,
    allDay: row.all_day,
    className: row.color || "info",
    source: row.source,
    google_event_id: row.google_event_id || null,
    updated_at: row.updated_at || null,
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

function memberFromDb(row) {
  return { ...row, visible: true };
}

function memberToDb(m) {
  const row = { ...m };
  delete row.visible;
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
        if (dbMembers) dispatch({ type: "SET_MEMBERS", value: dbMembers.map(memberFromDb) });

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

        // Load v3 data (meals, lists, notes, countdowns, photos) in parallel
        try {
          const { fetchMeals, fetchLists, fetchNotes, fetchCountdowns, fetchPhotos } = await import("lib/supabase");

          // Calculate current week for meals
          const now = new Date();
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

          const [mealsData, listsData, notesData, countdownsData, photosData] = await Promise.all([
            fetchMeals(family.id, weekStart.toISOString().split("T")[0], weekEnd.toISOString().split("T")[0]),
            fetchLists(family.id),
            fetchNotes(family.id),
            fetchCountdowns(family.id),
            fetchPhotos(family.id),
          ]);

          dispatch({ type: "SET_MEALS", value: mealsData });
          dispatch({ type: "SET_LISTS", value: listsData });
          dispatch({ type: "SET_NOTES", value: notesData });
          dispatch({ type: "SET_COUNTDOWNS", value: countdownsData });
          dispatch({ type: "SET_PHOTOS", value: photosData });
        } catch (e) {
          console.log("[supabase] v3 tables not available yet:", e.message);
        }

        // Load AI Assistant data
        try {
          const { fetchAIPreferences, fetchMemories, fetchConversations } = await import("lib/supabase");
          const [aiPrefs, memoriesData, conversationsData] = await Promise.all([
            fetchAIPreferences(family.id),
            fetchMemories(family.id),
            fetchConversations(family.id, 10),
          ]);

          console.log("[ai-load] Preferences:", aiPrefs ? "loaded" : "none", aiPrefs?.cuisine_preferences || "");
          console.log("[ai-load] Memories:", memoriesData?.length || 0);
          console.log("[ai-load] Conversations:", conversationsData?.length || 0);
          if (aiPrefs) dispatch({ type: "SET_AI_PREFERENCES", value: aiPrefs });
          dispatch({ type: "SET_MEMORIES", value: memoriesData || [] });
          dispatch({ type: "SET_CONVERSATIONS", value: conversationsData || [] });
        } catch (e) {
          console.log("[supabase] AI tables not available yet:", e.message);
        }

        // Mark data as loaded after all queries complete
        dispatch({ type: "SET_DATA_LOADED", value: true });
      } catch (e) {
        console.warn("[supabase] Load failed, using local state:", e.message);
        // Still mark as loaded even on error, so app doesn't stay in loading state
        dispatch({ type: "SET_DATA_LOADED", value: true });
      }
    }
    loadFromSupabase();
  }, [userEmail]);

  // Wrap dispatch to persist mutations to Supabase
  const persistingDispatch = useMemo(() => {
    return (action) => {
      dispatch(action);

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
            persist("tasks", "update", { id: task.id, completed: completedFlag, completed_at: new Date().toISOString(), completed_by: action.value.memberId });
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
              persist("family_members", "update", { id: member.id, points: newPoints, level: newLevel, streak_days: newStreak });
            }
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
              persist("family_members", "update", { id: member.id, points: newPoints, level: Math.floor(newPoints / 100) + 1 });
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
          const evUpdate = { id: ev.id };
          if (ev.title !== undefined) evUpdate.title = ev.title;
          if (ev.start !== undefined) evUpdate.start_time = ev.start;
          if (ev.end !== undefined) evUpdate.end_time = ev.end;
          if (ev.allDay !== undefined) evUpdate.all_day = ev.allDay;
          if (ev.google_event_id !== undefined) evUpdate.google_event_id = ev.google_event_id;
          if (ev.source !== undefined) evUpdate.source = ev.source;
          if (ev.className !== undefined) evUpdate.color = ev.className;
          evUpdate.updated_at = new Date().toISOString();
          persist("events", "update", evUpdate);
          break;
        }
        case "REMOVE_EVENT":
          persist("events", "delete", action.value);
          break;
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
        default:
          break;
      }
    };
  }, [state.isSupabaseConnected, state.family.id, state.tasks, state.members, state.rewards]);

  const value = useMemo(() => [state, persistingDispatch], [state, persistingDispatch]);

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
};
