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
import HistoryModal from './UserActivityHistoryModal';

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

const normalizeNit = (value?: string | null) =>
  (value || '').toString().trim().toLowerCase();

const getItemTelecomNit = (item: any): string | undefined => {
  return (
    item?.telecomCompanyNit ||
    item?.telecom_company_nit ||
    item?.telecomCompany?.nit ||
    item?.company?.nit ||
    item?.companyNit
  );
};

const filterByUserTelecomCompany = (items: any[], userData: UserData): any[] => {
  const userTelecomNit = normalizeNit(userData?.telecomCompanyNit);

  if (!userTelecomNit) return [];

  const hasTelecomNitInItems = items.some((item: any) => !!normalizeNit(getItemTelecomNit(item)));

  // Si el backend ya filtró por teléfono pero no devuelve el NIT en cada item,
  // no debemos vaciar la lista en frontend.
  if (!hasTelecomNitInItems) {
    return items;
  }

  return items.filter((item: any) => {
    const itemTelecomNit = normalizeNit(getItemTelecomNit(item));
    return !!itemTelecomNit && itemTelecomNit === userTelecomNit;
  });
};

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
  const [pointsBreakdown, setPointsBreakdown] = useState({
    missions: 0,
    offers: 0,
    surveys: 0,
    games: 0,
    missionsCompleted: 0,
    videosWatched: 0,
    surveysCompleted: 0,
    gamesPlayed: 0
  });

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

        // Cargar ofertas/videos y filtrar por empresa telefónica + similitud
        const offersRes = await getOffers(userData.user.phone);
        if (offersRes.success && offersRes.data) {
          const telecomFiltered = filterByUserTelecomCompany(offersRes.data, userData.user);
          const filtered = filterItemsBySimilarity(
            telecomFiltered as { preferences?: any; telecomCompanyNit?: string }[],
            userData.user,
            30
          );
          setOffers(filtered);
          console.log('✅ Videos cargados por empresa:', filtered.length);
        }

        // Cargar encuestas y filtrar por empresa telefónica + preferencias
        const surveysRes = await getSurveys(userData.user.phone);
        if (surveysRes.success && surveysRes.data && userData.user) {
          const telecomFiltered = filterByUserTelecomCompany(surveysRes.data, userData.user);
          const filtered = telecomFiltered.filter((survey:any) => 
            isItemCompatible(userData.user!, survey, 30)
          );
          setSurveys(filtered);
          console.log('✅ Encuestas cargadas por empresa:', filtered.length);
        }

        // Cargar juegos y filtrar por empresa telefónica + preferencias
        const gamesRes = await getGames(userData.user.phone);
        if (gamesRes.success && gamesRes.data && userData.user) {
          const telecomFiltered = filterByUserTelecomCompany(gamesRes.data, userData.user);
          const filtered = telecomFiltered.filter((game:any) => 
            isItemCompatible(userData.user!, game, 30)
          );
          setGames(filtered as Game[]);
          console.log('✅ Juegos cargados por empresa:', filtered.length);
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
        setPointsBreakdown({
          missions: data.data.summary.pointsFromMissions || 0,
          offers: data.data.summary.pointsFromVideos || 0,
          surveys: data.data.summary.pointsFromSurveys || 0,
          games: data.data.summary.pointsFromGames || 0,
          missionsCompleted: data.data.summary.missionsCompleted || 0,
          videosWatched: data.data.summary.videosWatched || 0,
          surveysCompleted: data.data.summary.surveysCompleted || 0,
          gamesPlayed: data.data.summary.gamesPlayed || 0
        });
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
        <TouchableOpacity style={styles.retryButton} onPress={handleLogout}>
          <Text style={styles.retryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const missionTotal = missions.length;
  const surveyTotal = surveys.length;
  const gameTotal = games.length;

  const missionsDone = Math.min(pointsBreakdown.missionsCompleted, missionTotal);
  const surveysDone = Math.min(pointsBreakdown.surveysCompleted, surveyTotal);
  const gamesDone = Math.min(pointsBreakdown.gamesPlayed, gameTotal);

  const missionsPending = Math.max(missionTotal - missionsDone, 0);
  const surveysPending = Math.max(surveyTotal - surveysDone, 0);
  const gamesPending = Math.max(gameTotal - gamesDone, 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={handleLogout} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowHistoryModal(true)} style={styles.historyButton}>
              <Text style={styles.historyButtonText}>📜</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <Text style={styles.welcomeText}>Buenos días,</Text>
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
              <Text style={styles.pointsLabel}>Saldo acumulado</Text>
              <Text style={styles.pointsValue}>{totalPoints.toLocaleString()} MB</Text>
              <Text style={styles.pointsSubtitle}>+ {pointsBreakdown.missionsCompleted + pointsBreakdown.videosWatched + pointsBreakdown.surveysCompleted + pointsBreakdown.gamesPlayed} acciones</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{missionsDone}/{missionTotal}</Text>
              <Text style={styles.summaryLabel}>Misiones</Text>
              <Text style={styles.summarySubLabel}>Faltan: {missionsPending}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{surveysDone}/{surveyTotal}</Text>
              <Text style={styles.summaryLabel}>Encuestas</Text>
              <Text style={styles.summarySubLabel}>Faltan: {surveysPending}</Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryCardLast]}>
              <Text style={styles.summaryNumber}>{gamesDone}/{gameTotal}</Text>
              <Text style={styles.summaryLabel}>Juegos</Text>
              <Text style={styles.summarySubLabel}>Faltan: {gamesPending}</Text>
            </View>
          </View>
        </View>

        {/* DESGLOSE DE PUNTOS */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>📊 Desglose de puntos</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>🎯 Misiones</Text>
            <Text style={styles.breakdownValue}>
              {pointsBreakdown.missions.toLocaleString()} MB
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>🎥 Videos</Text>
            <Text style={styles.breakdownValue}>
              {pointsBreakdown.offers.toLocaleString()} MB
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>📝 Encuestas</Text>
            <Text style={styles.breakdownValue}>
              {pointsBreakdown.surveys.toLocaleString()} MB
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>🎮 Juegos</Text>
            <Text style={styles.breakdownValue}>
              {pointsBreakdown.games.toLocaleString()} MB
            </Text>
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabsContainer}>
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
        </View>

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
      </ScrollView>

      {/* BOTONES DE ACCIÓN */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ProfileDetailScreen', {
            profile: user,
            profilePhotoUrl,
            company,
          })}
        >
          <Text style={styles.actionButtonText}>👤 Perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.paymentButton]} onPress={() => setShowCardModal(true)}>
          <Text style={[styles.actionButtonText, styles.paymentButtonText]}>💳 Redimir</Text>
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
      nestedScrollEnabled
      scrollEnabled={false}
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
    backgroundColor: '#F4F1FF',
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
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 6,
  },
  pointsValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
  },
  pointsSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  summaryCardLast: {
    marginRight: 0,
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  summarySubLabel: {
    marginTop: 4,
    fontSize: 11,
    color: 'white',
    fontWeight: '500',
    textAlign: 'center',
  },
  // TABS
  tabsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 25,
    margin: 4,
  },
  activeTab: {
    backgroundColor: '#6B2D7A',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
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
    paddingBottom: 40,
    minHeight: 60
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
  // BREAKDOWN STYLES
  breakdownCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
    marginHorizontal: 24,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  breakdownRow: {
    height: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});