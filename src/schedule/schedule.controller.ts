import { Body, Controller, Post } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { SuggestSlotsDto } from './schedule.types';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post('suggestions')
  async createSuggestions(@Body() body: SuggestSlotsDto) {
    const { slots, formattedSlots } =
      await this.scheduleService.findAvailableSlots(body);

    return { id: body.id, slots, formattedSlots };
  }
}
