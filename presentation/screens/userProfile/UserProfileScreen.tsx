import React, { useContext, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  StatusBar,
  Alert,
  ScrollView,
  FlatList,
  Dimensions,
  Image,
} from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from "../../API/API";
import { dataContext } from "../../context/Authcontext";
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigator/MainStackNavigator';
import COLORS from "../../utils/colors";
import NequiPaymentModal from "../clientHome/screenMap/NequiPaymentModal";
import CreditCardModal from "../clientHome/screenMap/CreditCardModal";
import AsyncStorage from '@react-native-async-storage/async-storage';
import DaviPlataPaymentModal from "../clientHome/screenMap/DaviPlataPaymentModal";
import ErrorModal from "../../components/ErrorModal";
import SuccessModal from "../../components/SuccessModal";
import { logoutDriver, logoutUser } from "../../utils/Logout";
import HistoryModal from "./HistoryModal";

// ===== TIPOS Y FUNCIONES =====
import { 
  UserData, 
  TelecomCompany, 
  Mission, 
  Offer, 
  Survey,
  Game,
  getSurveys,
  getGames,
  getMissions,
  getOffers,
  filterItemsBySimilarity,
  isItemCompatible
} from "./Biviconnectapi";
import { loadCompleteUserData } from "./Loadcompleteuserdata";
import { connectSocket } from "../../utils/Conections";

const { width } = Dimensions.get('window');

interface Props extends StackScreenProps<RootStackParamList, "UserProfileScreen"> { }

type TabType = 'missions' | 'offers' | 'surveys' | 'games';

export default function UserProfileScreen({ navigation }: Props) {
  // ===== ESTADOS DE DATOS =====
  const [user, setUser] = useState<UserData | null>(null);
  const [company, setCompany] = useState<TelecomCompany | null>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [games, setGames] = useState<Game[]>([]);

  // ===== ESTADOS DE UI =====
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('missions');

  // ===== ESTADOS DE MODALES =====
  const [showCardModal, setShowCardModal] = useState(false);
  const [showNequi, setShowNequi] = useState(false);
  const [showDaviPlata, setShowDaviPlata] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // ===== CONTEXTO =====
  const { authResponse, setAuthResponse } = useContext(dataContext);

  // ===== OTROS ESTADOS =====
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);

  // Recalcular puntos cuando se regrese a la pantalla
  useFocusEffect(
    React.useCallback(() => {
      if (authResponse?.usuario?.phone) {
        calculateTotalPoints(authResponse.usuario.phone);
      }
    }, [authResponse])
  );

  useEffect(() => {
    const initializeUserData = async () => {
      try {
        setLoading(true);

        if (!authResponse?.usuario?.phone) {
          setErrorMessage('No se encontró el teléfono del usuario');
          setShowErrorModal(true);
          setLoading(false);
          return;
        }

        const userPhone = authResponse.usuario.phone;
        console.log('🔄 Cargando datos para Mission:', userPhone);

        // Cargar usuario
        const userData = await loadCompleteUserData(userPhone);
        
        if (!userData.success || !userData.user) {
          throw new Error(userData.error || 'Error cargando usuario');
        }

        setUser(userData.user);
        if (userData.company) setCompany(userData.company);

        // Cargar misiones y filtrar por similitud
        const missionsRes = await getMissions(userData.user.phone);
        console.log(missionsRes.data[0],"holas_datas_67");
        
        if (missionsRes.success && missionsRes.data) {
          const filtered = filterItemsBySimilarity(missionsRes.data, userData.user, 30);
          setMissions(filtered);
        }

        // Cargar ofertas y filtrar por similitud
        const offersRes = await getOffers(userData.user.phone);
        if (offersRes.success && offersRes.data) {
          const filtered = filterItemsBySimilarity(offersRes.data, userData.user, 30);
          setOffers(filtered);
        }

        // Cargar encuestas y filtrar por NIT y preferencias
        const surveysRes = await getSurveys(userData.user.phone);
        if (surveysRes.success && surveysRes.data && userData.user) {
          const filtered = surveysRes.data.filter((survey:any) => 
            isItemCompatible(userData.user!, survey, 30)
          );
          setSurveys(filtered);
          console.log('✅ Encuestas cargadas:', filtered.length);
        }

        // Cargar juegos y filtrar por NIT y preferencias
        const gamesRes = await getGames(userData.user.phone);
        if (gamesRes.success && gamesRes.data && userData.user) {
          const filtered = gamesRes.data.filter((game:any) => 
            isItemCompatible(userData.user!, game, 30)
          );
          setGames(filtered);
          console.log('✅ Juegos cargados:', filtered.length);
        }

        await loadClientProfilePhoto(userPhone);
        calculateTotalPoints(userPhone);

      } catch (error: any) {
        console.error('❌ Error:', error.message);
        setErrorMessage(error.message || 'Error al cargar datos');
        setShowErrorModal(true);
      } finally {
        setLoading(false);
      }
       connectSocket(authResponse.usuario.phone)
    };

    initializeUserData();
  }, [authResponse?.usuario?.phone]);

  const calculateTotalPoints = async (phone: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user-analytics/${phone}`);
      const data = await response.json();
      if (data.success) {
        setTotalPoints(data.data.summary.totalPoints || 0);
      }
    } catch (error) {
      console.error('Error calculando puntos:', error);
    }
  };

  const loadClientProfilePhoto = async (phone: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/client-profile-photo/${phone}`);
      if (response.ok) {
        const data = await response.json();
        setProfilePhotoUrl(data.data?.profilePhoto);
      }
    } catch (error) {
      // Ignorar error
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('savedPhone');
      const defaultUser = { id: 0, name: "", lastName: "", email: "", phone: "", password: "", role: "", photo: "" };
      setAuthResponse({ message: "", usuario: defaultUser });

      if (authResponse?.usuario?.role === "driver_role") {
        await logoutDriver(authResponse?.usuario?.phone);
      } else {
        await logoutUser(authResponse?.usuario?.phone);
      }
      navigation.replace('UserLoginScreen');
    } catch (error) {
      setErrorMessage("Error al cerrar sesión");
      setShowErrorModal(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando tu experiencia...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorText}>No se encontró el perfil</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowHistoryModal(true)} style={styles.historyButton}>
            <Text style={styles.historyButtonText}>📜</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {profilePhotoUrl ? (
              <Image source={{ uri: profilePhotoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user.name?.charAt(0)}{user.lastName?.charAt(0)}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>{user.name} {user.lastName}</Text>
          <Text style={styles.userPhone}>{user.phone}</Text>
          {company && (
            <View style={styles.companyBadge}>
              <Text style={styles.companyText}>🏢 {company.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.pointsCard}>
          <Text style={styles.pointsIcon}>⭐</Text>
          <View style={styles.pointsInfo}>
            <Text style={styles.pointsLabel}>Tus puntos</Text>
            <Text style={styles.pointsValue}>{totalPoints.toLocaleString()} MB</Text>
          </View>
        </View>
      </View>

      {/* TABS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'missions' && styles.activeTab]}
          onPress={() => setActiveTab('missions')}
        >
          <Text style={[styles.tabText, activeTab === 'missions' && styles.activeTabText]}>
            🎯 Misiones
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'offers' && styles.activeTab]}
          onPress={() => setActiveTab('offers')}
        >
          <Text style={[styles.tabText, activeTab === 'offers' && styles.activeTabText]}>
            📺 Videos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'surveys' && styles.activeTab]}
          onPress={() => setActiveTab('surveys')}
        >
          <Text style={[styles.tabText, activeTab === 'surveys' && styles.activeTabText]}>
            📝 Encuestas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'games' && styles.activeTab]}
          onPress={() => setActiveTab('games')}
        >
          <Text style={[styles.tabText, activeTab === 'games' && styles.activeTabText]}>
            🎮 Juegos
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* CONTENIDO */}
      <View style={styles.tabContent}>
        {activeTab === 'missions' && (
          <ItemList
            items={missions}
            type="mission"
            userPhone={user.phone}
            navigation={navigation}
            emptyMessage="No hay misiones disponibles para ti"
          />
        )}
        {activeTab === 'offers' && (
          <ItemList
            items={offers}
            type="offer"
            userPhone={user.phone}
            navigation={navigation}
            emptyMessage="No hay videos disponibles para ti"
          />
        )}
        {activeTab === 'surveys' && (
          <ItemList
            items={surveys}
            type="survey"
            userPhone={user.phone}
            navigation={navigation}
            emptyMessage="No hay encuestas disponibles para ti"
          />
        )}
        {activeTab === 'games' && (
          <ItemList
            items={games}
            type="game"
            userPhone={user.phone}
            navigation={navigation}
            emptyMessage="No hay juegos disponibles para ti"
          />
        )}
      </View>

      {/* BOTONES DE ACCIÓN */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('UserProfileScreen')}>
          <Text style={styles.actionButtonText}>👤 Perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.paymentButton]} onPress={() => setShowCardModal(true)}>
          <Text style={[styles.actionButtonText, styles.paymentButtonText]}>💳 Pagar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
          <Text style={[styles.actionButtonText, styles.logoutText]}>🚪 Salir</Text>
        </TouchableOpacity>
      </View>

      {/* MODALES */}
      <HistoryModal visible={showHistoryModal} onClose={() => setShowHistoryModal(false)} userPhone={user.phone} />
      <CreditCardModal visible={showCardModal} onClose={() => setShowCardModal(false)} userPhone={user.phone} onCardSaved={() => setShowCardModal(false)} />
      <DaviPlataPaymentModal visible={showDaviPlata} onClose={() => setShowDaviPlata(false)} userPhone={user.phone} onSuccess={() => setShowDaviPlata(false)} />
      <NequiPaymentModal visible={showNequi} onClose={() => setShowNequi(false)} userPhone={user.phone} onSuccess={() => setShowNequi(false)} />
      <ErrorModal visible={showErrorModal} message={errorMessage} onClose={() => setShowErrorModal(false)} />
      <SuccessModal visible={showSuccessModal} message={successMessage} onClose={() => setShowSuccessModal(false)} />
    </View>
  );
}

// ============================================
// COMPONENTE DE LISTA DE ÍTEMS
// ============================================

function ItemList({ items, type, userPhone, navigation, emptyMessage }: any) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateEmoji}>😔</Text>
        <Text style={styles.emptyStateText}>{emptyMessage}</Text>
      </View>
    );
  }

  const getNavigateScreen = () => {
    switch (type) {
      case 'mission': return 'MissionDetailScreen';
      case 'offer': return 'VideoDetailScreen';
      case 'survey': return 'SurveyDetailScreen';
      case 'game': return 'GameDetailScreen';
      default: return '';
    }
  };

  return (
    <FlatList
      data={items}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.itemCard}
          onPress={() => navigation.navigate(getNavigateScreen(), { [type]: item, userPhone })}
          activeOpacity={0.8}
        >
          <View style={styles.itemIconContainer}>
            <Text style={styles.itemIcon}>
              {item.icon || (type === 'mission' ? '📌' : type === 'offer' ? '📺' : type === 'survey' ? '📝' : '🎮')}
            </Text>
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
            <View style={styles.itemFooter}>
              <View style={styles.rewardBadge}>
                <Text style={styles.rewardText}>⭐ {item.reward_points} MB</Text>
              </View>
              {item.duration && (
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>⏱️ {item.duration}</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
    />
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    color: COLORS.primary,
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: COLORS.textDark,
    fontWeight: 'bold',
  },
  // HEADER
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  historyButton: {
    padding: 8,
  },
  historyButtonText: {
    fontSize: 22,
    color: 'white',
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  companyBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  companyText: {
    fontSize: 12,
    color: 'white',
  },
  pointsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 15,
    marginTop: 20,
    alignItems: 'center',
  },
  pointsIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  pointsInfo: {
    flex: 1,
  },
  pointsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  // TABS
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    marginTop: -15,
    marginHorizontal: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: COLORS.textDark,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  // ITEM CARD
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemIcon: {
    fontSize: 28,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardBadge: {
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  rewardText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  durationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  durationText: {
    fontSize: 11,
    color: '#999',
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyStateEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
  },
  // BOTONES INFERIORES
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
  },
  paymentButton: {
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  paymentButtonText: {
    color: 'white',
  },
  logoutText: {
    color: COLORS.error,
  },
});