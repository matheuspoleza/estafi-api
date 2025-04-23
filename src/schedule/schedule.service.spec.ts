import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleService } from './schedule.service';
import { SuggestSlotsDto } from './schedule.types';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

describe('ScheduleService', () => {
  let service: ScheduleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScheduleService],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAvailableSlots', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-04-25T00:00:00-03:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return available slots based on input parameters', () => {
      const suggestSlotsDto: SuggestSlotsDto = {
        busy: [],
        businessHours: {
          monday: [{ start: '09:00', end: '17:00' }],
          tuesday: [{ start: '09:00', end: '17:00' }],
          wednesday: [{ start: '09:00', end: '17:00' }],
          thursday: [{ start: '09:00', end: '17:00' }],
          friday: [{ start: '09:00', end: '17:00' }],
          saturday: [{ start: '09:00', end: '17:00' }],
          sunday: [{ start: '09:00', end: '17:00' }],
        },
        appointmentDurationInMinutes: 90,
        timezone: 'America/Sao_Paulo',
        maxSuggestions: 5,
        maxDays: 5,
      };

      const result = service.findAvailableSlots(suggestSlotsDto);
      expect(result).toBeDefined();
    });

    it('should return empty array when no business hours are provided', () => {
      const suggestSlotsDto: SuggestSlotsDto = {
        busy: [],
        businessHours: {},
        appointmentDurationInMinutes: 30,
        timezone: 'America/Sao_Paulo',
        maxSuggestions: 5,
      };

      const result = service.findAvailableSlots(suggestSlotsDto);
      expect(result.slots).toEqual([]);
    });

    it('should respect busy slots and not suggest them', () => {
      const suggestSlotsDto: SuggestSlotsDto = {
        busy: [
          {
            start: '2025-04-25T10:30:00-03:00',
            end: '2025-04-25T12:00:00-03:00',
          },
        ],
        businessHours: {
          monday: [{ start: '09:00', end: '17:00' }],
          tuesday: [{ start: '09:00', end: '17:00' }],
          wednesday: [{ start: '09:00', end: '17:00' }],
          thursday: [{ start: '09:00', end: '17:00' }],
          friday: [{ start: '09:00', end: '17:00' }],
          saturday: [{ start: '09:00', end: '17:00' }],
          sunday: [{ start: '09:00', end: '17:00' }],
        },
        appointmentDurationInMinutes: 90,
        timezone: 'America/Sao_Paulo',
        maxSuggestions: 5,
        maxDays: 5,
        daysDistribution: 5,
        periodPreference: 'morning',
        timeSlotIntervalsInMinutes: [60],
      };

      const result = service.findAvailableSlots(suggestSlotsDto);

      result.slots.forEach((slot) => {
        const slotStart = new Date(slot.start);
        const slotEnd = new Date(slot.end);
        const busyStart = new Date('2025-04-25T10:30:00-03:00');
        const busyEnd = new Date('2025-04-25T12:00:00-03:00');

        expect(slotStart >= busyEnd || slotEnd <= busyStart).toBeTruthy();
      });
    });

    it('should respect maxSuggestions parameter', () => {
      const suggestSlotsDto: SuggestSlotsDto = {
        busy: [],
        businessHours: {
          monday: [{ start: '09:00', end: '17:00' }],
        },
        appointmentDurationInMinutes: 30,
        timezone: 'America/Sao_Paulo',
        maxSuggestions: 3,
      };

      const result = service.findAvailableSlots(suggestSlotsDto);
      expect(result).toBeDefined();
      expect(Array.isArray(result.slots)).toBeTruthy();
      expect(result.slots.length).toBeLessThanOrEqual(3);
    });

    it('should handle overlapping business hours correctly', () => {
      const suggestSlotsDto: SuggestSlotsDto = {
        busy: [],
        businessHours: {
          monday: [
            { start: '09:00', end: '17:00' },
            { start: '11:00', end: '14:00' },
            { start: '13:00', end: '17:00' },
          ],
        },
        appointmentDurationInMinutes: 60,
        timezone: 'America/Sao_Paulo',
        maxSuggestions: 5,
      };

      const result = service.findAvailableSlots(suggestSlotsDto);
      expect(result).toBeDefined();
      expect(Array.isArray(result.slots)).toBeTruthy();
      expect(result.slots.length).toBe(5);

      result.slots.forEach((slot) => {
        const startDate = new Date(slot.start);
        const endDate = new Date(slot.end);

        expect(slot.start).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}$/,
        );
        expect(slot.end).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}$/,
        );

        expect(endDate.getTime() - startDate.getTime()).toBe(60 * 60 * 1000); // 60 minutos

        const startHour = startDate.getHours();
        expect(startHour).toBeGreaterThanOrEqual(9);
        expect(startHour).toBeLessThan(17);
      });
    });

    it('should handle very short appointment duration (5 minutes)', () => {
      const suggestSlotsDto: SuggestSlotsDto = {
        busy: [],
        businessHours: {
          monday: [{ start: '09:00', end: '17:00' }],
        },
        appointmentDurationInMinutes: 5,
        timezone: 'America/Sao_Paulo',
        maxSuggestions: 8,
      };

      const result = service.findAvailableSlots(suggestSlotsDto);

      expect(result).toBeDefined();
      expect(Array.isArray(result.slots)).toBeTruthy();
      expect(result.slots.length).toBe(8);

      result.slots.forEach((slot) => {
        const startDate = new Date(slot.start);
        const endDate = new Date(slot.end);

        expect(slot.start).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}$/,
        );
        expect(slot.end).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}$/,
        );

        expect(endDate.getTime() - startDate.getTime()).toBe(5 * 60 * 1000);

        const startHour = startDate.getHours();
        expect(startHour).toBeGreaterThanOrEqual(9);
        expect(startHour).toBeLessThan(17);
      });
    });

    it('should handle very long appointment duration (4 hours)', () => {
      const suggestSlotsDto: SuggestSlotsDto = {
        busy: [],
        businessHours: {
          monday: [{ start: '09:00', end: '17:00' }],
        },
        appointmentDurationInMinutes: 240,
        timezone: 'America/Sao_Paulo',
        maxSuggestions: 2,
      };

      const result = service.findAvailableSlots(suggestSlotsDto);
      expect(result).toBeDefined();
      expect(Array.isArray(result.slots)).toBeTruthy();
      expect(result.slots.length).toBe(2);

      // Verifica os horários retornados
      result.slots.forEach((slot) => {
        const startDate = new Date(slot.start);
        const endDate = new Date(slot.end);

        expect(slot.start).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}$/,
        );
        expect(slot.end).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}$/,
        );

        expect(endDate.getTime() - startDate.getTime()).toBe(240 * 60 * 1000); // 4 horas

        const startHour = startDate.getHours();
        expect(startHour).toBeGreaterThanOrEqual(9);
        expect(startHour).toBeLessThan(13); // Último horário possível para 4 horas
      });
    });

    it('should handle timezone changes correctly', () => {
      const suggestSlotsDto: SuggestSlotsDto = {
        busy: [],
        businessHours: {
          monday: [{ start: '09:00', end: '17:00' }],
        },
        appointmentDurationInMinutes: 60,
        timezone: 'America/New_York',
        maxSuggestions: 5,
        maxDays: 7,
      };

      const result = service.findAvailableSlots(suggestSlotsDto);
      expect(result).toBeDefined();
      expect(result.slots.length).toBe(5);

      result.slots.forEach((slot) => {
        const startDate = dayjs(slot.start).tz('America/New_York');
        const endDate = dayjs(slot.end).tz('America/New_York');

        expect(slot.start).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}$/,
        );
        expect(slot.end).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}$/,
        );
        expect(startDate.format('Z')).toBe('-04:00'); // America/New_York é UTC-4
        expect(endDate.diff(startDate, 'minute')).toBe(60); // 60 minutos
      });
    });

    it('should handle completely booked day', () => {
      const suggestSlotsDto: SuggestSlotsDto = {
        busy: [
          {
            start: '2025-04-23T09:00:00-03:00',
            end: '2025-04-23T17:00:00-03:00',
          },
        ],
        businessHours: {
          wednesday: [{ start: '09:00', end: '17:00' }],
        },
        appointmentDurationInMinutes: 60,
        timezone: 'America/Sao_Paulo',
        maxSuggestions: 5,
      };

      const result = service.findAvailableSlots(suggestSlotsDto);
      expect(result).toBeDefined();
      expect(result.slots).toEqual([]);
    });

    it('should handle very short business hours (1 hour)', () => {
      const suggestSlotsDto: SuggestSlotsDto = {
        busy: [],
        businessHours: {
          monday: [{ start: '09:00', end: '10:00' }],
        },
        appointmentDurationInMinutes: 30,
        timeSlotIntervalsInMinutes: [30],
        timezone: 'America/Sao_Paulo',
        maxSuggestions: 2,
      };

      const result = service.findAvailableSlots(suggestSlotsDto);
      expect(result).toBeDefined();
      expect(result.slots.length).toBe(2);

      result.slots.forEach((slot) => {
        const startDate = new Date(slot.start);
        const endDate = new Date(slot.end);

        expect(slot.start).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}$/,
        );
        expect(slot.end).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}$/,
        );

        expect(endDate.getTime() - startDate.getTime()).toBe(30 * 60 * 1000);

        const startHour = startDate.getHours();
        const startMinutes = startDate.getMinutes();
        expect(startHour).toBe(9);
        expect(startMinutes).toBeLessThanOrEqual(30);
      });
    });

    it('should handle multiple days with different business hours', () => {
      const suggestSlotsDto: SuggestSlotsDto = {
        busy: [],
        businessHours: {
          monday: [{ start: '09:00', end: '12:00' }],
          tuesday: [{ start: '14:00', end: '18:00' }],
          wednesday: [{ start: '08:00', end: '16:00' }],
          thursday: [{ start: '13:00', end: '14:00' }],
          friday: [{ start: '14:00', end: '18:00' }],
        },
        appointmentDurationInMinutes: 60,
        timezone: 'America/Sao_Paulo',
        maxSuggestions: 10,
        maxDays: 5,
      };

      const result = service.findAvailableSlots(suggestSlotsDto);
      expect(result).toBeDefined();
      expect(result.slots.length).toBe(10);

      result.slots.forEach((slot) => {
        const startDate = new Date(slot.start);
        const endDate = new Date(slot.end);

        expect(slot.start).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}$/,
        );
        expect(slot.end).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}$/,
        );

        expect(endDate.getTime() - startDate.getTime()).toBe(60 * 60 * 1000);

        const dayOfWeek = startDate.getDay();
        const startHour = startDate.getHours();

        if (dayOfWeek === 1) {
          expect(startHour).toBeGreaterThanOrEqual(9);
          expect(startHour).toBeLessThan(12);
        } else if (dayOfWeek === 2) {
          expect(startHour).toBeGreaterThanOrEqual(14);
          expect(startHour).toBeLessThan(18);
        } else if (dayOfWeek === 3) {
          expect(startHour).toBeGreaterThanOrEqual(8);
          expect(startHour).toBeLessThan(16);
        }
      });
    });

    it('should handle edge cases with maxDays parameter', () => {
      const suggestSlotsDto: SuggestSlotsDto = {
        busy: [],
        businessHours: {
          monday: [{ start: '09:00', end: '17:00' }],
        },
        appointmentDurationInMinutes: 60,
        timezone: 'America/Sao_Paulo',
        maxSuggestions: 5,
        maxDays: 0,
      };

      const result = service.findAvailableSlots(suggestSlotsDto);
      expect(result.slots).toBeDefined();
      expect(result.slots).toEqual([]);
    });

    it('should handle edge cases with maxSuggestions parameter', () => {
      const suggestSlotsDto: SuggestSlotsDto = {
        busy: [],
        businessHours: {
          monday: [{ start: '09:00', end: '17:00' }],
        },
        appointmentDurationInMinutes: 60,
        timezone: 'America/Sao_Paulo',
        maxSuggestions: 0,
      };

      const result = service.findAvailableSlots(suggestSlotsDto);
      expect(result.slots).toBeDefined();
      expect(result.slots).toEqual([]);
    });

    it('should not return duplicate slots', () => {
      jest.setSystemTime(new Date('2025-04-23T09:00:00-03:00'));

      const suggestSlotsDto: SuggestSlotsDto = {
        busy: [
          {
            start: '2025-04-22T09:00:00-03:00',
            end: '2025-04-22T10:00:00-03:00',
          },
          {
            start: '2025-04-22T11:00:00-03:00',
            end: '2025-04-22T20:00:00-03:00',
          },
          {
            start: '2025-04-23T10:00:00-03:00',
            end: '2025-04-23T19:00:00-03:00',
          },
          {
            start: '2025-04-24T11:00:00-03:00',
            end: '2025-04-24T12:00:00-03:00',
          },
          {
            start: '2025-04-24T13:00:00-03:00',
            end: '2025-04-24T14:00:00-03:00',
          },
          {
            start: '2025-04-24T17:00:00-03:00',
            end: '2025-04-24T20:00:00-03:00',
          },
          {
            start: '2025-04-25T09:00:00-03:00',
            end: '2025-04-25T11:00:00-03:00',
          },
          {
            start: '2025-04-25T12:00:00-03:00',
            end: '2025-04-25T20:00:00-03:00',
          },
          {
            start: '2025-04-26T08:00:00-03:00',
            end: '2025-04-26T14:00:00-03:00',
          },
          {
            start: '2025-04-28T08:00:00-03:00',
            end: '2025-04-28T09:00:00-03:00',
          },
          {
            start: '2025-04-28T11:00:00-03:00',
            end: '2025-04-28T20:00:00-03:00',
          },
          {
            start: '2025-04-29T08:00:00-03:00',
            end: '2025-04-29T08:30:53-03:00',
          },
        ],
        businessHours: {
          monday: [{ start: '08:00', end: '14:00' }],
          tuesday: [{ start: '08:00', end: '14:00' }],
          wednesday: [{ start: '08:00', end: '20:00' }],
          thursday: [{ start: '08:00', end: '20:00' }],
          friday: [{ start: '08:00', end: '14:00' }],
          saturday: [{ start: '08:00', end: '14:00' }],
          sunday: null,
        },
        appointmentDurationInMinutes: 90,
        timezone: 'America/Sao_Paulo',
        maxSuggestions: 5,
        maxDays: 5,
        timeSlotIntervalsInMinutes: [60],
        id: 'Suellen Grassoti',
        periodPreference: 'manhã',
      };

      const result = service.findAvailableSlots(suggestSlotsDto);

      const uniqueSlots = new Set(
        result.slots.map((slot) => `${slot.start}-${slot.end}`),
      );

      expect(result.slots.length).toBeGreaterThan(0);
      expect(uniqueSlots.size).toBe(result.slots.length);
    });

    it('should round slots to the next closed hour based on interval', () => {
      jest.setSystemTime(new Date('2025-04-25T09:16:00-03:00'));

      const suggestSlotsDto: SuggestSlotsDto = {
        busy: [],
        businessHours: {
          friday: [{ start: '09:00', end: '17:00' }],
        },
        appointmentDurationInMinutes: 60,
        timezone: 'America/Sao_Paulo',
        maxSuggestions: 5,
        timeSlotIntervalsInMinutes: [60],
      };

      const result = service.findAvailableSlots(suggestSlotsDto);

      const firstSlot = new Date(result.slots[0].start);
      expect(firstSlot.getHours()).toBe(10);
      expect(firstSlot.getMinutes()).toBe(0);

      result.slots.forEach((slot, index) => {
        const startDate = new Date(slot.start);
        const endDate = new Date(slot.end);

        expect(startDate.getMinutes()).toBe(0);
        expect(endDate.getTime() - startDate.getTime()).toBe(60 * 60 * 1000);

        if (index > 0) {
          const previousSlot = new Date(result.slots[index - 1].start);
          expect(startDate.getTime() - previousSlot.getTime()).toBe(
            60 * 60 * 1000,
          );
        }
      });
    });

    it('should respect specific interval when provided', async () => {
      jest.setSystemTime(new Date('2025-04-25T09:16:00-03:00'));

      const suggestSlotsDto: SuggestSlotsDto = {
        busy: [],
        businessHours: {
          friday: [{ start: '09:00', end: '17:00' }],
        },
        appointmentDurationInMinutes: 60,
        timezone: 'America/Sao_Paulo',
        maxSuggestions: 5,
        timeSlotIntervalsInMinutes: [60], // Apenas intervalos de 60 minutos
      };

      const result = service.findAvailableSlots(suggestSlotsDto);

      // Verifica se todos os slots seguem o intervalo de 60 minutos
      result.slots.forEach((slot, index) => {
        const startDate = new Date(slot.start);
        const endDate = new Date(slot.end);

        // Verifica se o horário começa em hora fechada
        expect(startDate.getMinutes()).toBe(0);

        // Verifica se a duração é de 60 minutos
        expect(endDate.getTime() - startDate.getTime()).toBe(60 * 60 * 1000);

        // Verifica se o intervalo entre slots é de 60 minutos
        if (index > 0) {
          const previousSlot = new Date(result.slots[index - 1].start);
          expect(startDate.getTime() - previousSlot.getTime()).toBe(
            60 * 60 * 1000,
          );
        }
      });

      // Verifica se não há slots com intervalos de 15 ou 30 minutos
      const allMinutes = result.slots.map((slot) =>
        new Date(slot.start).getMinutes(),
      );
      expect(allMinutes.every((minute) => minute === 0)).toBeTruthy();
    });

    it('should respect 60-minute interval with real scenario data', async () => {
      jest.setSystemTime(new Date('2025-04-22T10:05:22-03:00'));

      const suggestSlotsDto: SuggestSlotsDto = {
        busy: [
          {
            start: '2025-04-22T10:05:22-03:00',
            end: '2025-04-22T11:00:00-03:00',
          },
          {
            start: '2025-04-22T15:00:00-03:00',
            end: '2025-04-22T20:00:00-03:00',
          },
          {
            start: '2025-04-23T13:00:00-03:00',
            end: '2025-04-23T14:00:00-03:00',
          },
          {
            start: '2025-04-23T15:00:00-03:00',
            end: '2025-04-23T20:00:00-03:00',
          },
          {
            start: '2025-04-24T08:00:00-03:00',
            end: '2025-04-24T20:00:00-03:00',
          },
          {
            start: '2025-04-25T08:00:00-03:00',
            end: '2025-04-25T20:00:00-03:00',
          },
          {
            start: '2025-04-26T08:00:00-03:00',
            end: '2025-04-26T14:00:00-03:00',
          },
          {
            start: '2025-04-28T08:00:00-03:00',
            end: '2025-04-28T20:00:00-03:00',
          },
          {
            start: '2025-04-29T08:00:00-03:00',
            end: '2025-04-29T10:05:22-03:00',
          },
        ],
        businessHours: {
          monday: [{ start: '11:00', end: '16:00' }],
          tuesday: [{ start: '11:00', end: '16:00' }],
          wednesday: [{ start: '11:00', end: '16:00' }],
          thursday: [{ start: '11:00', end: '16:00' }],
          friday: [{ start: '13:00', end: '16:00' }],
          saturday: [{ start: '08:00', end: '14:00' }],
          sunday: null,
        },
        appointmentDurationInMinutes: 60,
        timezone: 'America/Sao_Paulo',
        maxSuggestions: 5,
        maxDays: 7,
        timeSlotIntervalsInMinutes: [60],
        id: 'test-id',
        periodPreference: 'manhã',
      };

      const result = service.findAvailableSlots(suggestSlotsDto);

      result.formattedSlots.forEach((formattedSlot) => {
        expect(formattedSlot).toMatch(/às \d{2}:00h$/);
      });
    });
  });
});
