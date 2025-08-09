# GradesListMobile Architecture Documentation

## 🏗️ Current Working Architecture (v0.1.0)

### 📱 **Core App Structure**
```
app/
├── _layout.tsx              # Root layout, app initialization
├── (tabs)/
│   ├── _layout.tsx         # Tab navigation (Due, Grades, Profile)
│   ├── index.tsx           # Due assignments screen
│   ├── grades.tsx          # Grades overview screen
│   └── profile.tsx         # Profile/settings screen
└── +not-found.tsx          # 404 error screen
```

### 🔌 **Data Flow Architecture**

#### **1. Entry Points (React Query Hooks)**
- `hooks/useOfflineAssignments.ts` - **PRIMARY DATA HOOK** (offline-first with SQLite caching)
- `hooks/useCourses.ts` - Course fetching
- `hooks/useAssignments.ts` - Alternative assignment fetching (not used in main flow)

#### **2. Universal API Layer** 
```
integrations/mobile-universal-api.ts ← **CENTRAL API INTERFACE**
├── Canvas: mobile-canvas-api.ts → Direct Canvas API calls
└── Gradescope: server-gradescope-api.ts → **Vercel serverless functions**
```

#### **3. Backend Systems**

**For Gradescope (ACTIVE):**
- **Deployed Vercel serverless functions**: `https://gradeslist-mobile.vercel.app/api/gradescope/`
  - `/courses` - Fetch course list
  - `/assignments-working` - Fetch assignments with due dates
- Uses HTML scraping with session cookies server-side

**For Canvas (DORMANT):**
- Direct API calls to Canvas institutions
- Requires API tokens

### 🔄 **Working Data Flow (Based on Logs)**

```
1. App startup → initializeCredentials() in useAppStore
2. useOfflineAssignments hook activates
3. Loads cached assignments from SQLite (79 cached assignments)
4. Fetches fresh data via universalAPI.getAssignments()
5. universalAPI calls server-gradescope-api.ts
6. Makes POST to https://gradeslist-mobile.vercel.app/api/gradescope/courses
7. Gets 2 courses: "Network Security", "25Su Programming Languages"
8. For each course, calls /assignments-working endpoint
9. Transforms and enriches assignment data
10. Saves 42 fresh assignments to SQLite
11. Updates UI with due dates and assignment info
```

## 📂 **Directory Status: Used vs Unused**

### ✅ **ACTIVELY USED - DO NOT DELETE**

#### **Core App**
- `app/` - Main React Native app structure
- `components/` - UI components (SplashScreen, ThemedText, etc.)
- `hooks/` - React Query data hooks
- `store/useAppStore.ts` - Zustand global state management
- `services/` - Database and notification services

#### **Active API Integration**
- `integrations/mobile-universal-api.ts` - **CRITICAL: Main API interface**
- `integrations/server-gradescope-api.ts` - **CRITICAL: Vercel endpoint calls**
- `integrations/universal-interfaces.ts` - **CRITICAL: Type definitions**
- `integrations/field-mapping.ts` - Data transformation utilities
- `integrations/mobile-canvas-api.ts` - Canvas API (dormant but functional)

#### **Configuration & Build**
- `package.json`, `tsconfig.json`, `tamagui.config.ts`
- `app.json`, `eas.json` - Expo configuration
- `ios/`, `android/` - Native build directories
- `assets/` - Images, fonts, splash screen assets

### ⚠️ **POTENTIALLY UNUSED - SAFE TO REMOVE**

#### **Legacy Server Code (Local Development)**
- `server/` - **Local Express server** (replaced by Vercel serverless)
- `api/` - **Local API endpoints** (replaced by Vercel serverless)

#### **Legacy API Extraction**
- `api-extraction/` - **Node.js API extraction tools** (not React Native compatible)

#### **Unused Hooks & Components**
- `hooks/useColorScheme.web.ts` - Web-specific (mobile app)
- `components/Collapsible.tsx`, `components/ExternalLink.tsx` - Unused UI components
- `components/HelloWave.tsx`, `components/ParallaxScrollView.tsx` - Demo components

#### **Development Files**
- `test-due-dates.js` - Old test script
- `notes.txt` - Development notes
- `scripts/reset-project.js` - Expo template reset
- `app/(tabs)/_layout.tsx.backup` - Backup file

## 🔍 **Architecture Insights**

### **Why Multiple API Directories?**

1. **`integrations/`** - **Current working system** (React Native compatible)
2. **`api-extraction/`** - **Legacy Node.js tools** (incompatible with RN runtime) 
3. **`api/`** - **Local development server** (replaced by deployed Vercel functions)
4. **`server/`** - **Local Express server** (not used in production)

### **Key Working Components**

1. **Offline-First Design**: SQLite caching with React Query
2. **Universal API Interface**: Single interface for multiple platforms  
3. **Serverless Backend**: Vercel functions handle complex scraping
4. **Type Safety**: TypeScript interfaces across all data flows
5. **Error Resilience**: Platform failures don't crash entire app

### **Current Production Flow**
- **Mobile App** → `universalAPI` → **Vercel Serverless Functions** → **Gradescope HTML Scraping** → **Structured JSON** → **SQLite Cache** → **UI**

## 🧹 **Safe Cleanup Strategy**

### **Phase 1: Obviously Safe Removals**
1. `api-extraction/` (Node.js incompatible)
2. `api/` (replaced by Vercel)  
3. `server/` (local development only)
4. `test-due-dates.js` (old script)
5. Unused UI components (confirmed via knip)

### **Phase 2: Careful Component Analysis**
1. Use `knip` to identify unused exports
2. Verify imports aren't dynamically loaded
3. Test app after each removal
4. Keep backup of working state

### **Phase 3: Documentation & Security**
1. Update this documentation
2. Implement security hardening
3. Add proper error boundaries
4. Improve logging and monitoring

---

**Last Updated**: January 2025
**App Version**: v0.1.0 (commit: be76096)
**Status**: ✅ Working - Fetching 42 assignments from 2 courses via Vercel endpoints
