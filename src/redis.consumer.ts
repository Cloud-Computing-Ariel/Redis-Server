import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';

import { ConsumerService } from './kafka/consumer.service';
import {
  message_status_order,
  message_status_restuarant,
  newOrder,
  PizzaProfile,
} from './shared/model/pizzaProfile';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisConsumer implements OnModuleInit {
  constructor(
    private readonly consumerService: ConsumerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  Pizza_order: Partial<PizzaProfile> = {};
  kafka_msg_res_status: Partial<message_status_restuarant> = {};
  kafka_msg_order_status: Partial<message_status_order> = {};
  kafka_msg_Neworder: Partial<newOrder> = {};
  async ChangeRestuarantStatus(msg: message_status_restuarant) {
    const data = await this.cacheManager.get<PizzaProfile>(
      `${msg.pizzeria_id}`,
    );
    if (data) {
      data.is_open = msg.status;
      await this.cacheManager.set(`${msg.pizzeria_id}`, data, { ttl: 100000 });
    } else {
      this.Pizza_order = {
        is_open: true,
        name: `${msg.name}`,
        pizzeria_id: `${msg.pizzeria_id}`,
        region: `${msg.region}`,
        orders: [],
      };
      this.cacheManager.set<PizzaProfile>(
        `${msg.pizzeria_id}`,
        this.Pizza_order,
        { ttl: 100000 },
      );
    }
  }
  getMinutesPassedSinceDate(dateStr) {

    const date = new Date(Date.parse(dateStr));
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutesPassed = Math.round(diff / (1000 * 60));
    return minutesPassed;
   }

   async ChangeorderStatus(msg:message_status_order){
  
    let data = await this.cacheManager.get<PizzaProfile>(`${msg.pizzeria_id}`)
    if(data){
      for(const order of data.orders){
        
        if(order.order_id==msg.order_id){
          const time_passed=this.getMinutesPassedSinceDate(order.time)
          
          order.order_status=msg.status
          order.time_to_order=time_passed.toString()
        }
      }
      await this.cacheManager.set( `${msg.pizzeria_id}`, data,{ttl: 100000});
      
    }
  }
  async InsertData(msg: newOrder) {
    //if the restuarant is already in DB than just add the order to that key
    const data = await this.cacheManager.get<PizzaProfile>(
      `${msg.pizzeria_id}`,
    );
    if (data) {
      data.orders.push(msg.order);
      await this.cacheManager.set<PizzaProfile>(`${msg.pizzeria_id}`, data, {
        ttl: 100000,
      });
    } else {
      this.Pizza_order = {
        is_open: true,
        name: `${msg.name}`,
        pizzeria_id: `${msg.pizzeria_id}`,
        region: `${msg.region}`,
        orders: [msg.order],
      };

      this.cacheManager.set<PizzaProfile>(
        `${msg.pizzeria_id}`,
        this.Pizza_order,
        { ttl: 100000 },
      );
    }
  }

  async onModuleInit() {
    await this.consumerService.consume(
      [
        { topic: 'new-order' },
        { topic: 'restaurant-status-change' },
        { topic: 'order-status-change' },
      ],
      {
        eachMessage: async ({ topic, message }) => {
          if (topic == 'restaurant-status-change') {
            const temp = message.value.toString();
            const myObject = JSON.parse(temp);
            const myArray = Object.values(myObject);
            const myBoolean = !!myArray[3];

            this.kafka_msg_res_status = {
              pizzeria_id: myArray[0].toString(),
              name: myArray[1].toString(),
              region: myArray[2].toString(),
              status: myBoolean,
            };

            this.ChangeRestuarantStatus(this.kafka_msg_res_status);
          } else if (topic == 'order-status-change') {
            const temp = message.value.toString();
            const myObject = JSON.parse(temp);
            const myArray = Object.values(myObject);
            //const myBoolean:boolean =!!myArray[3]

            this.kafka_msg_order_status = {
              pizzeria_id: myArray[0].toString(),
              order_id: myArray[1].toString(),
              status: myArray[2].toString(),
            };

            this.ChangeorderStatus(this.kafka_msg_order_status);
          } else if (topic == 'new-order') {
            const temp = message.value.toString();
            const myObject = JSON.parse(temp);
            const myArray = Object.values(myObject);
            this.kafka_msg_Neworder = {
              pizzeria_id: myArray[0].toString(),
              name: myArray[1].toString(),
              region: myArray[2].toString(),
              order: myArray[3],
            };
            this.InsertData(this.kafka_msg_Neworder);
          }
          // Handle message for 'restaurant-status-change' topic here
        },
      },
    );
  }
}
