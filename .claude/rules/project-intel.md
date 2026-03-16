# Project Intelligence: argon-dashboard-pro-mui

## Overview
React version of Argon Dashboard 2 PRO by Creative Tim

**Tech Stack:**
- React >=16.8.0
- UI Library: Material UI
- Build Tool: Create React App
- Styling: Emotion
- State Management: React Hooks
- Routing: React Router
- TypeScript: No

## Directory Structure

```
src/
  context/
  components/
  layouts/
  examples/
  assets/
```

**Key directories:**
- `context/`
- `components/`
- `layouts/`
- `examples/`
- `assets/`

## Key Dependencies

- @asseinfo/react-kanban
- @emotion/cache
- @emotion/react
- @emotion/styled
- @fullcalendar/core
- @fullcalendar/daygrid
- @fullcalendar/interaction
- @fullcalendar/react
- @fullcalendar/timegrid
- @mui/icons-material

## Build & Development

**Available Scripts:**
- `start`: react-scripts start
- `build`: react-scripts build
- `test`: react-scripts test
- `eject`: react-scripts eject
- `install:clean`: rm -rf node_modules/ && rm -rf package-lock.json && npm install && npm start
- `install:peer-deps`: npm install --legacy-peer-deps

## Architecture Patterns

**Component Structure:**
- Functional components with hooks
- Material UI component library
- Emotion for styling

**Routing:**
- React Router for navigation
- Nested route structure for dashboard layouts

**State Management:**
- React Hooks
- Local component state with useState/useReducer

## Known Patterns

**Component Naming:**
- PascalCase for component files
- Kebab-case for asset files

**Import Structure:**
- React imports first
- UI library components second
- Local imports last

**Styling:**
- Emotion

- Material-UI theme provider for global theming

