import { Injectable } from '@nestjs/common';

@Injectable()
export class TimeService {
  getCurrentTime(): Date {
    return new Date();
  }

  async sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
