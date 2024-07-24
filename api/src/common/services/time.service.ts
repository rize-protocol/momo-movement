import { Injectable } from '@nestjs/common';

@Injectable()
export class TimeService {
  getCurrentTime(): Date {
    return new Date();
  }

  getCurrentSecondPrecisionTime() {
    const currentTime = this.getCurrentTime();
    currentTime.setMilliseconds(0);
    return currentTime;
  }

  async sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
