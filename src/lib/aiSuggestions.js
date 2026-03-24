/**
 * Dynamic AI Suggestion Engine
 * Returns contextual quick-action prompts based on time, page, and activity state
 */

/**
 * Get time of day category from hour
 * @param {number} hour - 0-23
 * @returns {string} - "morning" | "afternoon" | "evening" | "night"
 */
function getTimeOfDay(hour) {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 23) return "evening";
  return "night";
}

/**
 * Get time-based suggestions
 * @param {string} timeOfDay
 * @returns {Array<{icon: string, label: string, prompt: string}>}
 */
function getTimeSuggestions(timeOfDay) {
  const suggestions = {
    morning: [
      {
        icon: "restaurant",
        label: "Plan breakfast",
        prompt: "What should we have for breakfast today?",
      },
      {
        icon: "event",
        label: "Today's schedule",
        prompt: "What's on the schedule for today?",
      },
    ],
    afternoon: [
      {
        icon: "lunch_dining",
        label: "Lunch ideas",
        prompt: "What's for lunch today?",
      },
      {
        icon: "task_alt",
        label: "Task status",
        prompt: "Which tasks are completed so far today?",
      },
    ],
    evening: [
      {
        icon: "dinner_dining",
        label: "Dinner plans",
        prompt: "What's for dinner tonight?",
      },
      {
        icon: "event_note",
        label: "Prep tomorrow",
        prompt: "What do we need to prepare for tomorrow?",
      },
    ],
    night: [
      {
        icon: "calendar_today",
        label: "Tomorrow's schedule",
        prompt: "What's on the schedule for tomorrow?",
      },
      {
        icon: "bedtime",
        label: "Evening tasks",
        prompt: "What tasks need to be done before bed?",
      },
    ],
  };

  return suggestions[timeOfDay] || suggestions.evening;
}

/**
 * Get page-based suggestions
 * @param {string} currentPage
 * @returns {Array<{icon: string, label: string, prompt: string}>}
 */
function getPageSuggestions(currentPage) {
  const suggestions = {
    "/calendar": [
      {
        icon: "event",
        label: "Today's events",
        prompt: "What's happening today?",
      },
      {
        icon: "add_circle",
        label: "Add event",
        prompt: "Add an event for tomorrow at 3pm",
      },
      {
        icon: "event_available",
        label: "This week",
        prompt: "What's on the calendar this week?",
      },
    ],
    "/chores": [
      {
        icon: "checklist",
        label: "Pending tasks",
        prompt: "What tasks are still pending?",
      },
      {
        icon: "person_add",
        label: "Assign chore",
        prompt: "Assign a chore to the kids",
      },
      {
        icon: "warning",
        label: "Overdue tasks",
        prompt: "Which chores are overdue?",
      },
    ],
    "/meals": [
      {
        icon: "restaurant_menu",
        label: "Today's meals",
        prompt: "What meals are planned for today?",
      },
      {
        icon: "calendar_month",
        label: "Weekly meal plan",
        prompt: "Plan this week's meals",
      },
      {
        icon: "local_dining",
        label: "Meal ideas",
        prompt: "Give me dinner ideas for this week",
      },
    ],
    "/lists": [
      {
        icon: "shopping_cart",
        label: "Grocery needs",
        prompt: "What groceries do we need to buy?",
      },
      {
        icon: "add_shopping_cart",
        label: "Add items",
        prompt: "Add milk, eggs, and bread to the grocery list",
      },
      {
        icon: "list_alt",
        label: "Active lists",
        prompt: "What's on our lists right now?",
      },
    ],
    "/family": [
      {
        icon: "leaderboard",
        label: "Points status",
        prompt: "Who has the most points this week?",
      },
      {
        icon: "emoji_events",
        label: "Earn points",
        prompt: "How can the kids earn more points?",
      },
      {
        icon: "trending_up",
        label: "Streak status",
        prompt: "Who has the longest streak?",
      },
    ],
    "/rewards": [
      {
        icon: "redeem",
        label: "Available rewards",
        prompt: "What rewards can I claim?",
      },
      {
        icon: "stars",
        label: "Claim reward",
        prompt: "What rewards can the kids claim?",
      },
      {
        icon: "military_tech",
        label: "Top earners",
        prompt: "Who earned the most points this week?",
      },
    ],
  };

  return suggestions[currentPage] || [];
}

/**
 * Get activity-based suggestions from current state
 * @param {Object} state - FamilyContext state
 * @returns {Array<{icon: string, label: string, prompt: string}>}
 */
function getActivitySuggestions(state) {
  const suggestions = [];
  const today = new Date().toISOString().split("T")[0];

  // Check meals this week
  if (state.meals) {
    const thisWeekMeals = state.meals.filter((meal) => {
      const mealDate = new Date(meal.date);
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return mealDate >= weekStart;
    });

    if (thisWeekMeals.length < 7) {
      suggestions.push({
        icon: "restaurant_menu",
        label: "Plan meals",
        prompt: "Plan this week's meals",
      });
    }
  }

  // Check grocery list
  if (state.lists) {
    const groceryList = state.lists.find((list) =>
      list.name?.toLowerCase().includes("grocer")
    );
    if (groceryList) {
      const groceryItems = groceryList.items || [];
      if (groceryItems.filter((i) => !i.checked).length === 0) {
        suggestions.push({
          icon: "shopping_cart",
          label: "Start grocery list",
          prompt: "What groceries do we need this week?",
        });
      }
    }
  }

  // Check overdue tasks
  if (state.tasks) {
    const overdueTasks = state.tasks.filter((task) => {
      if (task.completed) return false;
      if (!task.due_date) return false;
      return task.due_date < today;
    });

    if (overdueTasks.length > 0) {
      suggestions.push({
        icon: "warning",
        label: "Overdue chores",
        prompt: "Which chores are overdue?",
      });
    }
  }

  // Check for low points members
  if (state.members) {
    const lowPointsMembers = state.members.filter(
      (member) => member.points < 20
    );

    if (lowPointsMembers.length > 0) {
      const member = lowPointsMembers[0];
      suggestions.push({
        icon: "workspace_premium",
        label: "Earn points",
        prompt: `How can ${member.name} earn more points?`,
      });
    }
  }

  // Check for upcoming events today
  if (state.events) {
    const todayEvents = state.events.filter((event) => {
      const eventDate = new Date(event.start || event.start_time).toISOString().split("T")[0];
      return eventDate === today;
    });

    if (todayEvents.length > 0) {
      suggestions.push({
        icon: "event_available",
        label: "Today's events",
        prompt: "What events are happening today?",
      });
    }
  }

  return suggestions;
}

/**
 * Get dynamic suggestions based on context
 * @param {string} currentPage - Current route path (e.g., "/calendar", "/chores")
 * @param {Object} state - FamilyContext state
 * @param {number} [hour] - Optional hour override (0-23), defaults to current hour
 * @returns {Array<{icon: string, label: string, prompt: string}>} - Max 6 suggestions
 */
export function getDynamicSuggestions(currentPage, state, hour = null) {
  const currentHour = hour !== null ? hour : new Date().getHours();
  const timeOfDay = getTimeOfDay(currentHour);

  // Collect suggestions from all sources
  const timeSuggestions = getTimeSuggestions(timeOfDay);
  const pageSuggestions = getPageSuggestions(currentPage);
  const activitySuggestions = getActivitySuggestions(state);

  // Prioritize: page-specific (2) + activity (2) + time (2)
  const suggestions = [
    ...pageSuggestions.slice(0, 2),
    ...activitySuggestions.slice(0, 2),
    ...timeSuggestions.slice(0, 2),
  ];

  // Remove duplicates by prompt text
  const uniqueSuggestions = [];
  const seenPrompts = new Set();

  for (const suggestion of suggestions) {
    if (!seenPrompts.has(suggestion.prompt)) {
      uniqueSuggestions.push(suggestion);
      seenPrompts.add(suggestion.prompt);
    }
  }

  // Return max 6 suggestions
  return uniqueSuggestions.slice(0, 6);
}
