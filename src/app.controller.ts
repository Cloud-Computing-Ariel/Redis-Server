import { Controller, Get, Inject, CACHE_MANAGER } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { AppService } from './app.service';

@Controller()
export class AppController {
  // @MessagePattern('test')
  // async handleMessage(message: KafkaMessage) {
  //   console.log("i have reached the controller.ts section")
  //   handleKafkaMessage(message);
  // }

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly appService: AppService,
  ) {}

  @Get('delete-all')
  async DeleteRedisDB() {
    await this.cacheManager.reset();
  }

  @Get('get-header')
  async getHeader(): Promise<any> {
    return this.appService.getDataForHeader();
  }

  @Get('get-body')
  async getBody(): Promise<any> {
    return this.appService.getDataForBody();
  }
}
