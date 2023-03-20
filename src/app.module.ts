import { HttpModule } from '@nestjs/axios';
import { Module, CacheModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KafkaModule } from './kafka/kafka.module';

import { RedisConsumer } from './redis.consumer';
//import { TestConsumer } from './test.consumer';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const redisStore = require('cache-manager-redis-store');

@Module({
  imports: [
    HttpModule,
    KafkaModule,
    CacheModule.register({
      store: redisStore,
      host: 'localhost',
      port: 6379,
    }),
  ],
  controllers: [AppController],
  providers: [AppService, AppController, RedisConsumer],
})
export class AppModule {}
