import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // ===== HEADER =====
  headerPurple: {
    backgroundColor: '#6B2D7A',
    paddingTop: 60,
    paddingBottom: 35,
    paddingHorizontal: 24,
    alignItems: 'flex-start', // 👈 alineado a la izquierda
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  logoHeader: {
    width: 80, 
    height: 80,
    marginBottom: 0,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'left',
  },

  headerSubtitle: {
    fontSize: 13,
    color: '#E8D5F0',
    fontWeight: '400',
    letterSpacing: 0.4,
    textAlign: 'left',
  },

  // ===== FORM =====
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },

  inputGroup: {
    marginTop: 16,
    marginBottom: 20,
  },

  inputLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333333',
    marginBottom: 6,
  },

  // 👇 IMPORTANTE: fuerza ancho correcto
  inputWrapper: {
    width: '100%',
  },

  // ===== BOTÓN =====
  loginButton: {
    backgroundColor: '#E91E63',
    paddingVertical: 16,
    borderRadius: 8, // 👈 menos redondeado
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },

  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  loginButtonLoading: {
    backgroundColor: '#D81B61',
  },

  // ===== FORGOT PASSWORD =====
  forgotPasswordContainer: {
    alignItems: 'flex-start',
    marginTop: 12,
    marginBottom: 28,
  },

  forgotPasswordText: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '600',
  },

  // ===== REGISTER =====
  registerContainer: {
    alignItems: 'center',
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },

  registerText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },

  registerButton: {
    backgroundColor: '#E91E63',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8, // 👈 uniforme
  },

  registerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ===== LOADING =====
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B2D7A',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 22,
    paddingHorizontal: 30,
  },

  // ===== EXTRA CLEAN =====
  alert: {
    fontSize: 13,
    color: '#E91E63',
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default styles;