import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, FlatList, ActivityIndicator } from 'react-native';

interface City {
  name: string;
  country: string;
  countryCode: string;
}

interface Country {
  name: {
    common: string;
  };
  cca2: string;
  flag?: string;
}

interface LocationPickerProps {
  selectedLocation: string;
  selectedCountry: string;
  onSelectLocation: (location: string, country: string) => void;
}

// Lista de países por defecto si falla la API
const DEFAULT_COUNTRIES = [
  { name: { common: 'Colombia' }, cca2: 'CO', flag: '🇨🇴' },
  { name: { common: 'República Dominicana' }, cca2: 'DO', flag: '🇩🇴' },
  { name: { common: 'España' }, cca2: 'ES', flag: '🇪🇸' },
  { name: { common: 'México' }, cca2: 'MX', flag: '🇲🇽' },
  { name: { common: 'Argentina' }, cca2: 'AR', flag: '🇦🇷' },
  { name: { common: 'Chile' }, cca2: 'CL', flag: '🇨🇱' },
  { name: { common: 'Perú' }, cca2: 'PE', flag: '🇵🇪' },
  { name: { common: 'Ecuador' }, cca2: 'EC', flag: '🇪🇨' },
  { name: { common: 'Venezuela' }, cca2: 'VE', flag: '🇻🇪' },
  { name: { common: 'Brasil' }, cca2: 'BR', flag: '🇧🇷' },
  { name: { common: 'Estados Unidos' }, cca2: 'US', flag: '🇺🇸' },
  { name: { common: 'Panamá' }, cca2: 'PA', flag: '🇵🇦' },
  { name: { common: 'Costa Rica' }, cca2: 'CR', flag: '🇨🇷' },
  { name: { common: 'Guatemala' }, cca2: 'GT', flag: '🇬🇹' },
  { name: { common: 'Nicaragua' }, cca2: 'NI', flag: '🇳🇮' },
  { name: { common: 'Honduras' }, cca2: 'HN', flag: '🇭🇳' },
  { name: { common: 'El Salvador' }, cca2: 'SV', flag: '🇸🇻' },
  { name: { common: 'Canadá' }, cca2: 'CA', flag: '🇨🇦' },
  { name: { common: 'Francia' }, cca2: 'FR', flag: '🇫🇷' },
  { name: { common: 'Italia' }, cca2: 'IT', flag: '🇮🇹' },
];

export default function LocationPicker({ 
  selectedLocation, 
  selectedCountry,
  onSelectLocation 
}: LocationPickerProps) {
  const [showModal, setShowModal] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [searchCity, setSearchCity] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [step, setStep] = useState<'country' | 'city'>('country'); // country o city

  // ===== CARGAR PAÍSES =====
  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      const response = await fetch('https://restcountries.com/v3.1/all');
      
      if (!response.ok) {
        throw new Error('Error en la API');
      }
      
      let data = await response.json();
      
      // Asegurar que es un array
      if (!Array.isArray(data)) {
        console.warn('La API no devolvió un array, usando lista por defecto');
        setCountries(DEFAULT_COUNTRIES);
        setLoadingCountries(false);
        return;
      }
      
      const sorted = data
        .filter((country: any) => country.cca2 && country.name?.common)
        .map((country: any) => ({
          ...country,
          flag: country.flag || '🌍'
        }))
        .sort((a: any, b: any) => 
          (a.name?.common || '').localeCompare(b.name?.common || '')
        );
      
      setCountries(sorted.length > 0 ? sorted : DEFAULT_COUNTRIES);
      setLoadingCountries(false);
    } catch (error) {
      console.warn('Error cargando países, usando lista por defecto:', error);
      setCountries(DEFAULT_COUNTRIES);
      setLoadingCountries(false);
    }
  };

  // ===== CARGAR CIUDADES =====
  const loadCities = async (countryCode: string) => {
    try {
      setLoadingCities(true);
      setSearchCity('');
      setSelectedCountryCode(countryCode);

      // Obtener el nombre del país
      const selectedCountryObj = countries.find(c => c.cca2 === countryCode);
      const countryName = selectedCountryObj?.name?.common || countryCode;

      // Intentar con API 1: countriesnow.space
      try {
        const response = await fetch(
          `https://countriesnow.space/api/v0.1/countries/cities?country=${countryName}`
        );
        
        const data = await response.json();
        
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          const cityList: City[] = data.data.map((city: string) => ({
            name: city,
            country: countryCode,
            countryCode: countryCode
          }));
          setCities(cityList);
          setFilteredCities(cityList);
          setStep('city');
          setLoadingCities(false);
          return;
        }
      } catch (e) {
        console.warn('API 1 falló, intentando API 2...');
      }

      // Intentar con API 2: GeoDB (alternativa)
      try {
        const response = await fetch(
          `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?countryIds=${countryCode}&limit=500`,
          {
            headers: {
              'x-rapidapi-key': 'demo', // Demo key, puede tener limitaciones
              'x-rapidapi-host': 'wft-geo-db.p.rapidapi.com'
            }
          }
        );
        
        const data = await response.json();
        
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          const cityList: City[] = data.data.map((city: any) => ({
            name: city.name,
            country: countryCode,
            countryCode: countryCode
          }));
          setCities(cityList);
          setFilteredCities(cityList);
          setStep('city');
          setLoadingCities(false);
          return;
        }
      } catch (e) {
        console.warn('API 2 falló, usando ciudades por defecto...');
      }

      // Fallback: Ciudades por defecto según el país
      const defaultCitiesByCountry: { [key: string]: string[] } = {
        'CO': ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Santa Marta', 'Bucaramanga'],
        'DO': ['Santo Domingo', 'Santiago', 'La Romana', 'San Francisco de Macorís', 'Moca', 'La Vega', 'Higüey'],
        'ES': ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Málaga', 'Palma'],
        'MX': ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Cancún', 'México City', 'Puebla', 'Léon'],
        'AR': ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'San Miguel de Tucumán'],
        'BR': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte'],
        'US': ['Nueva York', 'Los Ángeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio'],
        'CL': ['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Temuco', 'Valdivia'],
        'PE': ['Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Cusco', 'Huancayo'],
        'VE': ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Ciudad Guayana', 'Mérida'],
      };

      const defaultCities = defaultCitiesByCountry[countryCode] || ['Capital', 'Ciudad Principal'];
      const cityList: City[] = defaultCities.map(city => ({
        name: city,
        country: countryCode,
        countryCode: countryCode
      }));

      setCities(cityList);
      setFilteredCities(cityList);
      setStep('city');
      setLoadingCities(false);

    } catch (error) {
      console.error('Error cargando ciudades:', error);
      setLoadingCities(false);
      alert('No se pudieron cargar las ciudades, intenta de nuevo');
    }
  };

  // ===== FILTRAR CIUDADES =====
  const handleSearchCity = (text: string) => {
    setSearchCity(text);
    if (text.trim() === '') {
      setFilteredCities(cities);
    } else {
      const filtered = cities.filter(city =>
        city.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredCities(filtered);
    }
  };

  // ===== SELECCIONAR CIUDAD =====
  const handleSelectCity = (city: City) => {
    const countryName = countries.find(
      c => c.cca2 === selectedCountryCode || c.name?.common?.toLowerCase() === selectedCountryCode.toLowerCase()
    )?.name?.common || selectedCountryCode;

    onSelectLocation(city.name, countryName);
    setShowModal(false);
    setStep('country');
  };

  // ===== VOLVER A SELECCIONAR PAÍS =====
  const handleBackToCountry = () => {
    setStep('country');
    setSearchCity('');
    setFilteredCities([]);
  };

  return (
    <>
      {/* BOTÓN PARA ABRIR MODAL */}
      <TouchableOpacity
        onPress={() => setShowModal(true)}
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 12,
          backgroundColor: '#f9f9f9',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Ubicación</Text>
          <Text style={{ fontSize: 16, color: selectedLocation ? '#333' : '#999', fontWeight: '500' }}>
            {selectedLocation ? `${selectedLocation}, ${selectedCountry}` : 'Selecciona tu ciudad'}
          </Text>
        </View>
        <Text style={{ fontSize: 18 }}>📍</Text>
      </TouchableOpacity>

      {/* MODAL */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowModal(false);
          setStep('country');
        }}
      >
        <View style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}>
          <View style={{
            backgroundColor: 'white',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 40,
            maxHeight: '90%'
          }}>
            {/* HEADER */}
            {step === 'country' && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
                  Selecciona tu país
                </Text>
                <TextInput
                  placeholder='Buscar país...'
                  style={{
                    borderWidth: 1,
                    borderColor: '#ddd',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14
                  }}
                  onChangeText={(text) => {
                    // Podríamos filtrar países aquí también si lo deseamos
                  }}
                />
              </View>
            )}

            {step === 'city' && (
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <TouchableOpacity onPress={handleBackToCountry}>
                    <Text style={{ fontSize: 24, marginRight: 8 }}>←</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 18, fontWeight: '700' }}>
                    Selecciona tu ciudad
                  </Text>
                </View>
                <TextInput
                  placeholder='Buscar ciudad...'
                  value={searchCity}
                  onChangeText={handleSearchCity}
                  style={{
                    borderWidth: 1,
                    borderColor: '#ddd',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14
                  }}
                />
              </View>
            )}

            {/* LISTADO */}
            {loadingCountries || loadingCities ? (
              <View style={{ justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }}>
                <ActivityIndicator size="large" color="#E91E63" />
                <Text style={{ marginTop: 8, color: '#666' }}>Cargando...</Text>
              </View>
            ) : (
              <FlatList
                data={step === 'country' ? countries : filteredCities}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      if (step === 'country') {
                        loadCities(item.cca2);
                      } else {
                        handleSelectCity(item);
                      }
                    }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#f0f0f0',
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                  >
                    {step === 'country' && (
                      <>
                        <Text style={{ fontSize: 24, marginRight: 10 }}>
                          {item.flag}
                        </Text>
                        <View>
                          <Text style={{ fontSize: 14, fontWeight: '500', color: '#333' }}>
                            {item.name?.common}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#999' }}>
                            {item.cca2}
                          </Text>
                        </View>
                      </>
                    )}
                    {step === 'city' && (
                      <Text style={{ fontSize: 14, color: '#333', fontWeight: '500' }}>
                        📍 {item.name}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                scrollEnabled={true}
                nestedScrollEnabled={true}
                maxToRenderPerBatch={20}
                updateCellsBatchingPeriod={50}
              />
            )}

            {/* BOTÓN CERRAR */}
            <TouchableOpacity
              onPress={() => {
                setShowModal(false);
                setStep('country');
              }}
              style={{
                marginTop: 16,
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: '#f0f0f0',
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#333', fontWeight: '600' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}