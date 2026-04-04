import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { API_BASE_URL } from '../../../API/API';

interface TelecomCompany {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  isoCode: string;
  nit: string;
  currency: string;
  currencySymbol: string;
}

interface TelecomCompanySelectorProps {
  selectedCompany: TelecomCompany | null;
  selectedCountryIsoCode: string;
  onSelectCompany: (company: TelecomCompany) => void;
}

const TelecomCompanySelector: React.FC<TelecomCompanySelectorProps> = ({
  selectedCompany,
  selectedCountryIsoCode,
  onSelectCompany,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [companies, setCompanies] = useState<TelecomCompany[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<TelecomCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ✅ Cargar empresas cuando se abre el modal o cambia el isoCode
  useEffect(() => {
    if (showModal && selectedCountryIsoCode) {
      loadCompanies();
    }
  }, [showModal, selectedCountryIsoCode]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`📱 Obteniendo empresas para ISO: ${selectedCountryIsoCode}`);

      const response = await fetch(
        `${API_BASE_URL}/api/telecom-companies/country/${selectedCountryIsoCode}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.success && data.data) {
        console.log(`✅ ${data.data.length} empresas cargadas para ${selectedCountryIsoCode}`);
        setCompanies(data.data);
        setFilteredCompanies(data.data);
        setSearchText('');
      } else {
        setError(data.error || 'No se pudieron cargar las empresas');
        setCompanies([]);
        setFilteredCompanies([]);
      }
    } catch (err: any) {
      console.error('❌ Error cargando empresas:', err);
      setError(err.message || 'Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text.trim() === '') {
      setFilteredCompanies(companies);
    } else {
      const filtered = companies.filter(company =>
        company.name.toLowerCase().includes(text.toLowerCase()) ||
        company.nit.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredCompanies(filtered);
    }
  };

  const handleSelectCompany = (company: TelecomCompany) => {
    onSelectCompany(company);
    setShowModal(false);
  };

  const renderCompanyItem = ({ item }: { item: TelecomCompany }) => (
    <TouchableOpacity
      onPress={() => handleSelectCompany(item)}
      style={styles.companyItem}
    >
      <View style={styles.companyInfo}>
        <Text style={styles.companyName}>{item.name}</Text>
        <Text style={styles.companyNit}>NIT: {item.nit}</Text>
        <Text style={styles.companyCurrency}>
          {item.currency} ({item.currencySymbol})
        </Text>
      </View>
      <Text style={styles.selectArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View>
      <Text style={styles.label}>Empresa de Telefonía</Text>
      <TouchableOpacity
        onPress={() => setShowModal(true)}
        style={[
          styles.selector,
          selectedCompany && styles.selectorSelected
        ]}
      >
        <View style={styles.selectorContent}>
          {selectedCompany ? (
            <View>
              <Text style={styles.selectedText}>{selectedCompany.name}</Text>
              <Text style={styles.selectedNit}>NIT: {selectedCompany.nit}</Text>
            </View>
          ) : (
            <Text style={styles.placeholderText}>Selecciona tu empresa de telefonía</Text>
          )}
        </View>
        <Text style={styles.dropdownIcon}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona tu empresa</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <TextInput
              placeholder="Buscar empresa..."
              value={searchText}
              onChangeText={handleSearch}
              style={styles.searchInput}
              editable={!loading}
            />

            {/* Loading */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E91E63" />
                <Text style={styles.loadingText}>Cargando empresas...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>❌ {error}</Text>
                <TouchableOpacity
                  onPress={loadCompanies}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : filteredCompanies.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No hay empresas disponibles para tu país
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredCompanies}
                keyExtractor={(item) => item.id}
                renderItem={renderCompanyItem}
                scrollEnabled={true}
              />
            )}

            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  selector: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectorSelected: {
    borderColor: '#E91E63',
    backgroundColor: '#FFF',
  },
  selectorContent: {
    flex: 1,
  },
  selectedText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  selectedNit: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  dropdownIcon: {
    fontSize: 16,
    color: '#ddd',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#999',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    fontSize: 14,
  },
  companyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  companyNit: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  companyCurrency: {
    fontSize: 11,
    color: '#E91E63',
    fontWeight: '500',
  },
  selectArrow: {
    fontSize: 20,
    color: '#E91E63',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
  closeButton: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: '#E91E63',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default TelecomCompanySelector;