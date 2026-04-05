import React, { useContext, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import COLORS from "../../utils/colors";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigator/MainStackNavigator";
import ClientProfilePhotoUploader from "./ClientProfilePhotoUploader";
import { updateUserPreferences, updateUserProfile } from "./Biviconnectapi";
import { saveMessageToFirestore } from "../auth/login_user/loginFunctions";
import ResetPasswordModalUserProfile from "../../utils/ResetPasswordModalUserProfile";
import { dataContext } from "../../context/Authcontext";

type UserPreferences = {
  favoriteColors: string[];
  favoriteGenres: string[];
  favoriteActivities: string[];
};

const PREFERENCES_OPTIONS = {
  colors: [
    "Rojo", "Azul", "Verde", "Amarillo", "Naranja",
    "Púrpura", "Rosa", "Blanco", "Negro", "Gris",
  ],
  genres: [
    "Pop", "Rock", "Hip-Hop", "Reggaeton", "Salsa",
    "Trap", "Bachata", "Cumbia", "Electrónica", "Jazz",
  ],
  activities: [
    "Leer", "Deporte", "Videojuegos", "Películas", "Música",
    "Viajes", "Gastronomía", "Redes Sociales", "Fotografía", "Dibujar",
  ],
};

const DEFAULT_PREFERENCES: UserPreferences = {
  favoriteColors: [],
  favoriteGenres: [],
  favoriteActivities: [],
};

const GENDER_OPTIONS = [
  "Masculino",
  "Femenino",
  "No binario",
  "Prefiero no decirlo",
];

interface Props extends StackScreenProps<RootStackParamList, "ProfileDetailScreen"> { }

export default function ProfileDetailScreen({ route, navigation }: Readonly<Props>) {
  const { profile, profilePhotoUrl, company } = route.params;
  const { authResponse, setAuthResponse } = useContext(dataContext);

  const [photoUrl, setPhotoUrl] = useState(profilePhotoUrl || "");

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    name: profile?.name || "",
    lastName: profile?.lastName || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    location: profile?.location || "",
    gender: profile?.gender || "",
    age: typeof profile?.age === "number" ? profile.age : 0,
    dateOfBirth: profile?.dateOfBirth || "",
    isMinor: !!profile?.isMinor,
  });
  const [profileAge, setProfileAge] = useState<number | null>(
    typeof profile?.age === "number" ? profile.age : null
  );
  const [profileIsMinor, setProfileIsMinor] = useState<boolean>(!!profile?.isMinor);
  const [profileGender, setProfileGender] = useState<string>(profile?.gender || "");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 18);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showPreferencesWarningModal, setShowPreferencesWarningModal] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetLoginLoading, setIsResetLoginLoading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const rawPreferences = profile?.preferences;
      const parsed = typeof rawPreferences === "string"
        ? JSON.parse(rawPreferences)
        : rawPreferences;

      return {
        favoriteColors: Array.isArray(parsed?.favoriteColors) ? parsed.favoriteColors : [],
        favoriteGenres: Array.isArray(parsed?.favoriteGenres) ? parsed.favoriteGenres : [],
        favoriteActivities: Array.isArray(parsed?.favoriteActivities) ? parsed.favoriteActivities : [],
      };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const handleBack = () => {
    navigation.goBack();
  };

  const userEmail = profile?.email || "No especificado";
  const userPhone = profile?.phone || "No especificado";
  const userRole = profile?.role === "user_client" ? "Usuario" : "Conductor";
  const resolveMinorLabel = () => {
    const isMinorValue = isEditing ? editedProfile.isMinor : profileIsMinor;
    return isMinorValue ? "Menor" : "Mayor";
  };
  const isMinorLabel = resolveMinorLabel();
  const companyName = company?.name || "Sin empresa";
  const companyNit = company?.nit || "N/A";
  const companyCountry = company?.country || "N/A";
  const companyCurrency = company?.currency || "N/A";
  const companySymbol = company?.currencySymbol || "";

  const getLocation = () => {
    if (company?.country) {
      return company.country;
    }
    return profile?.location || "Ubicación no especificada";
  };

  const handleEdit = () => {
    setEditedProfile({
      name: profile?.name || "",
      lastName: profile?.lastName || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      location: profile?.location || "",
      gender: profileGender || profile?.gender || "",
      age: profileAge ?? (typeof profile?.age === "number" ? profile.age : 0),
      dateOfBirth: profile?.dateOfBirth || "",
      isMinor: profileIsMinor,
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    setIsSaving(true);
    try {
      const result = await updateUserProfile(profile.id.toString(), editedProfile);
      if (result.success) {
        setProfileAge(editedProfile.age);
        setProfileIsMinor(editedProfile.isMinor);
        setProfileGender(editedProfile.gender);
        Alert.alert("Éxito", "Perfil actualizado correctamente");
        setIsEditing(false);
        // Opcional: refrescar datos o navegar
      } else {
        Alert.alert("Error", result.error || "No se pudo actualizar el perfil");
      }
    } catch {
      Alert.alert("Error", "Error al guardar cambios");
    } finally {
      setIsSaving(false);
    }
  };

  const updateEditedField = (field: string, value: string) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }));
  };

  const calculateAge = (dateString: string): number | null => {
    try {
      const [year, month, day] = dateString.split('-');
      const birthDate = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, Number.parseInt(day, 10));
      const today = new Date();

      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age;
    } catch {
      return null;
    }
  };

  const openDatePicker = () => {
    const dateValue = editedProfile.dateOfBirth;
    if (dateValue && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const [year, month, day] = dateValue.split('-').map((v:any) => Number.parseInt(v, 10));
      setSelectedYear(year);
      setSelectedMonth(month);
      setSelectedDay(day);
    }
    setShowDatePicker(true);
  };

  const handleConfirmDate = () => {
    const dateString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const calculatedAge = calculateAge(dateString);

    if (calculatedAge !== null && calculatedAge >= 8 && calculatedAge <= 100) {
      setEditedProfile((prev) => ({
        ...prev,
        dateOfBirth: dateString,
        age: calculatedAge,
        isMinor: calculatedAge < 18,
      }));
      setShowDatePicker(false);
      return;
    }

    Alert.alert("Edad inválida", "Debes tener entre 8 y 100 años");
  };

  const togglePreference = (
    category: keyof UserPreferences,
    value: string
  ) => {
    setPreferences((prev) => {
      const currentValues = prev[category];
      const updatedValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return {
        ...prev,
        [category]: updatedValues,
      };
    });
  };

  const handleSavePreferences = async () => {
    if (!profile?.id) {
      Alert.alert("Error", "No se encontró el usuario para actualizar preferencias");
      return;
    }

    setIsSavingPreferences(true);
    try {
      const result = await updateUserPreferences(profile.id.toString(), preferences);
      if (!result.success) {
        Alert.alert("Error", result.error || "No se pudieron guardar las preferencias");
        return;
      }

      Alert.alert("Éxito", "Preferencias actualizadas correctamente");
      setShowPreferencesModal(false);
    } catch {
      Alert.alert("Error", "Ocurrió un error al guardar preferencias");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const authPhone = authResponse?.usuario?.phone || profile?.phone || "";

  const handleOpenAnalytics = () => {
    const analyticsPhone = authResponse?.usuario?.phone || profile?.phone;
    const analyticsTelecomNit = company?.nit || profile?.telecomCompanyNit;

    if (!analyticsPhone) {
      Alert.alert("Info", "No se encontró el teléfono del usuario para cargar la actividad.");
      return;
    }

    if (!analyticsTelecomNit) {
      Alert.alert("Info", "No se encontró la empresa de telefonía asociada para cargar la actividad.");
      return;
    }

    navigation.navigate("AnalyticsScreen", {
      userPhone: analyticsPhone,
      telecomCompanyNit: analyticsTelecomNit,
      telecomCompany: company || {
        name: profile?.telecomCompanyName || "Sin empresa",
        nit: analyticsTelecomNit,
      },
    });
  };

  const handleResetSuccess = async (resetPhone: string, resetPassword: string) => {
    setShowResetModal(false);
    setIsResetLoginLoading(true);
    try {
      const loginResponse = await saveMessageToFirestore(resetPhone, resetPassword);
      if (loginResponse && !loginResponse.__loginError) {
        setAuthResponse(loginResponse);
        Alert.alert("Éxito", "Contraseña actualizada e inicio de sesión validado.");
      } else {
        Alert.alert(
          "Contraseña actualizada",
          "Tu contraseña fue cambiada. Si no puedes entrar de inmediato, vuelve a iniciar sesión manualmente."
        );
      }
    } catch {
      Alert.alert(
        "Contraseña actualizada",
        "La contraseña se actualizó, pero no se pudo validar el inicio de sesión automáticamente."
      );
    } finally {
      setIsResetLoginLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <View style={{ width: 50 }} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* PERFIL PRINCIPAL */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <ClientProfilePhotoUploader
              phone={profile?.phone || ""}
              currentPhoto={photoUrl}
              onPhotoUploaded={setPhotoUrl}
              size={80}
            />
          </View>
          <Text style={styles.profileSubtext}>{getLocation()}</Text>

          {isEditing ? (
            <View style={styles.nameInputs}>
              <TextInput
                style={styles.input}
                value={editedProfile.name}
                onChangeText={(value) => updateEditedField('name', value)}
                placeholder="Nombre"
              />
              <TextInput
                style={styles.input}
                value={editedProfile.lastName}
                onChangeText={(value) => updateEditedField('lastName', value)}
                placeholder="Apellido"
              />
            </View>
          ) : (
            <Text style={styles.profileName}>
              {profile?.name} {profile?.lastName}
            </Text>
          )}

          <View style={styles.profileStats}>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>
                {isEditing ? editedProfile.age : (profileAge ?? "—")}
              </Text>
              <Text style={styles.profileStatLabel}>años</Text>
            </View>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>
                {isMinorLabel}
              </Text>
              <Text style={styles.profileStatLabel}>edad</Text>
            </View>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>
                {profile?.verified ? "✓" : "✗"}
              </Text>
              <Text style={styles.profileStatLabel}>verificado</Text>
            </View>
          </View>

          {isEditing ? (
            <>
              <TouchableOpacity
                style={styles.editBirthButton}
                onPress={openDatePicker}
              >
                <Text style={styles.editBirthButtonText}>
                  {editedProfile.dateOfBirth
                    ? `Fecha de nacimiento: ${editedProfile.dateOfBirth}`
                    : "Seleccionar fecha de nacimiento"}
                </Text>
              </TouchableOpacity>

              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.saveButtonText}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEdit}
            >
              <Text style={styles.editButtonText}>✏️ Editar perfil</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* INFORMACIÓN DE CUENTA */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📋 Información de Cuenta</Text>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>✉️</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              {isEditing ? (
                <TextInput
                  style={styles.inputFull}
                  value={editedProfile.email}
                  onChangeText={(value) => updateEditedField('email', value)}
                  placeholder="Email"
                  keyboardType="email-address"
                />
              ) : (
                <Text style={styles.infoValue}>{userEmail}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>📞</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              {isEditing ? (
                <TextInput
                  style={styles.inputFull}
                  value={editedProfile.phone}
                  onChangeText={(value) => updateEditedField('phone', value)}
                  placeholder="Teléfono"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.infoValue}>{userPhone}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>👤</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Género</Text>
              {isEditing ? (
                <View style={styles.genderOptionsWrap}>
                  {GENDER_OPTIONS.map((option) => {
                    const selected = editedProfile.gender === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.genderOption, selected && styles.genderOptionSelected]}
                        onPress={() => updateEditedField('gender', option)}
                      >
                        <Text style={[styles.genderOptionText, selected && styles.genderOptionTextSelected]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.infoValue}>{profileGender || "No especificado"}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>🪪</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tipo de Cuenta</Text>
              <Text style={styles.infoValue}>{userRole}</Text>
            </View>
          </View>

          {profile?.location && (
            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>📍</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Ubicación</Text>
                <Text style={styles.infoValue}>{profile.location}</Text>
              </View>
            </View>
          )}
        </View>

        {/* EMPRESA TELECOM */}
        {company && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📱 Tu Operador</Text>

            <View style={styles.companyCard}>
              <View style={styles.companyIconContainer}>
                <Text style={styles.companyIcon}>📶</Text>
              </View>

              <View style={styles.companyContent}>
                <Text style={styles.companyName}>{companyName}</Text>
                <Text style={styles.companyCountry}>{companyCountry}</Text>
              </View>

              {company.logo && (
                <Text style={styles.companyLogo}>{company.logo}</Text>
              )}
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>NIT</Text>
                <Text style={styles.detailValue}>{companyNit}</Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Moneda</Text>
                <Text style={styles.detailValue}>
                  {companyCurrency} {companySymbol}
                </Text>
              </View>

              {company.supportPhone && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Soporte</Text>
                  <Text style={styles.detailValue}>{company.supportPhone}</Text>
                </View>
              )}

              {company.website && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Web</Text>
                  <Text style={styles.detailValue}>{company.website}</Text>
                </View>
              )}
            </View>

            {company.description && (
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionTitle}>Acerca de</Text>
                <Text style={styles.descriptionText}>{company.description}</Text>
              </View>
            )}
          </View>
        )}

        {/* ACCIONES */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>⚙️ Acciones</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowResetModal(true)}
          >
            <Text style={styles.actionButtonIcon}>🔐</Text>
            <Text style={styles.actionButtonText}>
              {isResetLoginLoading ? "Validando..." : "Cambiar contraseña"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleOpenAnalytics}
          >
            <Text style={styles.actionButtonIcon}>📊</Text>
            <Text style={styles.actionButtonText}>Ver mi actividad</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowPreferencesWarningModal(true)}
          >
            <Text style={styles.actionButtonIcon}>⚙️</Text>
            <Text style={styles.actionButtonText}>Preferencias</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showPreferencesWarningModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPreferencesWarningModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.warningModalCard}>
            <Text style={styles.modalTitle}>Atención</Text>
            <Text style={styles.warningModalText}>
              Esta accion puede alterar el contenido que se va mostrar en tu perfil.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowPreferencesWarningModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={() => {
                  setShowPreferencesWarningModal(false);
                  setShowPreferencesModal(true);
                }}
              >
                <Text style={styles.modalSaveButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPreferencesModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPreferencesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar preferencias</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.preferenceSectionTitle}>Colores favoritos</Text>
              <View style={styles.preferenceTagsWrap}>
                {PREFERENCES_OPTIONS.colors.map((color) => {
                  const selected = preferences.favoriteColors.includes(color);
                  return (
                    <TouchableOpacity
                      key={color}
                      style={[styles.preferenceTag, selected && styles.preferenceTagSelected]}
                      onPress={() => togglePreference("favoriteColors", color)}
                    >
                      <Text style={[styles.preferenceTagText, selected && styles.preferenceTagTextSelected]}>
                        {color}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.preferenceSectionTitle}>Géneros favoritos</Text>
              <View style={styles.preferenceTagsWrap}>
                {PREFERENCES_OPTIONS.genres.map((genre) => {
                  const selected = preferences.favoriteGenres.includes(genre);
                  return (
                    <TouchableOpacity
                      key={genre}
                      style={[styles.preferenceTag, selected && styles.preferenceTagSelected]}
                      onPress={() => togglePreference("favoriteGenres", genre)}
                    >
                      <Text style={[styles.preferenceTagText, selected && styles.preferenceTagTextSelected]}>
                        {genre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.preferenceSectionTitle}>Actividades favoritas</Text>
              <View style={styles.preferenceTagsWrap}>
                {PREFERENCES_OPTIONS.activities.map((activity) => {
                  const selected = preferences.favoriteActivities.includes(activity);
                  return (
                    <TouchableOpacity
                      key={activity}
                      style={[styles.preferenceTag, selected && styles.preferenceTagSelected]}
                      onPress={() => togglePreference("favoriteActivities", activity)}
                    >
                      <Text style={[styles.preferenceTagText, selected && styles.preferenceTagTextSelected]}>
                        {activity}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowPreferencesModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSavePreferences}
                disabled={isSavingPreferences}
              >
                {isSavingPreferences ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ResetPasswordModalUserProfile
        phone={authPhone}
        visible={showResetModal}
        onClose={() => setShowResetModal(false)}
        onSuccess={handleResetSuccess}
      />

      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerCard}>
            <Text style={styles.modalTitle}>Fecha de nacimiento</Text>

            <View style={{ marginBottom: 16 }}>
              <Text style={styles.datePickerLabel}>Año</Text>
              <View style={styles.datePickerListContainer}>
                <ScrollView snapToInterval={40} decelerationRate="fast">
                  {Array.from({ length: 100 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <TouchableOpacity
                        key={year}
                        onPress={() => setSelectedYear(year)}
                        style={[
                          styles.datePickerOption,
                          selectedYear === year && styles.datePickerOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.datePickerOptionText,
                            selectedYear === year && styles.datePickerOptionTextSelected,
                          ]}
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={styles.datePickerLabel}>Mes</Text>
              <View style={styles.datePickerListContainer}>
                <ScrollView
                  contentContainerStyle={styles.datePickerMonthGrid}
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const monthName = new Date(2000, i, 1).toLocaleString('es-ES', { month: 'short' });
                    return (
                      <TouchableOpacity
                        key={month}
                        onPress={() => setSelectedMonth(month)}
                        style={[
                          styles.datePickerMonthOption,
                          selectedMonth === month && styles.datePickerOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.datePickerMonthText,
                            selectedMonth === month && styles.datePickerOptionTextSelected,
                          ]}
                        >
                          {monthName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={styles.datePickerLabel}>Día</Text>
              <View style={styles.datePickerListContainer}>
                <ScrollView contentContainerStyle={styles.datePickerDayGrid}>
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1;
                    return (
                      <TouchableOpacity
                        key={day}
                        onPress={() => setSelectedDay(day)}
                        style={[
                          styles.datePickerDayOption,
                          selectedDay === day && styles.datePickerOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.datePickerDayText,
                            selectedDay === day && styles.datePickerOptionTextSelected,
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={handleConfirmDate}
                style={styles.modalSaveButton}
              >
                <Text style={styles.modalSaveButtonText}>Confirmar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1FF',
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
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // PROFILE CARD
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileName: {
    color: '#333',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  profileSubtext: {
    color: '#666',
    fontSize: 14,
    marginBottom: 16,
  },
  profileStats: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileStatValue: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  profileStatLabel: {
    color: '#666',
    fontSize: 11,
  },
  editButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  editBirthButton: {
    width: '100%',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 4,
    backgroundColor: COLORS.primary,
  },
  editBirthButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  nameInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: 'white',
    flex: 1,
    marginHorizontal: 5,
  },
  inputFull: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: 'white',
    width: '100%',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#ccc',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    flex: 1,
    marginLeft: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  // SECTION CARDS
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
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
  sectionTitle: {
    color: '#333',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  // COMPANY STYLES
  companyCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyIcon: {
    fontSize: 24,
  },
  companyContent: {
    flex: 1,
  },
  companyName: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  companyCountry: {
    color: '#666',
    fontSize: 14,
  },
  companyLogo: {
    fontSize: 24,
  },
  detailsGrid: {
    marginBottom: 16,
  },
  detailItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  detailLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  descriptionTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  descriptionText: {
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
  },
  // INFO ITEMS
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  // ACTION BUTTONS
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  actionButtonIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  actionButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: 'white',
    width: '100%',
    maxHeight: '85%',
    borderRadius: 16,
    padding: 16,
  },
  warningModalCard: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
  },
  warningModalText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginBottom: 8,
  },
  datePickerCard: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  datePickerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  datePickerListContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    height: 140,
  },
  datePickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
  },
  datePickerOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  datePickerOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  datePickerOptionTextSelected: {
    color: 'white',
    fontWeight: '700',
  },
  datePickerMonthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 8,
    justifyContent: 'space-between',
  },
  datePickerMonthOption: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerMonthText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  datePickerDayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 8,
    justifyContent: 'space-between',
  },
  datePickerDayOption: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },
  datePickerDayText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333',
  },
  preferenceSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginTop: 10,
    marginBottom: 8,
  },
  preferenceTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  preferenceTag: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  preferenceTagSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  preferenceTagText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
  },
  preferenceTagTextSelected: {
    color: 'white',
  },
  genderOptionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  genderOption: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  genderOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderOptionText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
  },
  genderOptionTextSelected: {
    color: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 14,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#ececec',
    borderRadius: 10,
    paddingVertical: 12,
    marginRight: 8,
  },
  modalCancelButtonText: {
    textAlign: 'center',
    color: '#333',
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: 'white',
    fontWeight: '700',
  },
});