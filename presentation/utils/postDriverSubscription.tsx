 import { API_BASE_URL } from '../API/API'
 export const postDriverSubscription = async (user:string,isActive:string,value:string,expirateDate:string,date:string,paymentMethod:string)=>{
 
 const response = await fetch(`${API_BASE_URL}/driverSubscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          isActive: isActive,
          value: Number(value),
          expirateDate,
          date,
          paymentMethod,
        }),
      });

      const data = await response.json();
      return data;

    }