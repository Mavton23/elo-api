import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('time-check')
    checkTime() {
      const now = new Date();
      return {
        serverTime: now.toISOString(),
        unixTimestamp: Math.floor(now.getTime() / 1000),
        localTime: now.toString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        hour: now.getHours(),
        minute: now.getMinutes(),
      };
    }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
