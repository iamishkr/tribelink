export interface User {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  username: string;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  age: number | null;
  gender: 'male' | 'female' | 'non_binary' | 'prefer_not_say' | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  education: string | null;
  occupation: string | null;
  languages: string[];
  availability: 'weekdays' | 'weekends' | 'evenings' | 'flexible';
  is_verified: boolean;
  is_premium: boolean;
  is_online: boolean;
  last_seen: string | null;
  trust_score: number;
  xp: number;
  level: number;
  contribution_score: number;
  profile_complete: boolean;
  onboarding_complete: boolean;
  show_location: boolean;
  show_age: boolean;
  allow_messages: 'everyone' | 'connections' | 'none';
  created_at: string;
  updated_at: string;
  // Computed / Relational
  distance_km?: number;
  match_score?: number;
  mutual_interests?: number;
  interests?: UserInterest[];
  goals?: UserGoal[];
  skills?: UserSkill[];
}

export interface UserInterest {
  id: string;
  user_id: string;
  interest: string;
  level: 'beginner' | 'intermediate' | 'expert';
}

export interface UserGoal {
  id: string;
  user_id: string;
  goal: string;
  target_date: string | null;
  is_completed: boolean;
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill: string;
  endorsements_count: number;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar_url: string | null;
  cover_url: string | null;
  category: string;
  type: string;
  tags: string[];
  is_private: boolean;
  is_featured: boolean;
  member_count: number;
  post_count: number;
  owner_id: string;
  rules: string[];
  created_at: string;
  updated_at: string;
  // Relations
  owner?: User;
  is_member?: boolean;
  is_moderator?: boolean;
}

export interface Post {
  id: string;
  author_id: string;
  community_id: string | null;
  type: 'text' | 'image' | 'video' | 'poll' | 'event' | 'article' | 'question' | 'code';
  content: string;
  media_urls: string[];
  hashtags: string[];
  mentions: string[];
  like_count: number;
  comment_count: number;
  share_count: number;
  bookmark_count: number;
  is_pinned: boolean;
  is_edited: boolean;
  visibility: 'public' | 'connections' | 'community';
  created_at: string;
  updated_at: string;
  // Relations
  author?: User;
  community?: Community;
  poll?: Poll;
  is_liked?: boolean;
  is_bookmarked?: boolean;
}

export interface Poll {
  id: string;
  post_id: string;
  question: string;
  options: PollOption[];
  ends_at: string | null;
  total_votes: number;
  user_vote?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  like_count: number;
  created_at: string;
  // Relations
  author?: User;
  replies?: Comment[];
  is_liked?: boolean;
}

export interface Event {
  id: string;
  creator_id: string;
  community_id: string | null;
  title: string;
  description: string;
  cover_url: string | null;
  type: 'online' | 'offline' | 'hybrid';
  category: string;
  location_name: string | null;
  location_address: string | null;
  latitude: number | null;
  longitude: number | null;
  meeting_url: string | null;
  starts_at: string;
  ends_at: string;
  attendee_count: number;
  max_attendees: number | null;
  capacity: number | null;
  rsvp_count: number;
  rsvp_status?: 'attending' | 'maybe' | 'declined' | 'going' | null;
  is_free?: boolean;
  price: number;
  currency: string;
  is_canceled: boolean;
  created_at: string;
  // Relations
  creator?: User;
  community?: Community;
  user_status?: 'attending' | 'maybe' | 'declined' | 'going' | null;
}

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  avatar_url: string | null;
  last_message: Message | null;
  last_message_at: string;
  unread_count: number;
  created_at: string;
  // Relations
  participants?: User[];
  other_user?: User;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  type: 'text' | 'image' | 'video' | 'file' | 'voice' | 'audio' | 'system';
  content: string;
  media_url?: string | null;
  audio_url?: string | null;
  duration?: number | null;
  is_read: boolean;
  read_by?: string[];
  reactions?: MessageReaction[] | any;
  parent_message_id?: string | null;
  is_deleted?: boolean;
  created_at: string;
  // Relations
  sender?: User;
  parent_message?: Message;
}

export interface MessageReaction {
  emoji: string;
  user_ids: string[];
  count: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message' | 'community_invite'
      | 'event_reminder' | 'ai_recommendation' | 'achievement' | 'weekly_summary';
  title: string;
  body: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
  actor?: User;
}

export interface DiscoveryFilters {
  maxDistance: number;
  interests: string[];
  skills: string[];
  goals: string[];
  availability: 'weekdays' | 'weekends' | 'evenings' | 'flexible' | 'all' | string;
  minAge: number;
  maxAge: number;
  languages: string[];
}
