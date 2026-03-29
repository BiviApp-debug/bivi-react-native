import * as Location from 'expo-location'
import { API_BASE_URL } from '../API/API'

export const getUserLocation = async (user_app:string) => {
  let { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') {
    alert('Permiso denegado para acceder a la ubicación')
    return
  }

  let location = await Location.getCurrentPositionAsync({})
  let my_coords =  JSON.stringify(location.coords)
  await fetch(`${API_BASE_URL}/api/userposition`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    position: my_coords,
    username: user_app
  })
})
  //console.log('📍 Ubicación actual:', location.coords)
  return location.coords
}
