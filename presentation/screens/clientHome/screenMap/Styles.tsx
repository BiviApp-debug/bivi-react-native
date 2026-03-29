import { StyleSheet } from 'react-native';


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'red',
    alignItems: "center",
    justifyContent: "center"
  },
  map: {
    flex: 1,
    width: "100%",
    height: 400
  },
  
  modalContainer: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
},
modalContent: {
  backgroundColor: 'white',
  borderRadius: 20,
  padding: 30,
  width: '90%',
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
  color: '#333',
},
modalText: {
  fontSize: 23,
  marginBottom: 25,
  textAlign: 'center',
  color: '#666',
  lineHeight: 22,
},
modalButtons: {
  marginTop: 20,
  gap: 15,
},
cancelButton: {
  padding: 15,
  alignItems: 'center',
},
cancelButtonText: {
  fontSize: 16,
  color: '#666',
  fontWeight: '600',
}

});
export default styles
