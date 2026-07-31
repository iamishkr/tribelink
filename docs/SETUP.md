# TribeLink — Complete Setup Guide

## Prerequisites

| Tool      | Version      | Install |
|---|---|---|
| Node.js   | 18+          | [nodejs.org](https://nodejs.org) |
| npm       | 9+           | Included with Node.js |
| Expo CLI  | Latest       | `npm i -g expo-cli` |
| EAS CLI   | Latest       | `npm i -g eas-cli` |
| Git       | Latest       | [git-scm.com](https://git-scm.com) |

---

## 1. Clone & Install

```bash
git clone https://github.com/your-org/tribelink.git
cd tribelink
npm install --legacy-peer-deps
cp .env.example .env
```

---

## 2. Supabase Setup

### 2.1 Create Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a strong database password
3. Select your region (choose closest to your users)

### 2.2 Get Credentials
Go to **Settings → API**:
- `Project URL` → `EXPO_PUBLIC_SUPABASE_URL`
- `anon public key` → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### 2.3 Enable Extensions
Go to **Database → Extensions** and enable:
- `postgis` (geo-queries)
- `pg_vector` (AI embeddings)
- `pg_trgm` (fuzzy search)
- `uuid-ossp` (UUID generation)

### 2.4 Run Migrations
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push
```

Or run them manually in SQL Editor:
1. `001_init_users.sql`
2. `003_communities.sql`
3. `004_posts.sql`
4. `005_chat.sql`
5. `007_gamification.sql`
6. `009_rls_policies.sql`

### 2.5 Enable Realtime
Go to **Database → Replication** and enable realtime for:
- `messages`
- `notifications`
- `chat_participants`

### 2.6 Configure Storage
Go to **Storage** → Create bucket: `media` (Public)

### 2.7 Configure Auth
Go to **Authentication → Providers** and enable:
- ✅ Email (with email confirmation)
- ✅ Google (add client ID/secret)
- ✅ Apple (add Service ID, Key ID, Private Key)
- ✅ Phone (add Twilio credentials)

### 2.8 Configure Auth Redirect URLs
Add to **Authentication → URL Configuration**:
```
tribelink://
tribelink://reset-password
exp://localhost:8081
```

---

## 3. Configure Environment

Edit `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

---

## 4. Add Inter Fonts

Download from [Google Fonts](https://fonts.google.com/specimen/Inter):
- Inter-Regular.ttf
- Inter-Medium.ttf
- Inter-SemiBold.ttf
- Inter-Bold.ttf
- Inter-ExtraBold.ttf

Place in: `assets/fonts/`

---

## 5. Run the App

```bash
# Start Expo development server
npx expo start

# Open on Android (with device/emulator connected)
npx expo start --android

# Open on iOS (macOS only)
npx expo start --ios

# Open in web browser
npx expo start --web
```

---

## 6. Deploy Edge Functions

```bash
# Deploy all edge functions
supabase functions deploy matching
supabase functions deploy moderation
supabase functions deploy notifications
supabase functions deploy ai-suggestions

# Set function secrets
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 7. Setup EAS Build (Production)

```bash
# Login to EAS
eas login

# Configure project
eas build:configure

# Build for Android
eas build --platform android --profile preview

# Build for iOS
eas build --platform ios --profile preview

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

## 8. Troubleshooting

### "Cannot find module react-native-url-polyfill"
```bash
npm install react-native-url-polyfill --legacy-peer-deps
```

### Fonts not loading
Ensure font files exist in `assets/fonts/` and names match exactly.

### Supabase auth not working
Check redirect URLs include `tribelink://` in Supabase Auth settings.

### PostGIS functions failing
Ensure `postgis` extension is enabled in Supabase dashboard.
