import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: "center",
    justifyContent: "flex-start",
  },

  /* Header BIVI Purple */
  headerPurple: {
    width: '100%',
    backgroundColor: '#5B2C6F',
    paddingTop: 100,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  driverIconButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },

  driverIcon: {
    fontSize: 24,
  },

  userSwitchIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },

  logoHeader: {
    width: 60,
    height: 60,
    marginBottom: 12,
    resizeMode: 'contain',
  },

  headerTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },

  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '400',
  },

  /* Form Container */
  formContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 30,
    alignItems: 'center',
  },

  /* Tabs - Email/Teléfono */
  tabsContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 24,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    padding: 4,
  },

  tabActive: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  tabActiveText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  tabInactive: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabInactiveText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },

  /* Input Section */
  inputsSection: {
    width: '100%',
    marginBottom: 20,
  },

  inputLabel: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },

  containterTextInput: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    paddingHorizontal: 12,
  },

  textInput: {
    color: "#333",
    width: "80%",
    fontSize: 16,
  },

  /* Forgot Password Link */
  forgotPasswordText: {
    color: '#E91E63',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },

  /* Buttons */
  botones: {
    height: 50,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFB300",
    width: "100%",
    padding: 10,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#FFB300',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  /* Register Section */
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },

  registerText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '400',
  },

  registerLink: {
    color: '#E91E63',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  /* Legacy Styles (Mantenidas para compatibilidad) */
  imageIcon: {
    width: 32,
    height: 32
  },

  imageFont: {
    position: "absolute",
    top: 0,
    width: "120%",
    height: "120%",
    opacity: 1,
  },

  imageDriver: {
    borderRadius: 80,
    width: 140,
    height: 140,
    display: "flex",
    justifyContent: "center",
    alignContent: "center",
    alignSelf: "center"
  },

  imageTextIcon: {
    width: 20,
    height: 20,
    marginRight: 15,
  },

  textButton: {
    color: "white",
    fontSize: 16,
    fontWeight: "400"
  },

  content_display: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    display: 'flex',
  },

  auto_button_client: {
    borderRadius: 8,
    backgroundColor: "#E3E3E3",
    width: 100,
    display: 'flex',
    height: 35,
    zIndex: 10000,
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: '#000',
  },

  title_buton_client: {
    color: "black",
    fontSize: 15,
    fontWeight: "normal",
  },

  auto_button_driver: {
    borderRadius: 8,
    backgroundColor: "#FFB300",
    width: 100,
    display: 'flex',
    height: 35,
    zIndex: 10000,
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
    flexDirection: "row"
  },

  title_buton_driver: {
    color: "white",
    fontSize: 15,
    fontWeight: "normal",
  },

  auto_img: {
    borderRadius: 40,
    top: 0,
    left: 0,
    width: 80,
    display: 'flex',
    height: 80,
    zIndex: 10000,
    elevation: 1,
  },

  alert: {
    color: "#666",
    fontSize: 14,
    fontWeight: "300"
  },

  form: {
    width: "90%",
    backgroundColor: "transparent",
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    gap: 25,
    padding: 10,
    margin: "auto",
  },

  title: {
    color: "white",
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center"
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
  },

  countryItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  countryText: {
    fontSize: 16,
    color: '#333',
  },

  closeText: {
    marginTop: 15,
    textAlign: 'center',
    color: '#E91E63',
    fontWeight: 'bold',
  },
});

export default styles;
