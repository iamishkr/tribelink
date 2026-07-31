// TribeLink — AI Matching Edge Function
// Runs daily (or on-demand) to pre-compute match scores

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface Profile {
  id: string;
  interests: string[];
  skills: string[];
  goals: string[];
  city: string | null;
  level: number;
  trust_score: number;
}

// Weighted scoring algorithm
function computeMatchScore(userA: Profile, userB: Profile): number {
  let score = 0;

  // 1. Shared interests (40% weight)
  const sharedInterests = userA.interests.filter(i => userB.interests.includes(i));
  const interestScore = Math.min((sharedInterests.length / Math.max(userA.interests.length, 1)) * 40, 40);
  score += interestScore;

  // 2. Shared skills (25% weight)
  const sharedSkills = userA.skills.filter(s => userB.skills.includes(s));
  const skillScore = Math.min((sharedSkills.length / Math.max(userA.skills.length, 1)) * 25, 25);
  score += skillScore;

  // 3. Shared goals (20% weight)
  const sharedGoals = userA.goals.filter(g => userB.goals.includes(g));
  const goalScore = Math.min((sharedGoals.length / Math.max(userA.goals.length, 1)) * 20, 20);
  score += goalScore;

  // 4. Same city (10% weight)
  if (userA.city && userB.city && userA.city.toLowerCase() === userB.city.toLowerCase()) {
    score += 10;
  }

  // 5. Trust score bonus (5% weight)
  const trustBonus = (userB.trust_score / 100) * 5;
  score += trustBonus;

  return Math.round(Math.min(score, 99));
}

Deno.serve(async (req: Request) => {
  try {
    const { user_id } = await req.json().catch(() => ({ user_id: null }));

    // Fetch user with their interests/skills/goals
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        id, city, level, trust_score,
        interests:user_interests(interest),
        skills:user_skills(skill),
        goals:user_goals(goal)
      `)
      .eq('onboarding_complete', true)
      .limit(500);

    if (error) throw error;

    const profiles: Profile[] = (users ?? []).map((u: any) => ({
      id:        u.id,
      city:      u.city,
      level:     u.level,
      trust_score: u.trust_score,
      interests: u.interests?.map((i: any) => i.interest) ?? [],
      skills:    u.skills?.map((s: any) => s.skill) ?? [],
      goals:     u.goals?.map((g: any) => g.goal) ?? [],
    }));

    // If specific user, compute their matches
    if (user_id) {
      const targetUser = profiles.find(p => p.id === user_id);
      if (!targetUser) throw new Error('User not found');

      const matches = profiles
        .filter(p => p.id !== user_id)
        .map(p => ({
          user_id:     user_id,
          match_user:  p.id,
          score:       computeMatchScore(targetUser, p),
          shared_count: targetUser.interests.filter(i => p.interests.includes(i)).length,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);

      return Response.json({ matches });
    }

    return Response.json({
      message: 'Matching engine ready',
      user_count: profiles.length,
    });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});
