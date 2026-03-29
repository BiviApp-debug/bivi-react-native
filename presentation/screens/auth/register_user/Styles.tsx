import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  // ===== CONTENEDOR PRINCIPAL =====
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // ===== HEADER PÚRPURA =====
  headerPurple: {
    backgroundColor: '#6B2D7A',
    paddingTop: 100,
    paddingBottom: 40,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#6B2D7A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  backButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    flex: 1,
    textAlign: 'center',
  },

  // ===== PROGRESS BAR =====
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#E91E63',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  // ===== WRAPPER DE PASOS =====
  stepsWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },

  // ===== CONTENEDOR DE PASO =====
  stepContainer: {
    gap: 10,
    justifyContent: 'space-between',
  },
  
  back_button: {
    position: "absolute",
    bottom: 18,
    left: 25,
    width: 35,
    height: 35,
    borderRadius: 50,
    padding: 0,
    backgroundColor: 'transparent',
  },
  back_img: {},
  imageUSer: {
    width: 80,
    height: 80
  },

  // ===== HEADER DE PASO =====
  stepHeader: {
    marginTop: 20,
    marginBottom: 10,
  },

  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E91E63',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
  },

  stepSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
    lineHeight: 20,
  },

  // ===== INPUTS CONTAINER =====
  inputsContainer: {
   
    gap:8,
    justifyContent: 'flex-start',
  },

  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },

  helperText: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ===== FOOTER DE PASO =====
  stepFooter: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },

  // ===== MODAL =====
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    gap: 18,
    width: '95%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#040404',
  },

  modalText: {
    fontSize: 17,
    width: "80%",
    margin: "auto",
    fontWeight: "300",
    marginBottom: 25,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },

  imageCheckIcon: {
    margin: "auto",
    width: 50,
    height: 50
  },

  modalButtons: {
    marginTop: 20,
    gap: 15,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    width: "100%",
    alignItems: "center"
  },

  cancelButton: {
    padding: 12,
    alignItems: 'center',
  },

  cancelButtonText: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '600',
  }
});

export default styles;