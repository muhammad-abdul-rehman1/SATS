# Visual Setup Guide - Step by Step

## 🎯 Your Goal
See your 9 rooms as interactive blue pins on a Google Map at `/map/rooms`

---

## 📊 Current State

```
🔴 Step 1: Get API Key      ← START HERE
🔴 Step 2: Add to .env.local
🔴 Step 3: Install & Restart
✅ Result: Interactive map!
```

---

## 🔴 STEP 1: Get Google Maps API Key (2 minutes)

### Visual Guide:

```
1. Open browser and go to:
   https://console.cloud.google.com
   
2. You see this:
   ┌─────────────────────────┐
   │ Select a Project ▼      │  ← Click here
   └─────────────────────────┘
   
3. Click "New Project"
   ┌─────────────────────────┐
   │ ✓ Existing projects     │
   │ + New Project      ←────┼─── Click
   └─────────────────────────┘
   
4. Enter project name:
   ┌─────────────────────────┐
   │ Project name:           │
   │ Smart Asset Tracker Maps │  ← Type this
   │ [Create] [Cancel]       │
   └─────────────────────────┘
   
5. Wait 1-2 minutes...
   Project is being created...
   
6. Search for Maps API:
   ┌──────────────────────────────┐
   │ 🔍 Search                    │
   │    Maps JavaScript API   ←───┼─ Type this
   └──────────────────────────────┘
   
7. Click on "Maps JavaScript API"
   ┌──────────────────────────────┐
   │ Maps JavaScript API          │ ← Click
   │ $ per 1000 map loads         │
   └──────────────────────────────┘
   
8. Click [Enable]
   ┌──────────────────────────────┐
   │ [Enable] ← Click             │
   └──────────────────────────────┘
   
9. Wait... Maps API is now enabled!

10. Go to Credentials:
    ┌──────────────────────────────┐
    │ ← APIs & Services            │
    │   ├─ Library                 │
    │   ├─ Credentials        ←────┼─ Click here
    │   └─ Settings               │
    └──────────────────────────────┘
    
11. Click "Create Credentials"
    ┌──────────────────────────────┐
    │ [Create Credentials] ← Click │
    └──────────────────────────────┘
    
12. Select "API Key"
    ┌──────────────────────────────┐
    │ Select type:                 │
    │ ○ OAuth client ID            │
    │ ○ Service account            │
    │ ○ API Key              ←─────┼─ Click
    └──────────────────────────────┘
    
13. See your API Key!
    ┌──────────────────────────────┐
    │ Your API Key                 │
    │ AIzaSyDOxxxxxxxxxxxxxxxxxx   │
    │                              │
    │ [Copy] ← CLICK THIS!         │
    └──────────────────────────────┘
    
14. ✅ API KEY COPIED!
    Save it for step 2...
```

---

## 🔴 STEP 2: Add Key to .env.local (1 minute)

### Option A: Using VS Code

```
1. Open VS Code

2. Open SATS-webapp folder:
   File → Open Folder
   D:\ReactProjects\smart-asset-tracker-mongo\SATS-webapp

3. Right-click in file explorer on left:
   ┌─────────────────┐
   │ SATS-webapp     │
   │ ├─ src/ ┐       │
   │ ├─ node_modules │
   │ ├─ ...          │
   │ └─ [Right-click] │ ← Here
   └─────────────────┘

4. Select "New File"

5. Type filename: .env.local

6. File opens with this content:
   ┌──────────────────────────────────────┐
   │ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=    │ ← Cursor here
   └──────────────────────────────────────┘

7. Paste your API key after the = sign:
   ┌──────────────────────────────────────┐
   │ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=    │
   │ AIzaSyDOxxxxxxxxxxxxxxxxxx          │
   └──────────────────────────────────────┘

8. Save: Ctrl+S

9. ✅ File saved!
```

### Option B: Using Windows Explorer

```
1. Open File Explorer

2. Navigate to:
   D:\ReactProjects\smart-asset-tracker-mongo\SATS-webapp

3. Right-click in empty space:
   ┌─────────────────┐
   │ New → Text      │ ← Click
   │      Document   │
   └─────────────────┘

4. New file created:
   "New Text Document.txt"

5. Rename to: .env.local
   (Right-click → Rename)

6. Open with text editor (right-click → Open With)

7. Paste content:
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDOxxxxxxxxxxxxxxxxxx

8. Save: Ctrl+S

9. ✅ File saved!
```

---

## 🔴 STEP 3: Install & Restart (2 minutes)

### In Terminal:

```
1. Open Terminal/PowerShell

2. Navigate to SATS-webapp:
   cd D:\ReactProjects\smart-asset-tracker-mongo\SATS-webapp

3. Install Google Maps package:
   npm install @react-google-maps/api
   
   ⏳ Wait for installation...
   ✅ Added 50+ packages

4. Stop current dev server (if running):
   Ctrl+C
   
   (Confirms you want to terminate? y)

5. Restart dev server:
   npm run dev
   
   ⏳ Wait for it to compile...
   ✅ Compiled successfully
   ✅ Ready on http://localhost:3000

6. ✅ Server restarted!
```

---

## ✅ DONE! See Your Map

### In Browser:

```
1. Open: http://localhost:3000/map/rooms

2. You should see:
   ┌──────────────────────────────┐
   │     [Google Map]             │
   │   [📍] [📍] [📍] ...         │
   │                              │
   │   9 blue pins total          │
   │   Can zoom/pan               │
   │   Click pins for details     │
   └──────────────────────────────┘

3. Click a blue pin:
   ┌──────────────────────────────┐
   │  Conference Room A           │
   │  Code: R001                  │
   │  Building: N-Block           │
   │  Floor: 3                    │
   │  Capacity: 20                │
   └──────────────────────────────┘

4. 🎉 SUCCESS!
   Your interactive map is live!
```

---

## 🆘 If Something Goes Wrong

### Map shows placeholder instead of interactive map

```
❌ Problem:
   Still see "Currently showing 9 rooms..."

✅ Solution:
   1. Check .env.local file exists
      Location: D:\...SATS-webapp\.env.local
      
   2. Verify content:
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyD...
      (No extra spaces or text)
      
   3. Restart dev server:
      In terminal: Ctrl+C
      Then: npm run dev
      
   4. Refresh browser:
      Ctrl+F5 (hard refresh)
      
   5. Retry: http://localhost:3000/map/rooms
```

### "Cannot find module @react-google-maps/api"

```
❌ Problem:
   Error in console about missing module

✅ Solution:
   npm install @react-google-maps/api
   npm run dev
```

### "API key invalid" or blank map

```
❌ Problem:
   Map shows but no markers

✅ Solution:
   1. Go back to Google Cloud Console
   2. Check if Maps JavaScript API is ENABLED
   3. Try creating a new API key
   4. Update .env.local with new key
   5. Restart dev server
```

---

## 📋 Verification Checklist

After setup, verify:

```
✅ .env.local file created
✅ API key added to .env.local
✅ npm install @react-google-maps/api completed
✅ Dev server restarted
✅ Browser shows interactive map (not placeholder)
✅ 9 blue pins visible
✅ Can zoom in/out
✅ Can pan (drag) around
✅ Click a pin → room details appear
✅ No errors in browser console (F12)
```

---

## 🎯 Expected Results

### Screen Shows:
- Interactive Google Map in center
- 9 blue pins (one per room)
- Zoom controls (+ and - buttons)
- Fullscreen button
- Room list on right side
- Statistics cards on top

### Interactions Work:
- Click pin → Info window with details
- Zoom in/out → Map zooms
- Drag → Map pans
- Search filter → Rooms update
- Building filter → Pins update

---

## 📞 If You Still Need Help

Tell me:
1. What step you're on
2. What error you see (screenshot if possible)
3. What console says (F12 → Console)
4. Whether .env.local file exists

I can help troubleshoot!

---

## ⏱️ Total Setup Time: ~5 minutes

- Get API Key: 2 min
- Add to .env.local: 1 min  
- Install & Restart: 2 min
- **Total: 5 minutes** ✅

---

## 🎉 You're Almost There!

Just follow the steps above and you'll have an interactive map showing all 9 of your rooms!

**Next message:** "Setup complete! I can see the interactive map!" 🗺️
