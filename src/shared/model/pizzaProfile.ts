export interface PizzaProfile {
    is_open?:boolean,
    pizzeria_id?:string,
    name?:string,
    region?:string,
    orders?: ordersObj[]
    
}
export interface ordersObj{
    order_id?: string,
    order_status?: string,
    time?: string,
    time_to_order?: string,
    toppings?:string []
}
export interface newOrder{
    pizzeria_id?:string,
    name?:string,
    region?:string,
    order?:ordersObj

}

export interface headerCardData {
    totalOpenOrders?: number,
    totalOrders?: number,
    openStores?: number,
    avgTimeSpent?: number,
  }
  export interface bodyCardData {
    topToppingsOrdered: {
      data?: number[],
      categories: string[]
    };
    topBranchesLowestWaitTime:{
        data?: number[],
      categories: string[]
    },
    DistriByArea:{
        data?: number[],
      categories: string[]
    },
    numberOfOrders:{
        data?: number[],
      categories: string[]
    },
  }
  export interface message_status_restuarant{
    pizzeria_id?:string,
    name?:string,
    region?:string,
    status?:boolean

  }
  export interface message_status_order{
    pizzeria_id?:string,
    order_id?:string,
    status?:string

  }
  
 