import { API_BASE_URL } from "../API/API";


// GET – obtener rating por usuario
export const getRatingByUser = async (user:string) => {
  const res = await fetch(`${API_BASE_URL}/ratings/${user}`);
  return res.json();
};

// POST – crear rating
export const createRating = async (rating:string, user:string) => {
  const res = await fetch(`${API_BASE_URL}/ratings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating, user }),
  });

  return res.json();
};

// PATCH – actualizar rating
export const updateRating = async (user:string, rating:string) => {
  const res = await fetch(`${API_BASE_URL}/ratings/${user}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating }),
  });

  return res.json();
};

// GET ALL – opcional
export const getAllRatings = async () => {  const res = await fetch(`${API_BASE_URL}/ratings`);
  return res.json();
};
