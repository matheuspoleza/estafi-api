export interface SuggestSlotsDto {
  busy?: { start: string; end: string }[];
  businessHours: Record<string, { start: string; end: string }[]>;
  appointmentDurationInMinutes: number;
  timezone: string;
  maxSuggestions: number;
  maxDays?: number;
  daysDistribution?: number;
  periodPreference?: string;
  timeSlotIntervalsInMinutes?: number[];
  id?: string;
}

export interface AvailableSlotsResponse {
  slots: { start: string; end: string }[];
  formattedSlots: string[];
}
