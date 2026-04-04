import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import COLORS from "../../utils/colors";
import ClientProfilePhotoUploader from "./ClientProfilePhotoUploader";
import { Mission, Offer, TelecomCompany } from "./Biviconnectapi";

interface HomeScreenProps {
  profile: any;
  userRating: string;
  profilePhotoUrl: string | null;
  authResponse: any;
  onPhotoUploaded: (url: string) => void;
  onNavigate: (screen: string) => void;
  onSelectOffer: (offer: Offer) => void;
  onLogout: () => void;
  navigation: any;
  // ===== NUEVOS PROPS =====
  company?: TelecomCompany | null;
  missions?: Mission[];
  offers?: Offer[];
}

export default function HomeScreen({
  profile,
  userRating,
  profilePhotoUrl,
  authResponse,
  onPhotoUploaded,
  onNavigate,
  onSelectOffer,
  onLogout,
  navigation,
  // ===== NUEVOS PROPS =====
  company,
  missions = [],
  offers = [],
}: HomeScreenProps) {
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(90, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(footerAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ===== CALCULAR ESTADÍSTICAS =====
  const totalMissions = missions.length;
  const totalOffers = offers.length;
  const totalItems = totalMissions + totalOffers;

  return (
    <>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-18, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.profileImageContainer}>
            <ClientProfilePhotoUploader
              phone={authResponse.usuario.phone}
              currentPhoto={profilePhotoUrl}
              onPhotoUploaded={onPhotoUploaded}
              size={50}
            />
            <View>
              <Text style={styles.userName}>
                Hola {profile.name.split(" ")[0]} {profile.lastName.split(" ")[0]}
              </Text>
              <Text style={styles.userRatings}>⭐⭐⭐⭐⭐</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.goBack()}>
            <Image
              source={require("../../../assets/close_hide.png")}
              style={[
                styles.hideWindow,
                { transform: [{ rotate: '90deg' }] }
              ]}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Saldo Acumulado */}
        <Animated.View
          style={[
            styles.balanceCard,
            {
              opacity: cardAnim,
              transform: [
                {
                  translateY: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.balanceLabel}>SALDO ACUMULADO</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>340 MB</Text>
            <Text style={styles.balanceSubtext}>+ 45 min de llamadas</Text>
          </View>
          <TouchableOpacity style={styles.canjearButton}>
            <Text style={styles.canjearButtonText}>Canjear ahora ›</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Estadísticas */}
        <Animated.View
          style={[
            styles.statsContainer,
            {
              opacity: cardAnim,
            },
          ]}
        >
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalMissions}</Text>
            <Text style={styles.statLabel}>Misiones</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalOffers}</Text>
            <Text style={styles.statLabel}>Videos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalItems}</Text>
            <Text style={styles.statLabel}>Totales</Text>
          </View>
        </Animated.View>

        {/* Misiones */}
        {missions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⭐ Misiones</Text>
              <TouchableOpacity onPress={() => onNavigate('missions')}>
                <Text style={styles.seeAllText}>Ver todas ›</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionSubtitle}>
              Gana puntos completando misiones
            </Text>

            {missions.map((mission) => (
              <TouchableOpacity
                key={mission.id}
                style={styles.offerCard}
                onPress={() => onSelectOffer(mission as any)}
              >
                <View style={styles.offerIcon}>
                  <Text style={styles.offerIconText}>{mission.icon}</Text>
                </View>
                <View style={styles.offerContent}>
                  <Text style={styles.offerTitle}>{mission.title}</Text>
                  <Text style={styles.offerDescription}>
                    {mission.type === "task"
                      ? "📌 Tarea"
                      : mission.type === "survey"
                      ? "📝 Encuesta"
                      : "📋 Formulario"}
                    {" • "}
                    {mission.duration}
                  </Text>
                </View>
                <View style={styles.offerReward}>
                  <Text style={styles.offerRewardText}>
                    +{mission.reward_points}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}


        {/* Información de Empresa */}
        {company && (
          <View style={styles.section}>
            <View style={styles.companyBanner}>
              <Text style={styles.companyBannerTitle}>
                📱 {company.name}
              </Text>
              <Text style={styles.companyBannerText}>
                {company.country} • {company.currencySymbol}
              </Text>
            </View>
          </View>
        )}

        {/* Analytics Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.analyticsButton}
            onPress={() => onNavigate('analytics')}
          >
            <Text style={styles.analyticsButtonIcon}>📊</Text>
            <View style={styles.analyticsButtonContent}>
              <Text style={styles.analyticsButtonTitle}>Mi Actividad</Text>
              <Text style={styles.analyticsButtonSubtitle}>Ve tus estadísticas</Text>
            </View>
            <Text style={styles.analyticsButtonArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Perfil Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => onNavigate('profile')}
          >
            <Text style={styles.profileButtonIcon}>👤</Text>
            <View style={styles.profileButtonContent}>
              <Text style={styles.profileButtonTitle}>Mi Perfil</Text>
              <Text style={styles.profileButtonSubtitle}>Información personal</Text>
            </View>
            <Text style={styles.profileButtonArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Botón Cerrar Sesión */}
        <Animated.View style={[styles.section, { opacity: footerAnim }]}>
          <TouchableOpacity
            style={styles.logoutButtonStyle}
            onPress={onLogout}
          >
            <Image
              source={require("../../../assets/SignOut.png")}
            />
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.backgroundLight,
    paddingTop: 48,
    paddingHorizontal: 14,
    paddingBottom: 18,
    paddingLeft: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  profileImageContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  userRatings: {
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  hideWindow: {
    width: 24,
    height: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  balanceCard: {
    backgroundColor: '#9C27B0',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  balanceRow: {
    marginVertical: 12,
  },
  balanceAmount: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  balanceSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  canjearButton: {
    marginTop: 16,
  },
  canjearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 12,
  },
  seeAllText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  offerCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  offerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  offerIconText: {
    fontSize: 24,
  },
  offerContent: {
    flex: 1,
  },
  offerTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  offerDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  offerReward: {
    backgroundColor: 'rgba(233, 30, 99, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  offerRewardText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  companyBanner: {
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  companyBannerTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  companyBannerText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  analyticsButton: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  analyticsButtonIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  analyticsButtonContent: {
    flex: 1,
  },
  analyticsButtonTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  analyticsButtonSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  analyticsButtonArrow: {
    color: COLORS.textSecondary,
    fontSize: 18,
  },
  profileButton: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButtonIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  profileButtonContent: {
    flex: 1,
  },
  profileButtonTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  profileButtonSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  profileButtonArrow: {
    color: COLORS.textSecondary,
    fontSize: 18,
  },
  logoutButtonStyle: {
    backgroundColor: COLORS.error || '#FF3B30',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: '600',
  },
});