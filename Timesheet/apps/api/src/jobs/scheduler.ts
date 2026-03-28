import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { generateWeeklyDigest } from '../modules/ai/ai.service.js';
import { getBimDb, sql } from '../config/database.js';
import { getOvertimeAnalysis } from '../modules/analytics/analytics.service.js';

// ============================================================
// NIGHTLY METRICS SNAPSHOT — 00:30 daily
// ============================================================
export function scheduleNightlyMetrics(): void {
  cron.schedule('30 0 * * *', async () => {
    logger.info('[Job] Starting nightly metrics snapshot...');
    try {
      const pool = getBimDb();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().slice(0, 10);

      // Aggregate hours per employee for yesterday
      await pool.request()
        .input('Date', sql.Date, dateStr)
        .query(`
          INSERT INTO BIMdb_Schema.DailyMetricsSnapshot
            (SnapshotDate, EmployeeID, MetricType, MetricValue, MetricUnit)
          SELECT
            @Date,
            t.EmployeeID,
            'HOURS_WORKED',
            ISNULL(t.NetHoursWorked, 0),
            'HOURS'
          FROM BIMdb_Schema.TimesheetEntries t
          WHERE t.WorkDate = @Date AND t.Status != 'REJECTED'
          AND NOT EXISTS (
            SELECT 1 FROM BIMdb_Schema.DailyMetricsSnapshot
            WHERE SnapshotDate = @Date AND EmployeeID = t.EmployeeID AND MetricType = 'HOURS_WORKED'
          );

          INSERT INTO BIMdb_Schema.DailyMetricsSnapshot
            (SnapshotDate, EmployeeID, MetricType, MetricValue, MetricUnit)
          SELECT
            @Date,
            t.EmployeeID,
            'OVERTIME_HOURS',
            ISNULL(t.OvertimeHours, 0),
            'HOURS'
          FROM BIMdb_Schema.TimesheetEntries t
          WHERE t.WorkDate = @Date AND t.Status != 'REJECTED'
          AND NOT EXISTS (
            SELECT 1 FROM BIMdb_Schema.DailyMetricsSnapshot
            WHERE SnapshotDate = @Date AND EmployeeID = t.EmployeeID AND MetricType = 'OVERTIME_HOURS'
          );
        `);

      logger.info(`[Job] Nightly metrics done for ${dateStr}`);
    } catch (err) {
      logger.error('[Job] Nightly metrics failed:', err);
    }
  }, { timezone: 'Asia/Ho_Chi_Minh' });
}

// ============================================================
// OVERTIME ALERT — 17:30 on weekdays
// ============================================================
export function scheduleOvertimeAlerts(): void {
  cron.schedule('30 17 * * 1-5', async () => {
    logger.info('[Job] Running overtime alert check...');
    try {
      const pool = getBimDb();
      const today = new Date().toISOString().slice(0, 10);

      // Find employees still clocked in past 17:30
      const result = await pool.request()
        .input('Date', sql.Date, today)
        .query(`
          SELECT t.EntryID, t.EmployeeID, e.FirstName + ' ' + e.LastName AS Name,
                 t.ClockInTime, t.NetHoursWorked
          FROM BIMdb_Schema.TimesheetEntries t
          JOIN BIMdb_Schema.Employees e ON t.EmployeeID = e.EmployeeID
          WHERE t.WorkDate = @Date
            AND t.ClockOutTime IS NULL
            AND t.ClockInTime IS NOT NULL
            AND DATEDIFF(HOUR, t.ClockInTime, GETUTCDATE()) > 9
        `);

      for (const row of result.recordset) {
        await pool.request()
          .input('RecipientID', sql.Int, row['EmployeeID'])
          .input('Title', sql.NVarChar(200), 'Nhắc nhở chấm công ra')
          .input('Body', sql.NVarChar(1000),
            `Bạn chưa chấm công ra hôm nay và đã làm việc hơn 9 giờ. Hãy cập nhật timesheet trước khi rời văn phòng.`)
          .input('URL', sql.NVarChar(500), '/timesheet')
          .query(`
            INSERT INTO BIMdb_Schema.Notifications (RecipientID, Type, Title, Body, ActionURL)
            VALUES (@RecipientID, 'OVERTIME_ALERT', @Title, @Body, @URL)
          `);
      }

      logger.info(`[Job] Overtime alerts sent to ${result.recordset.length} employees`);
    } catch (err) {
      logger.error('[Job] Overtime alert failed:', err);
    }
  }, { timezone: 'Asia/Ho_Chi_Minh' });
}

// ============================================================
// AI WEEKLY DIGEST — Every Monday 08:00
// ============================================================
export function scheduleWeeklyAIDigest(): void {
  cron.schedule('0 8 * * 1', async () => {
    logger.info('[Job] Generating AI weekly digest...');
    try {
      const insight = await generateWeeklyDigest();
      logger.info(`[Job] AI weekly digest generated: InsightID=${insight.insightId}`);

      // Notify all admins
      const pool = getBimDb();
      await pool.request()
        .input('InsightID', sql.BigInt, insight.insightId)
        .query(`
          INSERT INTO BIMdb_Schema.Notifications (RecipientID, Type, Title, Body, ActionURL)
          SELECT e.EmployeeID, 'AI_INSIGHT',
                 N'Báo cáo AI tuần mới',
                 N'Báo cáo phân tích tuần vừa qua đã sẵn sàng. Nhấn để xem.',
                 '/admin/ai-insights'
          FROM BIMdb_Schema.Employees e
          JOIN BIMdb_Schema.Roles r ON e.RoleID = r.RoleID
          WHERE r.HierarchyLevel >= 4 AND e.IsActive = 1
        `);
    } catch (err) {
      logger.error('[Job] Weekly AI digest failed:', err);
    }
  }, { timezone: 'Asia/Ho_Chi_Minh' });
}

// ============================================================
// TIMESHEET SUBMIT REMINDER — Friday 16:00
// ============================================================
export function scheduleTimesheetReminder(): void {
  cron.schedule('0 16 * * 5', async () => {
    logger.info('[Job] Sending timesheet submit reminders...');
    try {
      const pool = getBimDb();
      const monday = getThisMonday();
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);

      // Find employees with un-submitted entries this week
      await pool.request()
        .input('Start', sql.Date, monday.toISOString().slice(0, 10))
        .input('End', sql.Date, friday.toISOString().slice(0, 10))
        .query(`
          INSERT INTO BIMdb_Schema.Notifications (RecipientID, Type, Title, Body, ActionURL)
          SELECT DISTINCT t.EmployeeID, 'TIMESHEET_REMINDER',
                 N'Nhắc nhở nộp Timesheet tuần này',
                 N'Bạn còn có timesheet chưa được nộp tuần này. Vui lòng xem xét và nộp trước 17:30.',
                 '/timesheet'
          FROM BIMdb_Schema.TimesheetEntries t
          WHERE t.WorkDate BETWEEN @Start AND @End
            AND t.Status = 'DRAFT'
            AND t.ClockInTime IS NOT NULL
        `);

      logger.info('[Job] Timesheet reminders sent');
    } catch (err) {
      logger.error('[Job] Timesheet reminder failed:', err);
    }
  }, { timezone: 'Asia/Ho_Chi_Minh' });
}

function getThisMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function startAllJobs(): void {
  scheduleNightlyMetrics();
  scheduleOvertimeAlerts();
  scheduleWeeklyAIDigest();
  scheduleTimesheetReminder();
  logger.info('✅ All scheduled jobs registered');
}
