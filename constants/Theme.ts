// TribeLink — Unified Theme
import { Colors, ThemeColors } from './Colors';
import { FontFamily, FontSize, TextStyles } from './Typography';
import { Spacing, BorderRadius, Shadow, ZIndex, AvatarSize, IconSize } from './Spacing';

export const createTheme = (mode: 'light' | 'dark') => ({
  colors: Colors[mode] as ThemeColors,
  font: FontFamily,
  fontSize: FontSize,
  text: TextStyles,
  spacing: Spacing,
  radius: BorderRadius,
  shadow: Shadow,
  zIndex: ZIndex,
  avatarSize: AvatarSize,
  iconSize: IconSize,
  mode,
  isDark: mode === 'dark',
});

export type Theme = ReturnType<typeof createTheme>;

export const lightTheme = createTheme('light');
export const darkTheme  = createTheme('dark');

// TribeLink brand constants
export const Brand = {
  name:     'TribeLink',
  tagline:  'Find Your Tribe',
  mission:  'Meaningful Connections, Online First',
  version:  '1.0.0',
} as const;

// Interest categories (master list — 80+ interests)
export const INTERESTS = [
  // Tech
  'Programming', 'AI & Machine Learning', 'Web Development', 'Mobile Dev',
  'Cybersecurity', 'Data Science', 'Cloud Computing', 'Blockchain', 'Gaming',
  'Open Source', 'Robotics', 'IoT', 'AR/VR',
  // Career & Study
  'UPSC', 'SSC', 'CAT/MBA', 'GATE', 'JEE', 'NEET', 'Civil Services',
  'Competitive Exams', 'Language Learning', 'Research', 'Teaching',
  // Business
  'Startups', 'Entrepreneurship', 'Finance', 'Investing', 'Marketing',
  'Product Management', 'Sales', 'E-commerce', 'Freelancing', 'Networking',
  // Creative
  'Photography', 'Videography', 'Painting', 'Drawing', 'Music', 'Singing',
  'Dancing', 'Writing', 'Poetry', 'Podcasting', 'Content Creation', 'Design',
  'UI/UX', 'Fashion', 'Architecture', 'Cooking', 'Baking', 'Crafts',
  // Fitness & Wellness
  'Gym', 'Yoga', 'Meditation', 'Running', 'Cycling', 'Swimming',
  'Cricket', 'Football', 'Basketball', 'Badminton', 'Tennis', 'Chess',
  'Trekking', 'Rock Climbing', 'Martial Arts', 'Crossfit',
  // Lifestyle
  'Travel', 'Books', 'Movies', 'Anime', 'History', 'Philosophy',
  'Psychology', 'Astronomy', 'Spirituality', 'Volunteering', 'Environment',
  'Politics', 'Economics', 'Science', 'Biology', 'Chemistry', 'Physics',
  // Health
  'Medicine', 'Dentistry', 'Nutrition', 'Mental Health', 'Ayurveda',
  // Community
  'Public Speaking', 'Debate', 'Drama', 'Event Management', 'Social Work',
] as const;

export type Interest = typeof INTERESTS[number];

// XP per action
export const XP_REWARDS = {
  profileComplete:    100,
  firstPost:          50,
  joinCommunity:      30,
  sendMessage:         5,
  attendEvent:        80,
  createEvent:        60,
  dailyLogin:         10,
  streakBonus:        25,
  helpfulAnswer:      40,
  receiveLike:         2,
  sharePost:          10,
  inviteFriend:      150,
} as const;

// Level thresholds
export const LEVELS = [
  { level: 1,  title: 'Newbie',        minXP: 0     },
  { level: 2,  title: 'Explorer',      minXP: 200   },
  { level: 3,  title: 'Connector',     minXP: 500   },
  { level: 4,  title: 'Tribe Builder', minXP: 1000  },
  { level: 5,  title: 'Community Pro', minXP: 2000  },
  { level: 6,  title: 'Mentor',        minXP: 3500  },
  { level: 7,  title: 'Influencer',    minXP: 5500  },
  { level: 8,  title: 'Leader',        minXP: 8000  },
  { level: 9,  title: 'Legend',        minXP: 12000 },
  { level: 10, title: 'TribeLink Pro', minXP: 18000 },
] as const;
