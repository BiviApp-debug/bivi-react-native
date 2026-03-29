import React, { useState, useRef, useContext } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import COLORS from '../../../utils/colors';
import { dataContext } from '../../../context/Authcontext';
import { saveTravelOptions } from '../../../utils/saveTravelOptions';
import SuccessModal from '../../../components/SuccessModal';
import ErrorModal from '../../../components/ErrorModal';

interface TripOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm?: (options: TripOptions) => void;
  typeService: string;
}

interface TripOptions {
  moreThan4Passengers?: boolean;
  heavyObjects?: boolean;
  hasPet?: boolean;
  hasChild?: boolean;
  hasBigObjects?: boolean;
  comment: string;
  typeService: string;
}

const TripOptionsModal: React.FC<TripOptionsModalProps> = ({
  visible,
  onClose,
  onConfirm,
  typeService
}) => {
  // Estados para opciones de CARRO
  const [moreThan4Passengers, setMoreThan4Passengers] = useState(false);
  const [heavyObjects, setHeavyObjects] = useState(false);
  const [hasPet, setHasPet] = useState(false);

  // Estados para opciones de MOTO
  const [hasChild, setHasChild] = useState(false);
  const [hasBigObjects, setHasBigObjects] = useState(false);

  const [comment, setComment] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Animated values
  const inputHeight = useRef(new Animated.Value(50)).current;
  const inputScale = useRef(new Animated.Value(1)).current;

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const { authResponse } = useContext(dataContext);

  const handleInputFocus = () => {
    setIsInputFocused(true);

    Animated.parallel([
      Animated.spring(inputHeight, {
        toValue: 120,
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }),
      Animated.spring(inputScale, {
        toValue: 1.02,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);

    Animated.parallel([
      Animated.spring(inputHeight, {
        toValue: 50,
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }),
      Animated.spring(inputScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
  };

  const handleConfirm = async () => {
    if (!authResponse?.usuario?.phone) {
      setErrorMessage("No se pudo identificar al usuario");
      setShowErrorModal(true);
      //Alert.alert('Error', 'No se pudo identificar al usuario');
      return;
    }

    setIsSaving(true);

    try {
      // Preparar el payload según el tipo de servicio
      const payload: any = {
        clientId: authResponse.usuario.phone,
        comments: comment.trim() || '',
      };

      if (typeService === 'moto') {
        // Opciones específicas para MOTO
        payload.child = hasChild ? 'true' : 'false';
        payload.objects = heavyObjects ? 'true' : 'false';
        payload.bigObjects = hasBigObjects ? 'true' : 'false';
        // Valores null para las opciones de carro
        payload.pasajers = 'false';
        payload.hasPet = 'false';
      } else {
        // Opciones específicas para CARRO
        payload.pasajers = moreThan4Passengers ? 'true' : 'false';
        payload.objects = heavyObjects ? 'true' : 'false';
        payload.hasPet = hasPet ? 'true' : 'false';
        // Valores null para las opciones de moto
        payload.child = 'false';
        payload.bigObjects = 'false';
      }

      console.log('📤 Enviando travel options:', payload);

      // Guardar en el backend
      const response = await saveTravelOptions(payload);

      console.log('✅ Travel options guardadas:', response);

      // Llamar al callback opcional onConfirm
      if (onConfirm) {
        const options: TripOptions = {
          comment,
          typeService,
        };

        if (typeService === 'moto') {
          options.hasChild = hasChild;
          options.heavyObjects = heavyObjects;
          options.hasBigObjects = hasBigObjects;
        } else {
          options.moreThan4Passengers = moreThan4Passengers;
          options.heavyObjects = heavyObjects;
          options.hasPet = hasPet;
        }

        onConfirm(options);
      }
      setSuccessMessage(`✅ Tus preferencias han sido guardadas correctamente`);
      setShowSuccessModal(true);

      setTimeout(() => {
        TemporalData()
      }, 2000);
      // Mostrar mensaje de éxito
     /* Alert.alert(
        '✓ Guardado',
        'Tus preferencias han sido guardadas correctamente',
        [
          {
            text: 'OK',
            onPress: TemporalData,
          }
        ]
      );*/

    } catch (error) {
      console.error('❌ Error guardando travel options:', error);
      setErrorMessage("No se pudieron guardar tus preferencias. Intenta nuevamente.");
      setShowErrorModal(true);
      setTimeout(() => {
        setIsSaving(false);
      }, 2000);
      /*Alert.alert(
        'Error',
        'No se pudieron guardar tus preferencias. Intenta nuevamente.',
        [
          {
            text: 'Reintentar',
            onPress: handleConfirm,
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          }
        ]
      );*/
    } finally {
      setIsSaving(false);
    }
  };


  const TemporalData = () => {


    // Reset animations
    inputHeight.setValue(50);
    inputScale.setValue(1);

    onClose();
  };

  const handleClose = () => {
    // Reset all values
    setMoreThan4Passengers(false);
    setHeavyObjects(false);
    setHasPet(false);
    setHasChild(false);
    setHasBigObjects(false);
    setComment('');
    setIsInputFocused(false);
    setIsSaving(false);

    // Reset animations
    inputHeight.setValue(50);
    inputScale.setValue(1);

    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
            >
              <View style={styles.modalContent}>
                {/* Handle bar */}
                <View style={styles.handleBar} />

                {/* Título */}
                <Text style={styles.modalTitle}>
                  Opciones del viaje {typeService === 'moto' ? '🏍️' : '🚗'}
                </Text>

                {/* Opciones con switches */}
                <View style={styles.optionsContainer}>

                  {/* ========== OPCIONES PARA CARRO ========== */}
                  {typeService === 'carro' && (
                    <>
                      {/* Opción 1: Más de 4 pasajeros */}
                      <View style={styles.optionRow}>
                        <View style={styles.optionTextContainer}>
                          <Text style={styles.optionText}>Más de 4 pasajeros</Text>
                          <Text style={styles.optionSubtext}>
                            {moreThan4Passengers ? 'Sí' : 'No'}
                          </Text>
                        </View>
                        <Switch
                          value={moreThan4Passengers}
                          onValueChange={setMoreThan4Passengers}
                          trackColor={{
                            false: COLORS.backgroundMedium,
                            true: COLORS.primary
                          }}
                          thumbColor="#fff"
                          ios_backgroundColor={COLORS.backgroundMedium}
                          disabled={isSaving}
                        />
                      </View>

                      {/* Opción 2: Llevo objetos pesados */}
                      <View style={styles.optionRow}>
                        <View style={styles.optionTextContainer}>
                          <Text style={styles.optionText}>Llevo objetos pesados</Text>
                          <Text style={styles.optionSubtext}>
                            {heavyObjects ? 'Sí' : 'No'}
                          </Text>
                        </View>
                        <Switch
                          value={heavyObjects}
                          onValueChange={setHeavyObjects}
                          trackColor={{
                            false: COLORS.backgroundMedium,
                            true: COLORS.primary
                          }}
                          thumbColor="#fff"
                          ios_backgroundColor={COLORS.backgroundMedium}
                          disabled={isSaving}
                        />
                      </View>

                      {/* Opción 3: Llevo mascota */}
                      <View style={styles.optionRow}>
                        <View style={styles.optionTextContainer}>
                          <Text style={styles.optionText}>Llevo mascota</Text>
                          <Text style={styles.optionSubtext}>
                            {hasPet ? 'Sí' : 'No'}
                          </Text>
                        </View>
                        <Switch
                          value={hasPet}
                          onValueChange={setHasPet}
                          trackColor={{
                            false: COLORS.backgroundMedium,
                            true: COLORS.primary
                          }}
                          thumbColor="#fff"
                          ios_backgroundColor={COLORS.backgroundMedium}
                          disabled={isSaving}
                        />
                      </View>
                    </>
                  )}

                  {/* ========== OPCIONES PARA MOTO ========== */}
                  {typeService === 'moto' && (
                    <>
                      {/* Opción 1: Tengo menor de 6 años */}
                      <View style={styles.optionRow}>
                        <View style={styles.optionTextContainer}>
                          <Text style={styles.optionText}>Tengo menor de 6 años</Text>
                          <Text style={styles.optionSubtext}>
                            {hasChild ? 'Sí' : 'No'}
                          </Text>
                        </View>
                        <Switch
                          value={hasChild}
                          onValueChange={setHasChild}
                          trackColor={{
                            false: COLORS.backgroundMedium,
                            true: COLORS.primary
                          }}
                          thumbColor="#fff"
                          ios_backgroundColor={COLORS.backgroundMedium}
                          disabled={isSaving}
                        />
                      </View>

                      {/* Opción 2: Tengo objetos pesados */}
                      <View style={styles.optionRow}>
                        <View style={styles.optionTextContainer}>
                          <Text style={styles.optionText}>Tengo objetos pesados</Text>
                          <Text style={styles.optionSubtext}>
                            {heavyObjects ? 'Sí' : 'No'}
                          </Text>
                        </View>
                        <Switch
                          value={heavyObjects}
                          onValueChange={setHeavyObjects}
                          trackColor={{
                            false: COLORS.backgroundMedium,
                            true: COLORS.primary
                          }}
                          thumbColor="#fff"
                          ios_backgroundColor={COLORS.backgroundMedium}
                          disabled={isSaving}
                        />
                      </View>

                      {/* Opción 3: Tengo objetos de gran dimensión */}
                      <View style={styles.optionRow}>
                        <View style={styles.optionTextContainer}>
                          <Text style={styles.optionText}>Tengo objetos de gran dimensión</Text>
                          <Text style={styles.optionSubtext}>
                            {hasBigObjects ? 'Sí' : 'No'}
                          </Text>
                        </View>
                        <Switch
                          value={hasBigObjects}
                          onValueChange={setHasBigObjects}
                          trackColor={{
                            false: COLORS.backgroundMedium,
                            true: COLORS.primary
                          }}
                          thumbColor="#fff"
                          ios_backgroundColor={COLORS.backgroundMedium}
                          disabled={isSaving}
                        />
                      </View>
                    </>
                  )}
                </View>

                {/* Campo de comentario animado */}
                <Animated.View
                  style={[
                    styles.commentContainer,
                    {
                      transform: [{ scale: inputScale }],
                    }
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.commentInputWrapper,
                      {
                        height: inputHeight,
                        borderColor: isInputFocused ? COLORS.primary : 'transparent',
                        borderWidth: isInputFocused ? 2 : 0,
                      }
                    ]}
                  >
                    <TextInput
                      style={[
                        styles.commentInput,
                        isInputFocused && styles.commentInputFocused
                      ]}
                      placeholder="Comentario adicional (opcional)"
                      placeholderTextColor={COLORS.textSecondary}
                      value={comment}
                      onChangeText={setComment}
                      multiline={isInputFocused}
                      numberOfLines={isInputFocused ? 4 : 1}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      textAlignVertical={isInputFocused ? 'top' : 'center'}
                      maxLength={500}
                      editable={!isSaving}
                    />
                  </Animated.View>

                  {/* Contador de caracteres (solo cuando está enfocado) */}
                  {isInputFocused && (
                    <Animated.Text
                      style={styles.characterCount}
                    >
                      {comment.length}/500
                    </Animated.Text>
                  )}
                </Animated.View>

                {/* Botones */}
                <View style={styles.buttonsContainer}>
                  {/* Botón de guardar */}
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      isSaving && styles.confirmButtonDisabled
                    ]}
                    onPress={handleConfirm}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator color="#000" size="small" />
                        <Text style={styles.confirmButtonText}>Guardando...</Text>
                      </View>
                    ) : (
                      <Text style={styles.confirmButtonText}>Guardar</Text>
                    )}
                  </TouchableOpacity>

                  {/* Botón de cancelar */}
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleClose}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
      <ErrorModal
        visible={showErrorModal}
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
      <SuccessModal
        visible={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: COLORS.backgroundMedium,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsContainer: {
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '400',
    marginBottom: 4,
  },
  optionSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },
  commentContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
  commentInputWrapper: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  commentInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  commentInputFocused: {
    fontSize: 16,
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 6,
    opacity: 0.7,
  },
  buttonsContainer: {
    gap: 12,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.backgroundMedium,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

export default TripOptionsModal;