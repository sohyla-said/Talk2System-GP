# Talk2System Frontend

> AI-powered requirements engineering platform that converts stakeholder conversations into professional software documentation.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development](#development)
- [Project Structure](#project-structure)
- [Routing Architecture](#routing-architecture)
- [State & Context Architecture](#state--context-architecture)
- [Styling & Theming](#styling--theming)
- [Key Components](#key-components)
- [Building for Production](#building-for-production)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

Talk2System is a modern web application that streamlines the software requirements gathering process. The platform allows teams to record stakeholder conversations, automatically extract requirements, and generate professional artifacts including:

- **SRS Documents** - IEEE-standard Software Requirements Specifications
- **UML Diagrams** - Use case, class, and sequence diagrams
- **Requirements Lists** - Organized functional and non-functional requirements
- **Session Transcripts** - AI-powered conversation transcription

## ✨ Features

### Core Functionality
- 🎙️ **Audio Recording Sessions** - Capture stakeholder conversations
- 📝 **AI Transcription** - Convert audio to text with accurate transcripts
- ✅ **Requirements Extraction** - Automatically identify and categorize requirements
- 📄 **Document Generation** - Create SRS documents and UML diagrams
- 📝 **Transcription Summary** - Concise summaries of transcripts
- 🗂️ **Project Management** - Organize multiple projects with sessions and artifacts
- 📊 **Analytics Dashboard** - Track statistics and visualize project insights
- 👥 **User Role Management** - Approval workflows and admin controls
- 🔔 **Notifications** - Real-time in-app notification system
- 🌐 **Internationalization** - English and Arabic (RTL) language support
- 🔐 **OAuth Support** - OAuth callback authentication flow

### UI/UX Features
- 🌓 **Dark Mode Support** - Seamless light/dark theme switching
- 📱 **Responsive Design** - Mobile-first approach with Tailwind CSS
- 🎨 **Modern UI** - Clean, professional interface with Material Symbols icons
- ♿ **Accessibility** - Tailwind Forms plugin for accessible form inputs
- 🔔 **Toast Notifications** - Real-time task status with react-toastify

## 🛠 Tech Stack

### Core Framework
- **React 18.2.0** - Modern React with hooks and concurrent features
- **Vite 7.2.5** - Next-generation frontend build tool with Rolldown bundler
- **React Router DOM 6.30.3** - Declarative routing with nested routes and route guards

### Styling
- **Tailwind CSS 3.4.19** - Utility-first CSS framework
- **Tailwind Forms** - Beautiful form styling
- **Tailwind Container Queries** - Responsive container-based layouts
- **Material Symbols** - Google's icon font
- **Inter Font** - Professional typography

### Utilities & Libraries
- **Axios 1.13.4** - HTTP client for API requests
- **React Hook Form 7.71.1** - Performant form management
- **React Toastify 11.0.5** - Toast notifications
- **React Markdown 10.1.0** - Markdown rendering (SRS documents)
- **WaveSurfer.js 7.12.1** - Audio waveform visualization

### Development Tools
- **ESLint 9.39.1** - Code linting
- **PostCSS 8.5.6** - CSS transformations
- **Autoprefixer 10.4.24** - Vendor prefix automation

## 📦 Prerequisites

**Node.js Version Requirement:**
- Node.js **20.19+** or **22.12+** (required for Vite 7.2.5 with Rolldown)
- If you have an older version, upgrade using:
  - **Windows:** Download from [nodejs.org](https://nodejs.org/) or use [nvm-windows](https://github.com/coreybutler/nvm-windows)
  - **macOS/Linux:** Use [nvm](https://github.com/nvm-sh/nvm)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sohyla-said/Talk2System-GP.git
   cd talk2system-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify installation**
   ```bash
   node --version  # Should show 20.19+ or 22.12+
   npm --version
   ```

## 💻 Development

### Start Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:5173`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot module replacement |
| `npm run build` | Build optimized production bundle |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |

### Development Server Features
- ⚡ **Lightning Fast HMR** - Instant hot module replacement
- 🔄 **Fast Refresh** - Preserves React component state
- 🎯 **Smart Defaults** - Zero-config for most use cases
- 📦 **On-demand Compilation** - Only compiles requested modules

## 📁 Project Structure

```
talk2system-frontend/
├── public/                         # Static assets
│   └── uml/                        # UML diagram files
│
├── src/
│   ├── assets/                     # Images and static resources
│   │
│   ├── api/                        # Axios API client modules
│   │   ├── authApi.js
│   │   ├── artifactsAPI.js
│   │   ├── dashboardApi.js
│   │   ├── notificationApi.js
│   │   ├── projectApi.js
│   │   ├── srsAPI.js
│   │   └── umlAPI.js
│   │
│   ├── components/                 # Reusable UI components
│   │   ├── ExtractionToast.jsx     # Requirements extraction status toast
│   │   ├── SrsToast.jsx            # SRS generation status toast
│   │   ├── UmlToast.jsx            # UML generation status toast
│   │   │
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx       # Main app wrapper (Header + Footer)
│   │   │   ├── AuthLayout.jsx      # Authentication page wrapper
│   │   │   ├── Header.jsx          # Top navigation bar
│   │   │   ├── Footer.jsx          # Footer component
│   │   │   ├── LangToggle.jsx      # Language switcher (EN/AR)
│   │   │   ├── NotificationBell.jsx # In-app notification bell
│   │   │   └── ThemeToggle.jsx     # Dark/light theme toggle
│   │   │
│   │   └── modals/
│   │       ├── EngineChoiceModal.jsx
│   │       ├── RequirementsApprovalModal.jsx
│   │       ├── RequirementsEditModal.jsx
│   │       ├── SrsApprovalModal.jsx
│   │       ├── SrsMarkdownRenderer.jsx
│   │       ├── TranscriptApprovalModal.jsx
│   │       ├── TranscriptEditModal.jsx
│   │       └── UMLApprovalModal.jsx
│   │
│   ├── context/                    # React Context providers
│   │   ├── LanguageContext.jsx     # i18n + RTL direction context
│   │   └── ThemeContext.jsx        # Light/dark theme context
│   │
│   ├── css/
│   │   └── RecordingSessionPage.css
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── useExtractionTask.js    # Requirement extraction async task
│   │   ├── useSrsTask.js           # SRS generation async task
│   │   ├── useTranslation.js       # i18n translation hook
│   │   └── useUmlTask.js           # UML generation async task
│   │
│   ├── lang/
│   │   └── translations.js         # EN/AR translation strings
│   │
│   ├── notifications/
│   │   └── NotificationsPage.jsx   # Notifications list page
│   │
│   ├── pages/                      # Page components (route endpoints)
│   │   ├── Home.jsx                # Landing page
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignupPage.jsx
│   │   │   ├── OAuthCallbackPage.jsx
│   │   │   ├── PendingApprovalPage.jsx
│   │   │   └── role-approval.jsx
│   │   │
│   │   ├── admin/
│   │   │   └── AllUsersPage.jsx    # Admin: manage all users
│   │   │
│   │   ├── dashboard/
│   │   │   ├── DashboardPage.jsx   # Role-aware dashboard router
│   │   │   ├── AdminDashboard.jsx  # Admin statistics & overview
│   │   │   └── UserDashboard.jsx   # User statistics & overview
│   │   │
│   │   ├── projects/
│   │   │   ├── ProjectsPage.jsx
│   │   │   ├── ProjectDetailsPage.jsx
│   │   │   ├── AddProjectDetailsPage.jsx
│   │   │   ├── AddParticipantPage.jsx
│   │   │   ├── AdminAddProjectPage.jsx
│   │   │   ├── AdminSystemProjectsPage.jsx
│   │   │   └── EmptyProjectsPage.jsx
│   │   │
│   │   ├── Sessions/
│   │   │   ├── SessionDetailsPage.jsx
│   │   │   └── StartSessionPage.jsx
│   │   │
│   │   ├── recordingsession/
│   │   │   ├── RecordingSessionPage.jsx  # Audio recording with WaveSurfer
│   │   │   └── TranscriptInputPage.jsx   # Manual transcript input
│   │   │
│   │   ├── transcript/
│   │   │   ├── TranscriptPage.jsx
│   │   │   └── Summary.jsx
│   │   │
│   │   ├── requirements/
│   │   │   ├── Requirements_choice_page.jsx  # Choose preferred extraction output
│   │   │   ├── Requirements_project_view.jsx # Project-level requirements
│   │   │   └── Requirements_session_view.jsx # Session-level requirements
│   │   │
│   │   ├── artifacts/
│   │   │   ├── SrsPage.jsx               # SRS generation page
│   │   │   ├── SrsProjectView.jsx        # Project SRS artifacts viewer
│   │   │   ├── SrsSessionView.jsx        # Session SRS artifact viewer
│   │   │   ├── UmlPage.jsx               # UML generation page
│   │   │   ├── UmlProjectView.jsx        # Project UML diagrams viewer
│   │   │   ├── UmlSessionView.jsx        # Session UML diagrams viewer
│   │   │   └── EmptyArtifactsPage.jsx
│   │   │
│   │   └── results/
│   │       ├── ProjectResults.jsx        # Project artifacts overview
│   │       └── SessionResults.jsx        # Session artifacts overview
│   │
│   ├── routes/
│   │   └── AppRoutes.jsx               # Centralized route configuration
│   │
│   ├── App.jsx                         # Root component with context providers
│   ├── main.jsx                        # Application entry point
│   ├── App.css                         # Global styles
│   └── index.css                       # Base Tailwind imports
│
├── index.html                          # HTML entry point
├── package.json                        # Dependencies and scripts
├── vite.config.js                      # Vite configuration
├── tailwind.config.js                  # Tailwind customization
├── postcss.config.js                   # PostCSS plugins
├── eslint.config.js                    # ESLint rules
└── README.md                           # This file
```

## 🗺️ Routing Architecture

The app uses **React Router v6** with nested routes, layout wrappers, and two route guards.

### Route Guards

**`ProtectedRoute`**
- Validates the user is authenticated via `getCurrentUser()`
- Redirects to `/login` if unauthenticated
- Accepts optional `requireAdmin` prop — redirects non-admin users to `/dashboard`
- Token validity is re-checked every 60 seconds

**`GuestRoute`**
- Prevents authenticated users from accessing auth pages
- Redirects logged-in users to `/dashboard`

---

### Route Map

```
/ (Public)
  └── Home                             Landing page

/oauth/callback (Public)
  └── OAuthCallbackPage                OAuth provider callback handler

/auth (AuthLayout — no header/footer)
  ├── /login          [GuestRoute]     User login
  ├── /signup         [GuestRoute]     User registration
  ├── /pending-approval                Waiting for admin approval
  └── /role-approval  [ProtectedRoute] Role assignment page

/app (AppLayout — Header + Footer)
  ├── /dashboard      [ProtectedRoute]             Role-aware dashboard
  ├── /notifications  [ProtectedRoute]             Notifications list
  │
  ├── /admin
  │   └── /all-users  [ProtectedRoute, adminOnly]  Manage all users
  │
  ├── /projects       [ProtectedRoute]
  │   ├── /                            Projects listing
  │   ├── /empty                       Empty state page
  │   ├── /new                         Create project (user)
  │   ├── /new-admin  [adminOnly]      Create project (admin)
  │   ├── /system-projects [adminOnly] All system projects (admin)
  │   │
  │   └── /:id
  │       ├── /                        Project details (tabbed)
  │       ├── /add-participant         Add participant to project
  │       ├── /recording               Audio recording session
  │       ├── /transcript-input        Manual transcript input
  │       ├── /start-session           Start a new session
  │       ├── /results                 Project artifacts overview
  │       ├── /requirements            Project-level requirements view
  │       ├── /srs/generate            Generate SRS (project scope)
  │       ├── /artifacts/srs           View SRS artifacts (project)
  │       ├── /artifacts/uml           Generate/view UML (project)
  │       ├── /artifacts/uml-view      UML diagrams viewer (project)
  │       │
  │       └── /sessions/:sessionId
  │           ├── /sessiondetails      Session details view
  │           ├── /artifacts           Session artifacts overview
  │           ├── /artifacts/uml       Session UML diagrams viewer
  │           ├── /artifacts/srs       Session SRS viewer
  │           └── /srs/generate        Generate SRS (session scope)
  │
  ├── /transcript/:sessionId           Session transcript viewer
  │   └── /requirements                Session requirements
  │       └── /choice                  Requirements extraction engine choice
  │
  └── /summary/:sessionId              Transcript summary

* (catch-all)
  Redirects to /dashboard (authenticated) or /login (guest)
```

---

### Layout Components

**`AppLayout`** — Main application wrapper (`src/components/layout/AppLayout.jsx`)
- Renders `Header`, `<Outlet />`, and `Footer`
- Applies `dir` attribute (LTR/RTL) from `LanguageContext`
- Applies dark mode classes from `ThemeContext`
- Used for all authenticated routes

**`AuthLayout`** — Authentication wrapper (`src/components/layout/AuthLayout.jsx`)
- Sticky header with logo and auth navigation links
- `LangToggle` for language switching
- No footer
- Used for login, signup, and public auth pages

---

### Navigation Patterns

**Programmatic Navigation**
```jsx
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/dashboard');
navigate(`/projects/${projectId}/sessions/${sessionId}/sessiondetails`);
```

**Link Components**
```jsx
import { Link } from 'react-router-dom';

<Link to={`/projects/${id}`}>View Project</Link>
```

**Approval / Async Task Flow**
```jsx
// 1. User triggers action → approval modal opens
const handleGenerate = (type) => {
  setPendingNav(type);
  setShowModal(true);
};

// 2. On approve → task starts → toast tracks progress
const handleApprove = () => {
  setShowModal(false);
  startExtractionTask(sessionId);   // custom hook
};
```

## 🔄 State & Context Architecture

### Context Providers (`src/context/`)

| Context | Purpose |
|---------|---------|
| `ThemeContext` | Manages `light`/`dark` class on `<html>`, persists to localStorage |
| `LanguageContext` | Manages active locale (`en`/`ar`), provides `dir` and translation helper |

Additional task-tracking contexts are wired in `App.jsx` (one each for Extraction, SRS, and UML) so global toast notifications can report async generation progress from any page.

### Custom Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useExtractionTask` | Polls / subscribes to requirement extraction task status |
| `useSrsTask` | Polls / subscribes to SRS generation task status |
| `useUmlTask` | Polls / subscribes to UML generation task status |
| `useTranslation` | Returns translation function `t(key)` from `LanguageContext` |

### API Layer (`src/api/`)

All HTTP calls are centralized in dedicated modules using Axios. Each module maps to a backend domain:

| Module | Domain |
|--------|--------|
| `authApi.js` | Authentication (login, signup, OAuth) |
| `projectApi.js` | Projects and sessions CRUD |
| `artifactsAPI.js` | Artifact retrieval |
| `srsAPI.js` | SRS generation and retrieval |
| `umlAPI.js` | UML generation and retrieval |
| `dashboardApi.js` | Dashboard statistics |
| `notificationApi.js` | In-app notifications |

## 🎨 Styling & Theming

### Tailwind Configuration

The project uses **Tailwind CDN** in `index.html`:

```html
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
```

### Color Palette

```javascript
// Primary Indigo Scale
primary: {
  DEFAULT: '#6366f1',  // Indigo-500
  50:  '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1',
  600: '#4f46e5',
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
}

// Accent Colors
primary-accent:   '#60a5fa'   // Blue-400
secondary-accent: '#a78bfa'   // Purple-400

// Background Colors
background-light: '#f9fafb'   // Gray-50
background-dark:  '#111827'   // Gray-900

// Surface Colors
surface-light: '#ffffff'
surface-dark:  '#1C192B'

// Text Colors
text-dark:  '#1f2937'         // Gray-800
text-light: '#f9fafb'         // Gray-50
```

### Dark Mode

Toggled by adding/removing the `dark` class on the `<html>` element (managed by `ThemeContext`):

```javascript
// Light mode
<html class="light">

// Dark mode
<html class="dark">
```

All components use Tailwind's `dark:` variant:
```jsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
```

### RTL Support

When Arabic is selected via `LanguageContext`, `AppLayout` sets `dir="rtl"` on the content wrapper, and `AuthLayout` mirrors the header layout accordingly.

### Typography

- **Font Family:** Inter (Google Fonts)
- **Font Weights:** 400, 500, 700, 900
- **Icon Font:** Material Symbols Outlined

### Common Patterns

**Card Component**
```jsx
<div className="bg-white dark:bg-[#1C192B] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
```

**Primary Button**
```jsx
<button className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold transition-all">
```

**Icon with Background**
```jsx
<div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
    icon_name
  </span>
</div>
```

## 🧩 Key Components

### Layout Components

**AppLayout** (`src/components/layout/AppLayout.jsx`)
- Main wrapper for all authenticated routes
- Renders Header → Outlet → Footer
- Provides RTL direction from LanguageContext

**AuthLayout** (`src/components/layout/AuthLayout.jsx`)
- Wrapper for login, signup, and public auth pages
- Sticky blurred header with LangToggle
- No footer

**Header** (`src/components/layout/Header.jsx`)
- Main navigation bar
- Contains `NotificationBell` and `ThemeToggle`

**NotificationBell** (`src/components/layout/NotificationBell.jsx`)
- Displays unread notification count badge
- Navigates to `/notifications` on click

**LangToggle** (`src/components/layout/LangToggle.jsx`)
- Switches locale between English and Arabic
- Persists selection via LanguageContext

### Modal Components

| Modal | Trigger |
|-------|---------|
| `TranscriptApprovalModal` | Before generating requirements from transcript |
| `RequirementsApprovalModal` | Before generating SRS/UML from requirements |
| `SrsApprovalModal` | Before finalizing SRS document |
| `UMLApprovalModal` | Before finalizing UML diagrams |
| `RequirementsEditModal` | Inline editing of a requirement |
| `TranscriptEditModal` | Inline editing of a transcript segment |
| `EngineChoiceModal` | Choose AI extraction engine for requirements |
| `SrsMarkdownRenderer` | Renders SRS content as formatted markdown |

**Common Modal Pattern:**
```jsx
<TranscriptApprovalModal
  open={showModal}
  onApprove={handleApprove}
  onClose={handleClose}
  approved={approved}
/>
```

### Page Components

**Home** — Landing page with hero section, feature cards, statistics, and CTA

**DashboardPage** — Routes to `AdminDashboard` or `UserDashboard` based on role:
- Admin: system-wide stats, user management shortcuts
- User: personal stats, recent sessions, quick actions

**ProjectsPage** — Grid of project cards with status badges (Completed, Ongoing, Pending, Archived)

**ProjectDetailsPage** — Tabbed interface: Sessions | Requirements | Artifacts

**SessionDetailsPage** — Session info with links to transcript, requirements, and artifacts

**RecordingSessionPage** — Live audio recording with WaveSurfer waveform visualization

**TranscriptInputPage** — Manual transcript entry (alternative to recording)

**TranscriptPage** — Formatted transcript viewer with approval workflow and generate buttons

**Requirements_choice_page** — Select AI engine for requirement extraction

**Requirements_session_view / Requirements_project_view** — Categorized functional/non-functional requirements with filtering and inline edit support

**SrsPage** — SRS generation trigger; **SrsProjectView / SrsSessionView** — rendered SRS documents with markdown formatting

**UmlPage** — UML generation trigger; **UmlProjectView / UmlSessionView** — diagram viewer with multiple diagram types

**ProjectResults / SessionResults** — Artifacts overview per project or session

**AllUsersPage** — Admin page listing all registered users with role and approval status

## 🏗️ Building for Production

### Build Process

```bash
npm run build
```

Creates an optimized production build in `dist/`:
- Minified JavaScript bundles
- Optimized CSS with PurgeCSS
- Compressed assets
- Source maps for debugging

### Preview Production Build

```bash
npm run preview
```

Serves the production build locally at `http://localhost:4173`

### Build Output

```
dist/
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [other assets]
└── index.html
```

### Deployment Considerations

1. **Environment Variables** - Set up `.env` files for API endpoints
2. **Base Path** - Configure `base` in `vite.config.js` if deploying to a subdirectory
3. **404 Handling** - Configure the server to redirect all paths to `index.html` for SPA routing
4. **HTTPS** - Ensure production deployment uses HTTPS
5. **CDN** - Consider hosting static assets on a CDN

## 🐛 Troubleshooting

### Common Issues

**1. Node.js Version Error**
```
Error: Rolldown requires Node.js version >= 20.19.0 or >= 22.12.0
```
**Solution:** Upgrade Node.js to 20.19+ or 22.12+

**2. Blank Screen After Navigation**
```
Routes render blank or empty
```
**Solution:** Verify layout components use `<Outlet />` instead of `{children}`

**3. Tailwind Styles Not Working**
```
Custom colors or classes not applying
```
**Solution:** Check `index.html` has the Tailwind CDN script with the extended config block

**4. Missing Dependencies**
```
Module not found errors
```
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**5. Port Already in Use**
```
Error: Port 5173 is already in use
```
**Solution:** Kill the existing process or change the port in `vite.config.js`

**6. RTL Layout Broken**
```
Arabic text or layout not mirroring correctly
```
**Solution:** Verify `LanguageContext` is providing `dir="rtl"` and `AppLayout` applies it to the wrapper element

### Development Tips

- **Clear Browser Cache** - Hard refresh with Ctrl+Shift+R (Cmd+Shift+R on Mac)
- **Check Console** - Open browser DevTools for error messages
- **Network Tab** - Verify API requests are being made correctly
- **React DevTools** - Install React DevTools extension for component tree and context inspection
- **Vite Cache** - Delete `node_modules/.vite` to clear the module cache


**Built with ❤️ using React, Vite, and Tailwind CSS**
