import { db } from './database.js';
import cron from 'node-cron';

interface DailyResetStats {
  usersProcessed: number;
  totalDailyPoints: number;
  totalSteps: number;
  totalNotes: number;
}

class DailyResetScheduler {
  private isRunning = false;
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.initializeScheduler();
    this.checkMissedReset();
  }

  private initializeScheduler() {
    // Schedule for 00:05 AM Argentina time (GMT-3)
    // Using timezone 'America/Argentina/Buenos_Aires'
    this.cronJob = cron.schedule('5 0 * * *', async () => {
      await this.executeDailyReset();
    }, {
      timezone: 'America/Argentina/Buenos_Aires'
    });

    console.log('Daily reset scheduler initialized for 00:05 AM Argentina time');
  }

  private async checkMissedReset() {
    try {
      const today = this.getArgentinaDateString();
      const yesterday = this.getArgentinaDateString(-1);
      
      console.log('Checking for missed reset. Today:', today, 'Yesterday:', yesterday);

      // Check if yesterday's reset was executed
      const yesterdayReset = await db
        .selectFrom('daily_reset_log')
        .select(['reset_date', 'status'])
        .where('reset_date', '=', yesterday)
        .executeTakeFirst();

      if (!yesterdayReset && this.shouldHaveReset(yesterday)) {
        console.log('Missed reset detected for:', yesterday, 'Executing now...');
        await this.executeDailyReset(yesterday);
      }

      // Check if today's reset should have already happened
      const currentHour = new Date().toLocaleString('en-US', { 
        timeZone: 'America/Argentina/Buenos_Aires',
        hour12: false,
        hour: '2-digit'
      });
      
      if (parseInt(currentHour) >= 1) { // After 01:00 AM
        const todayReset = await db
          .selectFrom('daily_reset_log')
          .select(['reset_date', 'status'])
          .where('reset_date', '=', today)
          .executeTakeFirst();

        if (!todayReset) {
          console.log('Today\'s reset missing, executing now...');
          await this.executeDailyReset(today);
        }
      }
    } catch (error) {
      console.error('Error checking for missed reset:', error);
    }
  }

  private shouldHaveReset(date: string): boolean {
    const resetDate = new Date(date + 'T00:05:00-03:00');
    const now = new Date();
    return now > resetDate;
  }

  private getArgentinaDateString(daysOffset: number = 0): string {
    const now = new Date();
    const argentinaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
    argentinaTime.setDate(argentinaTime.getDate() + daysOffset);
    return argentinaTime.toISOString().split('T')[0];
  }

  public async executeDailyReset(targetDate?: string): Promise<void> {
    if (this.isRunning) {
      console.log('Daily reset already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    const resetDate = targetDate || this.getArgentinaDateString();
    
    console.log(`Starting daily reset for date: ${resetDate}`);

    let stats: DailyResetStats = {
      usersProcessed: 0,
      totalDailyPoints: 0,
      totalSteps: 0,
      totalNotes: 0
    };

    try {
      // Check if reset already exists for this date
      const existingReset = await db
        .selectFrom('daily_reset_log')
        .select(['reset_date', 'status'])
        .where('reset_date', '=', resetDate)
        .executeTakeFirst();

      if (existingReset && existingReset.status === 'completed') {
        console.log(`Reset already completed for date: ${resetDate}`);
        return;
      }

      // Start transaction for atomic operation
      await db.transaction().execute(async (trx) => {
        // Step 1: Archive current daily data to history
        const dailyData = await trx
          .selectFrom('daily_habits')
          .leftJoin('user_notes', (join) => join
            .onRef('daily_habits.user_id', '=', 'user_notes.user_id')
            .on('user_notes.date', '=', resetDate)
          )
          .select([
            'daily_habits.user_id',
            'daily_habits.date',
            'daily_habits.daily_points',
            'daily_habits.steps',
            'daily_habits.training_completed',
            'daily_habits.nutrition_completed',
            'daily_habits.movement_completed',
            'daily_habits.meditation_completed',
            'user_notes.content as notes_content'
          ])
          .where('daily_habits.date', '=', resetDate)
          .execute();

        console.log(`Found ${dailyData.length} daily records to archive`);

        // Archive each user's daily data
        for (const record of dailyData) {
          // Insert into daily_history (with conflict resolution)
          await trx
            .insertInto('daily_history')
            .values({
              user_id: record.user_id,
              date: record.date,
              daily_points: record.daily_points || 0,
              steps: record.steps || 0,
              training_completed: record.training_completed || 0,
              nutrition_completed: record.nutrition_completed || 0,
              movement_completed: record.movement_completed || 0,
              meditation_completed: record.meditation_completed || 0,
              notes_content: record.notes_content || null,
              archived_at: new Date().toISOString()
            })
            .onConflict((oc) => oc.columns(['user_id', 'date']).doUpdateSet({
              daily_points: record.daily_points || 0,
              steps: record.steps || 0,
              training_completed: record.training_completed || 0,
              nutrition_completed: record.nutrition_completed || 0,
              movement_completed: record.movement_completed || 0,
              meditation_completed: record.meditation_completed || 0,
              notes_content: record.notes_content || null,
              archived_at: new Date().toISOString()
            }))
            .execute();

          // Accumulate stats
          stats.usersProcessed++;
          stats.totalDailyPoints += record.daily_points || 0;
          stats.totalSteps += record.steps || 0;
          if (record.notes_content) stats.totalNotes++;
        }

        // Step 2: Reset daily_habits for the target date
        await trx
          .updateTable('daily_habits')
          .set({
            daily_points: 0,
            steps: 0,
            training_completed: 0,
            nutrition_completed: 0,
            movement_completed: 0,
            meditation_completed: 0,
            updated_at: new Date().toISOString()
          })
          .where('date', '=', resetDate)
          .execute();

        // Step 3: Clear daily notes for the target date
        await trx
          .deleteFrom('user_notes')
          .where('date', '=', resetDate)
          .execute();

        console.log(`Reset completed for ${stats.usersProcessed} users`);
      });

      // Log successful completion
      const executionTime = Date.now() - startTime;
      await this.logResetExecution(resetDate, stats, 'completed', null, executionTime);

      console.log(`Daily reset completed successfully for ${resetDate}:`, {
        usersProcessed: stats.usersProcessed,
        totalPoints: stats.totalDailyPoints,
        totalSteps: stats.totalSteps,
        totalNotes: stats.totalNotes,
        executionTime: `${executionTime}ms`
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('Daily reset failed:', error);
      
      // Log failed execution
      await this.logResetExecution(resetDate, stats, 'failed', errorMessage, executionTime);
      
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  private async logResetExecution(
    resetDate: string, 
    stats: DailyResetStats, 
    status: 'completed' | 'failed' | 'partial',
    errorMessage: string | null,
    executionTime: number
  ): Promise<void> {
    try {
      await db
        .insertInto('daily_reset_log')
        .values({
          reset_date: resetDate,
          executed_at: new Date().toISOString(),
          users_processed: stats.usersProcessed,
          total_daily_points: stats.totalDailyPoints,
          total_steps: stats.totalSteps,
          total_notes: stats.totalNotes,
          status,
          error_message: errorMessage,
          execution_time_ms: executionTime
        })
        .onConflict((oc) => oc.column('reset_date').doUpdateSet({
          executed_at: new Date().toISOString(),
          users_processed: stats.usersProcessed,
          total_daily_points: stats.totalDailyPoints,
          total_steps: stats.totalSteps,
          total_notes: stats.totalNotes,
          status,
          error_message: errorMessage,
          execution_time_ms: executionTime
        }))
        .execute();
    } catch (logError) {
      console.error('Failed to log reset execution:', logError);
    }
  }

  public async getResetHistory(limit: number = 30): Promise<any[]> {
    return await db
      .selectFrom('daily_reset_log')
      .selectAll()
      .orderBy('reset_date', 'desc')
      .limit(limit)
      .execute();
  }

  public async getResetStatus(date: string): Promise<any | null> {
    return await db
      .selectFrom('daily_reset_log')
      .selectAll()
      .where('reset_date', '=', date)
      .executeTakeFirst();
  }

  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('Daily reset scheduler stopped');
    }
  }

  public start(): void {
    if (this.cronJob) {
      this.cronJob.start();
      console.log('Daily reset scheduler started');
    }
  }

  public async forceReset(date?: string): Promise<void> {
    const targetDate = date || this.getArgentinaDateString();
    console.log(`Force executing daily reset for: ${targetDate}`);
    await this.executeDailyReset(targetDate);
  }
}

export default DailyResetScheduler;
