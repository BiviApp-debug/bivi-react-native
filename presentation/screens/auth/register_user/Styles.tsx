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
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#6B2D7A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
  },

  back_button: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  back_img: {
    
    height: 20,
  },

  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
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
  },

  // ===== WRAPPER DE PASOS =====
  stepsWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },

  // ===== CONTENEDOR DE PASO =====
  stepContainer: {
    justifyContent: 'space-between',
  },

  // ===== HEADER DE PASO =====
  stepHeader: {
     marginTop: 20,
    marginBottom: 20,
  },

  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E91E63',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
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
    gap: 16,
    justifyContent: 'flex-start',
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },

  helperText: {
    fontSize: 12,
    color: '#E91E63',
    fontWeight: '500',
    marginTop: 8,
  },

  // ===== PREFERENCIAS =====
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },

  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },

  preferenceTag: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  preferenceTagSelected: {
    backgroundColor: '#E91E63',
    borderColor: '#E91E63',
  },

  preferenceTagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
  },

  preferenceTagTextSelected: {
    color: '#FFFFFF',
  },

  // ===== FOOTER DE PASO =====
  stepFooter: {
    paddingTop: 20,
    paddingBottom: 50,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },

  // ===== MODAL =====
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },

  modalText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },

  modalButtons: {
    marginTop: 20,
    gap: 12,
  },

  cancelButton: {
    padding: 12,
    alignItems: 'center',
  },

  cancelButtonText: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '600',
  },
});

export default styles;