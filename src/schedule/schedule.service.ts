import { Injectable } from '@nestjs/common';
import { SuggestSlotsDto, AvailableSlotsResponse } from './schedule.types';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import * as isBetween from 'dayjs/plugin/isBetween';
import 'dayjs/locale/pt-br';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

const DEFAULT_MAX_DAYS = 5;

@Injectable()
export class ScheduleService {
  private getSlotsDateMap(suggestSlotsDto: SuggestSlotsDto) {
    const slotsDateMap = {};
    const today = dayjs().tz(suggestSlotsDto.timezone).startOf('day');

    const daysToCheck =
      suggestSlotsDto.daysDistribution === 1
        ? 1
        : (suggestSlotsDto.maxDays ?? DEFAULT_MAX_DAYS);

    for (let i = 0; i < daysToCheck; i++) {
      const day = today.add(i, 'day');
      slotsDateMap[day.format('YYYY-MM-DD')] = [];
    }

    return slotsDateMap;
  }

  private getBusinessHours(
    businessHours: Record<string, any>,
    slotDate: string,
    timezone: string,
  ) {
    const date = dayjs(slotDate).tz(timezone);
    const dayName = date.format('dddd').toLowerCase();
    const dayBusinessHours = businessHours?.[dayName];

    if (!dayBusinessHours) return null;

    return dayBusinessHours.map((period: { start: string; end: string }) => {
      const [startHour, startMinute] = period.start.split(':').map(Number);
      const [endHour, endMinute] = period.end.split(':').map(Number);

      const startDate = dayjs(slotDate)
        .tz(timezone)
        .hour(startHour)
        .minute(startMinute)
        .second(0)
        .millisecond(0);

      const endDate = dayjs(slotDate)
        .tz(timezone)
        .hour(endHour)
        .minute(endMinute)
        .second(0)
        .millisecond(0);

      return {
        start: startDate.toDate(),
        end: endDate.toDate(),
      };
    });
  }

  private isSlotAvailable(
    slot: Date,
    busy: { start: string; end: string }[],
    businessHours: { start: Date; end: Date }[],
    timezone: string,
    appointmentDuration: number,
  ) {
    if (!busy || busy.length === 0) return true;

    if (!businessHours || businessHours.length === 0) return false;

    const slotDayjs = dayjs(slot).tz(timezone);
    const slotEnd = slotDayjs.add(appointmentDuration, 'minute');

    const businessHoursStart = dayjs(businessHours[0].start).tz(timezone);
    const businessHoursEnd = dayjs(businessHours[0].end).tz(timezone);

    if (businessHoursEnd.isBefore(businessHoursStart)) {
      if (slotDayjs.isSame(businessHoursStart, 'day')) {
        if (
          slotDayjs.isBefore(businessHoursStart) ||
          slotEnd.isAfter(dayjs(slot).endOf('day'))
        ) {
          return false;
        }
      } else {
        if (
          slotDayjs.isBefore(dayjs(slot).startOf('day')) ||
          slotEnd.isAfter(businessHoursEnd)
        ) {
          return false;
        }
      }
    } else {
      if (
        slotDayjs.isBefore(businessHoursStart) ||
        slotEnd.isAfter(businessHoursEnd)
      ) {
        return false;
      }
    }

    for (const busySlot of busy) {
      const busyStart = dayjs(busySlot.start).tz(timezone);
      const busyEnd = dayjs(busySlot.end).tz(timezone);

      if (slotDayjs.isBetween(busyStart, busyEnd, null, '[)')) {
        return false;
      }

      if (slotEnd.isBetween(busyStart, busyEnd, null, '(]')) {
        return false;
      }

      if (busyStart.isBetween(slotDayjs, slotEnd, null, '()')) {
        return false;
      }
    }

    return true;
  }

  private isInPreferredPeriod(
    slot: Date,
    periodPreference: string,
    timezone: string,
  ): boolean {
    const slotHour = dayjs(slot).tz(timezone).hour();

    switch (periodPreference?.toLowerCase()) {
      case 'manhã':
      case 'morning':
        return slotHour >= 6 && slotHour < 12;
      case 'tarde':
      case 'afternoon':
        return slotHour >= 12 && slotHour < 18;
      case 'noite':
      case 'evening':
        return slotHour >= 18 && slotHour < 22;
      default:
        return true;
    }
  }

  private generateSlotsForInterval(
    businessHours: { start: Date; end: Date }[],
    interval: number,
    busy: { start: string; end: string }[],
    appointmentDuration: number,
    timezone: string,
    periodPreference?: string,
  ) {
    const slots = [];
    const now = dayjs().tz(timezone);

    const minutesToAdd = interval - (now.minute() % interval);
    const nextSlotTime = now.add(minutesToAdd, 'minute').startOf('minute');

    for (const period of businessHours) {
      let currentSlot = dayjs(period.start).tz(timezone);
      const endSlot = dayjs(period.end).tz(timezone);

      if (endSlot.isBefore(nextSlotTime)) {
        continue;
      }

      if (currentSlot.isBefore(nextSlotTime)) {
        currentSlot = nextSlotTime;
      }

      while (currentSlot.isBefore(endSlot)) {
        const slotEnd = currentSlot.add(appointmentDuration, 'minute');

        if (slotEnd.isAfter(endSlot)) {
          break;
        }

        const isAvailable = this.isSlotAvailable(
          currentSlot.toDate(),
          busy,
          businessHours,
          timezone,
          appointmentDuration,
        );

        if (isAvailable) {
          const isPreferred = periodPreference
            ? this.isInPreferredPeriod(
                currentSlot.toDate(),
                periodPreference,
                timezone,
              )
            : true;

          if (isPreferred) {
            slots.push({
              start: currentSlot.toDate(),
              end: slotEnd.toDate(),
            });
          }
        }

        currentSlot = currentSlot.add(interval, 'minute');

        if (currentSlot.add(appointmentDuration, 'minute').isAfter(endSlot)) {
          break;
        }
      }
    }

    return slots.map((slot) => ({
      start: dayjs(slot.start).tz(timezone).format('YYYY-MM-DDTHH:mm:ssZ'),
      end: dayjs(slot.end).tz(timezone).format('YYYY-MM-DDTHH:mm:ssZ'),
    }));
  }

  private formatSlots(
    slots: { start: string; end: string }[],
    timezone: string,
  ) {
    dayjs.locale('pt-br');

    const formattedSlots = slots.map((slot) => {
      const date = dayjs(slot.start).tz(timezone).format('DD/MM/YYYY');
      const day = dayjs(slot.start).tz(timezone).format('dddd');
      const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1);
      const time = dayjs(slot.start).tz(timezone).format('HH:mm[h]');
      return `${date} ${capitalizedDay} às ${time}`;
    });

    dayjs.locale('en');

    return formattedSlots;
  }

  findAvailableSlots(suggestSlotsDto: SuggestSlotsDto): AvailableSlotsResponse {
    const slotsDateMap = this.getSlotsDateMap(suggestSlotsDto);
    const allSlots = [];
    const intervals = suggestSlotsDto.timeSlotIntervalsInMinutes || [60];

    const busySlots =
      suggestSlotsDto.busy?.map((slot) => ({
        start: slot.start,
        end: slot.end,
      })) || [];

    for (const slotDate in slotsDateMap) {
      if (allSlots.length >= suggestSlotsDto.maxSuggestions) break;

      const businessHours = this.getBusinessHours(
        suggestSlotsDto.businessHours,
        slotDate,
        suggestSlotsDto.timezone,
      );

      if (!businessHours) continue;

      const slots = this.generateSlotsForInterval(
        businessHours,
        intervals[0],
        busySlots,
        suggestSlotsDto.appointmentDurationInMinutes,
        suggestSlotsDto.timezone,
        suggestSlotsDto.periodPreference,
      );

      const uniqueSlots = new Set(
        allSlots.map((slot) => `${slot.start}-${slot.end}`),
      );

      const filteredSlots = slots.filter(
        (slot) => !uniqueSlots.has(`${slot.start}-${slot.end}`),
      );

      allSlots.push(...filteredSlots);
    }

    const finalSlots = allSlots.slice(0, suggestSlotsDto.maxSuggestions);
    const formattedSlots = this.formatSlots(
      finalSlots,
      suggestSlotsDto.timezone,
    );

    return { slots: finalSlots, formattedSlots };
  }
}
