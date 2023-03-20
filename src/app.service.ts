import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import {
  bodyCardData,
  headerCardData,
  PizzaProfile,
} from './shared/model/pizzaProfile';
import { Cache } from 'cache-manager';

@Injectable()
export class AppService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}
  total_orders = 0;
  open_orders = 0;
  operation_time = 0;
  open_pizzeria = 0;

  appService: any;

  sendToHeader: Partial<headerCardData> = {
    totalOpenOrders: 0,
    totalOrders: 0,
    openStores: 0,
    avgTimeSpent: 0,
  };

  sendToBody: Partial<bodyCardData> = {
    topToppingsOrdered: {
      data: [0, 0, 0, 0, 0],
      categories: [],
    },
    topBranchesLowestWaitTime: {
      data: [0, 0, 0, 0, 0],
      categories: [],
    },
    DistriByArea: {
      data: [0, 0, 0, 0, 0],
      categories: [],
    },
    numberOfOrders: {
      data: [0, 0, 0, 0],
      categories: [],
    },
  };
  Pizza_order: Partial<PizzaProfile> = {};

  getHourAndMinutes(timeString: string): string {
    const date = new Date(timeString);
    const hour = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hour}:${minutes}`;
  }

  roundTimeToNearestHour(time: string): string {
    time = this.getHourAndMinutes(time);
    const [hours, minutes] = time.split(':').map(Number);

    if (hours % 2 == 0) {
      return this.formatTime(hours, 0);
    }
    if (hours % 2 == 1 && hours + 1 == 24) {
      return `00:00`;
    }
    if (hours % 2 == 1) {
      return this.formatTime(hours + 1, 0);
    }
    if (minutes < 30) {
      return this.formatTime(hours, 0);
    } else if (minutes >= 30 && hours < 23) {
      return this.formatTime(hours + 1, 0);
    } else if (minutes >= 30 && hours === 23) {
      return '00:00';
    }
  }

  private formatTime(hours: number, minutes: number): string {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;
  }

  async getDataForHeader() {
    const cache = await this.cacheManager.store;
    const keys = await new Promise<string[]>((resolve, reject) => {
      cache.keys('*', (err, keys) => {
        if (err) {
          reject(err);
        } else {
          resolve(keys);
        }
      });
    });
    let temp_operation_time = 0;
    let count_closed_orders = 0;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = await this.cacheManager.get<PizzaProfile>(key);
      if (value.is_open) {
        this.open_pizzeria++;
      }

      this.total_orders += value.orders.length;
      for (const order of value.orders) {
        if (order.status == 'open') {
          this.open_orders++;
        }
        if (order.status == 'closed') {
          temp_operation_time += parseInt(order.time_to_order);
          count_closed_orders++;
        }
      }
      //when i reached the end of the keys here i will save all the data i need!
      if (i == keys.length - 1) {
        if (count_closed_orders != 0) {
          this.operation_time = Math.round(
            temp_operation_time / count_closed_orders,
          );
        } else {
          this.operation_time = 0;
        }
        this.sendToHeader = {
          totalOpenOrders: this.open_orders,
          totalOrders: this.total_orders,
          openStores: this.open_pizzeria,
          avgTimeSpent: this.operation_time,
        };
        this.open_orders = 0;
        this.total_orders = 0;
        this.open_pizzeria = 0;
        this.operation_time = 0;
        return this.sendToHeader;
      }
    }
  }
  async getDataForBody() {
    const cache = await this.cacheManager.store;
    const keys = await new Promise<string[]>((resolve, reject) => {
      cache.keys('*', (err, keys) => {
        if (err) {
          reject(err);
        } else {
          resolve(keys);
        }
      });
    });

    const toppingsCount: { [key: string]: number } = {};
    const orderAccordinglyToTime: { [key: string]: number } = {};
    const regionOrderCount: { [key: string]: number } = {};
    const cityData = {};
    let region_temp_count = 0;
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      const value = await this.cacheManager.get<PizzaProfile>(key);
      region_temp_count = value.orders.length;
      if (regionOrderCount[value.region] == null) {
        regionOrderCount[value.region] = region_temp_count;
      } else {
        regionOrderCount[value.region] += region_temp_count;
      }
      if (value) {
        for (const order of value.orders) {
          orderAccordinglyToTime[
            this.roundTimeToNearestHour(order.statusTime)
          ] =
            (orderAccordinglyToTime[
              this.roundTimeToNearestHour(order.statusTime)
            ] || 0) + 1;

          if (value.name in cityData) {
            if (order.status == 'closed') {
              cityData[value.name].timeSum += parseInt(order.time_to_order);
              cityData[value.name].count++;
            }
          } else {
            if (order.status == 'closed') {
              // If it isn't, create a new city data object
              cityData[value.name] = {
                timeSum: parseInt(order.time_to_order),
                count: 1,
              };
            }
          }

          order.toppings.forEach((topping) => {
            //mapping each topping to the number of time
            toppingsCount[topping] = (toppingsCount[topping] || 0) + 1;
          });
        }

        //when i reached the end of the keys here i will save all the data i need!
        if (index == keys.length - 1) {
          const sortedToppingsCount: [string, number][] = Object.entries(
            toppingsCount,
          ).sort((a, b) => b[1] - a[1]);
          const sortedToppings: string[] = sortedToppingsCount.map(
            (toppingCount) => toppingCount[0],
          );
          const sortedCounts: number[] = sortedToppingsCount.map(
            (toppingCount) => toppingCount[1],
          );
          const finalsortedToppings = sortedToppings.slice(0, 5);
          const finalsortedCounts = sortedCounts.slice(0, 5);

          const cityNames = [];
          const cityAverages = [];
          for (const cityName in cityData) {
            const avgTime =
              cityData[cityName].timeSum / cityData[cityName].count;

            cityNames.push(cityName);
            cityAverages.push(Math.round(avgTime));
          }
          cityNames.sort(
            (a, b) =>
              cityData[a].timeSum / cityData[a].count -
              cityData[b].timeSum / cityData[b].count,
          );
          const finalcityNames = cityNames.slice(0, 5);
          cityAverages.sort((a, b) => a - b);
          const finalcityAverages = cityAverages.slice(0, 5);

          const myArray = Object.entries(regionOrderCount);
          myArray.sort((a, b) => b[1] - a[1]);
          const namesArray = myArray.map((item) => item[0]);
          const numbersArray = myArray.map((item) => item[1]);

          const myArray2 = Object.entries(orderAccordinglyToTime);
          myArray2.sort((a, b) => a[1] - b[1]);
          const timeArray = myArray2.map((item) => item[0]);
          const countsArray = myArray2.map((item) => item[1]);

          this.sendToBody = {
            topToppingsOrdered: {
              data: finalsortedCounts,
              categories: finalsortedToppings,
            },
            topBranchesLowestWaitTime: {
              data: finalcityAverages,
              categories: finalcityNames,
            },
            DistriByArea: {
              data: numbersArray,
              categories: namesArray,
            },
            numberOfOrders: {
              data: countsArray,
              categories: timeArray,
            },
          };
          return this.sendToBody;
        }
      }
    }
  }
}
