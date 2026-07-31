# TribeLink 🌐

> **"Find Your Tribe"** — An AI-powered interest-based community platform

TribeLink connects nearby people who share similar interests, goals, and passions. Built on the **Online First, Offline Later** philosophy — connect digitally, build trust, then meet safely in public.

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/your-org/tribelink.git
cd tribelink

# Install dependencies
npm install --legacy-peer-deps

# Copy environment file
cp .env.example .env
# → Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# Start Expo dev server
npx expo start

# Run on Android
npx expo start --android

# Run on iOS
npx expo start --ios
```

---

## 🏗️ Architecture

```
tribelink/
├── app/                    # Expo Router screens
│   ├── (auth)/             # Login, Register, OTP, Forgot Password
│   ├── (onboarding)/       # 6-step onboarding flow
│   ├── (tabs)/             # Home, Discover, Communities, Events, Profile
│   ├── chat/[id].tsx       # Real-time chat room
│   ├── community/[id].tsx  # Community detail
│   ├── post/[id].tsx       # Post detail
│   ├── user/[id].tsx       # User profile
│   └── event/[id].tsx      # Event detail
├── components/
│   ├── ui/                 # Base: Button, Input, Card, Avatar, Badge...
│   ├── user/               # UserCard, MiniProfile, TrustScore
│   ├── community/          # CommunityCard, CommunityHeader
│   ├── post/               # PostCard, PostComposer
│   ├── event/              # EventCard
│   └── chat/               # MessageBubble, ChatListItem
├── constants/              # Colors, Typography, Spacing, Theme
├── lib/
│   ├── supabase.ts         # Supabase client
│   └── auth.ts             # Auth functions
├── store/                  # Redux slices
├── types/                  # TypeScript types
├── supabase/
│   ├── migrations/         # 9 SQL migration files
│   └── functions/          # Edge Functions (matching, moderation, AI)
└── docs/                   # Full documentation
```

---

## 🔧 Tech Stack

| Layer        | Technology                                          |
|---|---|
| **Mobile**   | React Native, Expo, TypeScript, Expo Router         |
| **Styling**  | NativeWind, expo-linear-gradient, expo-blur          |
| **State**    | Redux Toolkit, React Query (@tanstack/react-query)  |
| **Forms**    | React Hook Form + Zod validation                    |
| **Backend**  | Supabase (PostgreSQL + Realtime + Auth + Storage)   |
| **Geo**      | PostGIS extension (`ST_DWithin`, `ST_Distance`)     |
| **AI**       | Weighted scoring (v1), pg_vector embeddings (v2)    |
| **Realtime** | Supabase Channels + Broadcast                       |
| **Push**     | Expo Push Notifications                             |
| **Maps**     | React Native Maps + Google Maps API                 |

---

## 🔑 Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

---

## 🗄️ Database Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

---

## 📱 Key Features

- ✅ Email, Google, Apple, Phone OTP, Biometric Auth
- ✅ 6-step onboarding with 80+ interests
- ✅ AI-powered user discovery (distance + interests + skills + goals)
- ✅ Real-time chat with Supabase Realtime
- ✅ Public/Private/Invite-only Communities
- ✅ Events with RSVP and capacity management
- ✅ XP / Levels / Badges / Streaks gamification
- ✅ Content moderation Edge Function
- ✅ Row-Level Security on all tables
- ✅ PostGIS geo-queries for nearby discovery
- ✅ Dark & Light theme with glassmorphism UI
- ✅ Push notifications via Expo

---

## 🛣️ Roadmap

### Phase 2
- [ ] pg_vector AI embeddings for deep matching
- [ ] Voice & video calling (LiveKit)
- [ ] AI ice-breaker message suggestions
- [ ] Language translation in chat (DeepL API)
- [ ] Admin dashboard (Next.js)

### Phase 3
- [ ] Premium membership
- [ ] Job board
- [ ] Marketplace
- [ ] Event ticketing

---

## 📄 License

MIT © TribeLink 2026
