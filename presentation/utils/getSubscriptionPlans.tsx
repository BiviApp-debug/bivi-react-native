import { API_BASE_URL } from "../API/API";

export const getSubscriptionPlans = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/subscription-plans`);

    const data = await response.json();

    if (!data.success) {
      //console.log("❌ Error:", data.error);
      return [];
    }

    //console.log("📦 Planes recibidos:", data.plans);
    return data.plans;

  } catch (err) {
    console.error("⚠️ Error haciendo fetch:", err);
    return [];
  }
};


