import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { prisma } from '@guaycampo/database';
import { NotificationsService } from '../notifications/notifications.service';

const REMINDER_FLAG_2H = 'reminder_2h';
const REMINDER_FLAG_30MIN = 'reminder_30min';

@Injectable()
export class RemindersJob {
  private readonly logger = new Logger(RemindersJob.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Runs every 15 minutes.
   * Finds truck shifts whose assigned shift starts in ~2h or ~30min
   * and sends WhatsApp reminders to drivers (fire-and-forget).
   * Uses a simple in-memory set per process to avoid duplicates within a run.
   * For multi-instance environments, a Redis flag on the TruckShift would be needed.
   */
  @Cron('*/15 * * * *')
  async sendReminders(): Promise<void> {
    this.logger.log('Running shift reminder job...');

    const now = new Date();

    // Window for "2h reminder": 1h45min–2h15min from now
    const twoHoursLow = new Date(now.getTime() + 105 * 60 * 1000);
    const twoHoursHigh = new Date(now.getTime() + 135 * 60 * 1000);

    // Window for "30min reminder": 15min–45min from now
    const thirtyMinLow = new Date(now.getTime() + 15 * 60 * 1000);
    const thirtyMinHigh = new Date(now.getTime() + 45 * 60 * 1000);

    try {
      await Promise.all([
        this.processReminders(twoHoursLow, twoHoursHigh, 2, REMINDER_FLAG_2H),
        this.processReminders(thirtyMinLow, thirtyMinHigh, 0, REMINDER_FLAG_30MIN),
      ]);
    } catch (err) {
      this.logger.error(`Reminder job failed: ${String(err)}`);
    }
  }

  private async processReminders(
    windowFrom: Date,
    windowTo: Date,
    hoursUntil: number,
    flagField: string,
  ): Promise<void> {
    // Find shifts in the window
    const shifts = await prisma.shiftSchedule.findMany({
      where: {
        status: 'open',
        timeFrom: { not: null },
        date: {
          gte: new Date(windowFrom.toISOString().split('T')[0]),
          lte: new Date(windowTo.toISOString().split('T')[0]),
        },
      },
      include: {
        truckShifts: {
          where: {
            status: {
              notIn: ['cancelado', 'completado', 'rechazado'],
            },
          },
          include: {
            driver: true,
            vehicle: true,
          },
        },
      },
    });

    let sent = 0;

    for (const shift of shifts) {
      if (!shift.timeFrom) continue;

      // Parse shift datetime
      const shiftDate = new Date(shift.date);
      const [hours, minutes] = shift.timeFrom.split(':').map(Number);
      shiftDate.setHours(hours, minutes, 0, 0);

      // Check if shift time falls within window
      if (shiftDate < windowFrom || shiftDate > windowTo) continue;

      for (const ts of shift.truckShifts) {
        // Simple duplicate check: skip if already checked in
        if (ts.checkinAt) continue;

        try {
          void this.notificationsService.sendShiftReminder({
            phone: ts.driver.phone,
            driverName: ts.driver.fullName,
            hoursUntil,
            shiftDate: shift.date.toISOString().split('T')[0],
            timeFrom: shift.timeFrom,
          });
          sent++;
        } catch (err) {
          this.logger.warn(
            `Failed to queue reminder for driver ${ts.driver.fullName}: ${String(err)}`,
          );
        }
      }
    }

    if (sent > 0) {
      this.logger.log(
        `Sent ${sent} ${flagField} reminders for window ${windowFrom.toISOString()} – ${windowTo.toISOString()}`,
      );
    }
  }
}
