import { db } from '../database.js';
import { SystemLogger } from '../utils/logging.js';

class AchievementService {
  
  // Check and update achievements for a user
  public async checkAndUpdateAchievements(userId: number): Promise<void> {
    try {
      console.log('Checking achievements for user:', userId);
      
      // Get all active achievements
      const achievements = await db
        .selectFrom('achievements')
        .selectAll()
        .where('is_active', '=', 1)
        .execute();

      // Get user's current achievement progress
      const userAchievements = await db
        .selectFrom('user_achievements')
        .selectAll()
        .where('user_id', '=', userId)
        .execute();

      const userAchievementMap = new Map();
      userAchievements.forEach(ua => {
        userAchievementMap.set(ua.achievement_id, ua);
      });

      for (const achievement of achievements) {
        const userAchievement = userAchievementMap.get(achievement.id);
        
        // Skip if already achieved
        if (userAchievement?.achieved) continue;

        const currentProgress = await this.calculateProgress(userId, achievement);
        const isAchieved = this.checkAchievementComplete(achievement, currentProgress);

        if (!userAchievement) {
          // Create new user achievement record
          await db
            .insertInto('user_achievements')
            .values({
              user_id: userId,
              achievement_id: achievement.id,
              progress_value: currentProgress,
              achieved: isAchieved ? 1 : 0,
              achieved_at: isAchieved ? new Date().toISOString() : null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .execute();

          if (isAchieved) {
            console.log(`Achievement unlocked for user ${userId}: ${achievement.name}`);
          }
        } else if (currentProgress !== userAchievement.progress_value || (isAchieved && !userAchievement.achieved)) {
          // Update existing record
          await db
            .updateTable('user_achievements')
            .set({
              progress_value: currentProgress,
              achieved: isAchieved ? 1 : 0,
              achieved_at: isAchieved && !userAchievement.achieved ? new Date().toISOString() : userAchievement.achieved_at,
              updated_at: new Date().toISOString()
            })
            .where('user_id', '=', userId)
            .where('achievement_id', '=', achievement.id)
            .execute();

          if (isAchieved && !userAchievement.achieved) {
            console.log(`Achievement unlocked for user ${userId}: ${achievement.name}`);
          }
        }
      }

    } catch (error) {
      console.error('Error checking achievements for user:', userId, error);
      await SystemLogger.logCriticalError('Achievement check error', error as Error, { userId });
    }
  }

  // Calculate current progress for an achievement
  private async calculateProgress(userId: number, achievement: any): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    switch (achievement.category) {
      case 'exercise':
        if (achievement.type === 'progressive') {
          // Count total training days completed
          const result = await db
            .selectFrom('daily_habits')
            .select((eb) => [eb.fn.sum('training_completed').as('total')])
            .where('user_id', '=', userId)
            .where('training_completed', '=', 1)
            .executeTakeFirst();
          return Number(result?.total || 0);
        } else {
          // Check consecutive days for fixed achievements
          return await this.getConsecutiveDays(userId, 'training_completed');
        }

      case 'nutrition':
        if (achievement.type === 'progressive') {
          // Count total nutrition days completed
          const result = await db
            .selectFrom('daily_habits')
            .select((eb) => [eb.fn.sum('nutrition_completed').as('total')])
            .where('user_id', '=', userId)
            .where('nutrition_completed', '=', 1)
            .executeTakeFirst();
          return Number(result?.total || 0);
        } else {
          // Check consecutive days for fixed achievements
          return await this.getConsecutiveDays(userId, 'nutrition_completed');
        }

      case 'daily_steps':
        if (achievement.name.includes('seguidos')) {
          // Consecutive days with 10k+ steps
          return await this.getConsecutiveStepDays(userId, 10000);
        } else if (achievement.type === 'progressive') {
          // Total steps accumulated
          const result = await db
            .selectFrom('daily_habits')
            .select((eb) => [eb.fn.sum('steps').as('total')])
            .where('user_id', '=', userId)
            .executeTakeFirst();
          return Number(result?.total || 0);
        } else {
          // Maximum steps in a single day
          const result = await db
            .selectFrom('daily_habits')
            .select(['steps'])
            .where('user_id', '=', userId)
            .orderBy('steps', 'desc')
            .limit(1)
            .executeTakeFirst();
          return Number(result?.steps || 0);
        }

      case 'meditation':
        if (achievement.type === 'progressive') {
          // Count total meditation sessions
          const result = await db
            .selectFrom('meditation_sessions')
            .select((eb) => [eb.fn.count('id').as('total')])
            .where('user_id', '=', userId)
            .executeTakeFirst();
          return Number(result?.total || 0);
        } else {
          // Check consecutive days for fixed achievements
          return await this.getConsecutiveDays(userId, 'meditation_completed');
        }

      default:
        return 0;
    }
  }

  // Get consecutive days for a specific habit
  private async getConsecutiveDays(userId: number, habitField: string): Promise<number> {
    const habits = await db
      .selectFrom('daily_habits')
      .select(['date', habitField])
      .where('user_id', '=', userId)
      .orderBy('date', 'desc')
      .limit(60) // Check last 60 days
      .execute();

    if (habits.length === 0) return 0;

    let consecutiveDays = 0;
    const today = new Date();

    for (let i = 0; i < habits.length; i++) {
      const habitDate = new Date(habits[i].date);
      const daysDiff = Math.floor((today.getTime() - habitDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i && habits[i][habitField as keyof typeof habits[i]]) {
        consecutiveDays++;
      } else {
        break;
      }
    }

    return consecutiveDays;
  }

  // Get consecutive days with minimum steps
  private async getConsecutiveStepDays(userId: number, minSteps: number): Promise<number> {
    const habits = await db
      .selectFrom('daily_habits')
      .select(['date', 'steps'])
      .where('user_id', '=', userId)
      .orderBy('date', 'desc')
      .limit(60)
      .execute();

    if (habits.length === 0) return 0;

    let consecutiveDays = 0;
    const today = new Date();

    for (let i = 0; i < habits.length; i++) {
      const habitDate = new Date(habits[i].date);
      const daysDiff = Math.floor((today.getTime() - habitDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i && habits[i].steps >= minSteps) {
        consecutiveDays++;
      } else {
        break;
      }
    }

    return consecutiveDays;
  }

  // Check if achievement is complete
  private checkAchievementComplete(achievement: any, currentProgress: number): boolean {
    return currentProgress >= achievement.goal_value;
  }

  // Get user achievements with details
  public async getUserAchievements(userId: number): Promise<any[]> {
    const userAchievements = await db
      .selectFrom('user_achievements')
      .innerJoin('achievements', 'user_achievements.achievement_id', 'achievements.id')
      .select([
        'achievements.id',
        'achievements.name',
        'achievements.description', 
        'achievements.type',
        'achievements.category',
        'achievements.goal_value',
        'achievements.icon_url',
        'user_achievements.progress_value',
        'user_achievements.achieved',
        'user_achievements.achieved_at'
      ])
      .where('user_achievements.user_id', '=', userId)
      .where('achievements.is_active', '=', 1)
      .orderBy('user_achievements.achieved', 'desc')
      .orderBy('achievements.category', 'asc')
      .execute();

    return userAchievements;
  }

  // Get achievement statistics
  public async getAchievementStats(userId: number): Promise<any> {
    const stats = await db
      .selectFrom('user_achievements')
      .innerJoin('achievements', 'user_achievements.achievement_id', 'achievements.id')
      .select((eb) => [
        eb.fn.count('user_achievements.id').as('total_achievements'),
        eb.fn.sum('user_achievements.achieved').as('unlocked_achievements')
      ])
      .where('user_achievements.user_id', '=', userId)
      .where('achievements.is_active', '=', 1)
      .executeTakeFirst();

    return {
      total: Number(stats?.total_achievements || 0),
      unlocked: Number(stats?.unlocked_achievements || 0),
      locked: Number(stats?.total_achievements || 0) - Number(stats?.unlocked_achievements || 0)
    };
  }
}

export default new AchievementService();
