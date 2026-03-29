import * as Location from 'expo-location'
import { API_BASE_URL } from '../API/API'

export const postDriverLocation = async (user_app:string) => {
  let { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') {
    alert('Permiso denegado para acceder a la ubicación')
    return
  }

  let location = await Location.getCurrentPositionAsync({})
  let my_coords =  JSON.stringify(location.coords)
  await fetch(`${API_BASE_URL}/api/driverposition`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    position: my_coords,
    username: user_app
  })
})
  //console.log('📍 Ubicación actual Conductor:', location.coords)
  return location.coords
}

/** Envía coords ya conocidas (p. ej. desde watchPosition) sin volver a pedir GPS. */
export const pushDriverCoordsToServer = async (
  user_app: string,
  coords: Location.LocationObjectCoords
) => {
  const my_coords = JSON.stringify(coords);
  await fetch(`${API_BASE_URL}/api/driverposition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      position: my_coords,
      username: user_app,
    }),
  });
};


export const postDriverLocalLocation = async (user_app:string) => {
  let { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') {
    alert('Permiso denegado para acceder a la ubicación')
    return
  }

  let location = await Location.getCurrentPositionAsync({})
  let my_coords =  JSON.stringify(location.coords)
  await fetch(`${API_BASE_URL}/api/driverlocalposition`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    position: my_coords,
    username: user_app
  })
})
  //console.log('📍 Ubicación actual Conductor:', location.coords)
  return location.coords
}