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
- 👥 **User Role Management** - Approval workflows for different user roles

### UI/UX Features
- 🌓 **Dark Mode Support** - Seamless light/dark theme switching
- 📱 **Responsive Design** - Mobile-first approach with Tailwind CSS
- 🎨 **Modern UI** - Clean, professional interface with Material Symbols icons
- ♿ **Accessibility** - Tailwind Forms plugin for accessible form inputs
- 🔔 **Toast Notifications** - User feedback with react-toastify

## 🛠 Tech Stack

### Core Framework
- **React 18.2.0** - Modern React with hooks and concurrent features
- **Vite 7.2.5** - Next-generation frontend build tool with Rolldown bundler
- **React Router DOM 6.30.3** - Declarative routing with nested routes

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
├── public/                    # Static assets
│   └── uml/                   # UML diagram files
│
├── src/
│   ├── assets/                # Images, fonts, etc.
│   │
│   ├── components/            # Reusable components
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx      # Main app wrapper (Header + Footer)
│   │   │   ├── AuthLayout.jsx     # Authentication wrapper
│   │   │   ├── Header.jsx         # Top navigation bar
│   │   │   └── Footer.jsx         # Footer component
│   │   │
│   │   └── modals/
│   │       ├── SrsApprovalModal.jsx
│   │       ├── TranscriptApprovalModal.jsx
│   │       └── UMLApprovalModal.jsx
│   │       ├── RequirementsApprovalModal.jsx
│   │
│   ├── pages/                 # Page components (route endpoints)
│   │   ├── Home.jsx               # Landing page
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignupPage.jsx
│   │   │   ├── PendingApprovalPage.jsx
│   │   │   └── role-approval.jsx
│   │   │
│   │   ├── dashboard/
│   │   │   └── DashboardPage.jsx  # Main dashboard with stats
│   │   │
│   │   ├── projects/
│   │   │   ├── ProjectsPage.jsx        # Projects list view
│   │   │   ├── ProjectDetailsPage.jsx  # Single project details
│   │   │   ├── AddProjectDetailsPage.jsx   # Create new project
│   │   │   └── EmptyProjectsPage.jsx   # Page if no projects exist
│   │   │
│   │   ├── recordingsession/
│   │   │   └── RecordingSessionPage.jsx  # Audio recording
│   │   │
│   │   ├── transcript/
│   │   │   ├── TranscriptPage.jsx    # Session transcript
│   │   │   └── Summary.jsx           # Transcript summary
│   │   │
│   │   ├── requirements/
│   │   │   └── RequirementsView.jsx  # Requirements view 
│   │   │
│   │   ├── artifacts/
│   │   │   ├── SrsPage.jsx           # SRS document viewer
│   │   │   └── UmlPage.jsx           # UML diagrams viewer
│   │   │
│   │   └── results/
│   │       └── Results.jsx            # Artifacts/Results overview
│   │
│   ├── routes/
│   │   └── AppRoutes.jsx          # Centralized route configuration
│   │
│   ├── App.jsx                    # Root component
│   ├── main.jsx                   # Application entry point
│   ├── App.css                    # Global styles
│   └── index.css                  # Base Tailwind imports
│
├── index.html                 # HTML entry point with Tailwind CDN
├── package.json               # Dependencies and scripts
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind customization
├── postcss.config.js          # PostCSS plugins
├── eslint.config.js           # ESLint rules
└── README.md                  # This file
```

## 🗺️ Routing Architecture

### Route Structure

The app uses **React Router v6** with nested routes and layout wrappers:

```jsx
/ (Public)
  └── Home - Landing page

/auth (AuthLayout)
  ├── /login - User login
  ├── /signup - User registration
  ├── /pending-approval - Pending user approval
  └── /role-approval - Role approval page

/app (AppLayout - Header + Footer)
  ├── /dashboard - Analytics dashboard
  │
  ├── /projects
  │   ├── / - Projects list
  │   ├── /new - Create new project
  │   ├── /:id - Project details (with tabs)
  │   └── /empty - Empty state
  │
  ├── /recording - Audio recording session
  │
  ├── /transcript
  │   ├── / - Full transcript view
  │   └── /summary - Transcript summary
  │
  ├── /requirements - Requirements management
  │
  ├── /artifacts
  │   ├── /srs - SRS document
  │   └── /uml - UML diagrams
  │
  └── /results - Artifacts overview page
```

### Layout Components

**AppLayout** - Main application wrapper
- Includes Header and Footer
- Uses `<Outlet />` for nested route rendering
- Applied to authenticated routes

**AuthLayout** - Authentication wrapper
- Clean layout without header/footer
- Used for login, signup, and public pages

### Navigation Patterns

**Programmatic Navigation**
```jsx
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/dashboard');
navigate('/projects/1');
```

**Link Components**
```jsx
import { Link } from 'react-router-dom';

<Link to="/requirements">View Requirements</Link>
```

**Approval Flow Pattern**
```jsx
// Store intended destination
const [pendingNav, setPendingNav] = useState(null);

// User clicks button
const handleGenerate = (type) => {
  setPendingNav(type);
  setShowModal(true);
};

// After approval
const handleApprove = () => {
  setApproved(true);
  setShowModal(false);
  if (pendingNav === 'requirements') {
    navigate('/requirements');
  }
};
```

## 🎨 Styling & Theming

### Tailwind Configuration

The project uses **Tailwind CDN** in `index.html` for design parity with the original specification:

```html
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
```

### Color Palette

```javascript
// Primary Indigo Scale
primary: {
  DEFAULT: '#6366f1',  // Indigo-500
  50: '#eef2ff',
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
primary-accent: '#60a5fa'      // Blue-400
secondary-accent: '#a78bfa'    // Purple-400

// Background Colors
background-light: '#f9fafb'    // Gray-50
background-dark: '#111827'     // Gray-900

// Surface Colors
surface-light: '#ffffff'
surface-dark: '#1C192B'

// Text Colors
text-dark: '#1f2937'           // Gray-800
text-light: '#f9fafb'          // Gray-50
```

### Dark Mode

Toggle dark mode by adding/removing the `dark` class on the `<html>` element:

```javascript
// Light mode
<html class="light">

// Dark mode
<html class="dark">
```

All components support dark mode with Tailwind's `dark:` variant:
```jsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
```

### Typography

- **Font Family:** Inter (Google Fonts)
- **Font Weights:** 400 (regular), 500 (medium), 700 (bold), 900 (black)
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
- Main application wrapper with Header and Footer
- Uses React Router's `<Outlet />` for nested routes
- Applies consistent background and font styles

**Header** (`src/components/layout/Header.jsx`)
- Top navigation bar
- User menu and authentication status
- Dark mode toggle

**Footer** (`src/components/layout/Footer.jsx`)
- Bottom footer with links and copyright

### Modal Components

**Approval Modals** (Transcript, Requirements, UML)
- Consistent design with backdrop blur
- Warning icon and action buttons
- Confirmation workflow for artifact generation

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

**Home** - Eye-catching landing page with:
- Hero section with gradient background
- Feature cards (6 main features)
- Statistics section
- Call-to-action sections

**DashboardPage** - Analytics overview with:
- Statistics cards (sessions, projects, artifacts)
- Progress bars and mini charts
- Quick action buttons

**ProjectsPage** - Grid of project cards
- Status indicators (Completed, Ongoing, Pending, Archived)
- Color-coded badges
- Click to navigate to project details

**ProjectDetailsPage** - Tabbed interface with:
- Sessions tab (recording sessions list)
- Requirements tab
- Artifacts tab

**TranscriptPage** - Transcript viewer with:
- Formatted conversation text
- Approval workflow
- Generate buttons for requirements and artifacts

**RequirementsView** - Requirements management
- Functional/non-functional categorization
- Filtering and search
- Approval state management

**SrsPage** - SRS document viewer
- Professional document layout
- PDF-style formatting

**UmlPage** - UML diagrams display
- Multiple diagram types (use case, class, sequence)
- Image rendering with zoom capabilities

## 🏗️ Building for Production

### Build Process

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder:
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
2. **Base Path** - Configure `base` in `vite.config.js` if deploying to subdirectory
3. **404 Handling** - Configure server for SPA routing (redirect all to index.html)
4. **HTTPS** - Ensure production deployment uses HTTPS
5. **CDN** - Consider hosting static assets on CDN

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
**Solution:** Check `index.html` has Tailwind CDN with extended config

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
**Solution:** Kill existing process or change port in `vite.config.js`

### Development Tips

- **Clear Browser Cache** - Hard refresh with Ctrl+Shift+R (Cmd+Shift+R on Mac)
- **Check Console** - Open browser DevTools for error messages
- **Network Tab** - Verify API requests are being made correctly
- **React DevTools** - Install React DevTools extension for debugging
- **Vite Cache** - Delete `node_modules/.vite` folder to clear cache


**Built with ❤️ using React, Vite, and Tailwind CSS**
