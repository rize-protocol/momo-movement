import { Controller, Get, Injectable } from '@nestjs/common';

import { Public } from '@/common/decorators/auth.decorator';

@Injectable()
@Public()
@Controller('health-check')
export class HealthCheckController {
  @Get()
  async check() {
    return true;
  }
}
