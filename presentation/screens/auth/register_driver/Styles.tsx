import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  changeDataText: {
    color: 'black',
    fontWeight: "800",
    textAlign: 'center',
    fontSize:12
  },
changeData: {
    height:40,
    marginVertical:3,
    display: 'flex',
    backgroundColor: '#FFCC28',    
    borderRadius:20,
    justifyContent:'center',
    alignItems:'center'
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  imageFont: {
    width: "100%",
    height: "100%",
    opacity: 0.2,
  },
  flex_row: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingVertical: 20,
  },
  back_button: {
    position: "absolute",
    top: 90,
    right: 5,
    width: 35,
    height: 35,
    borderRadius: 50,
    padding: 0,
    backgroundColor: 'transparent',
  },
  back_img: {
     width: 13,
    height: 30
  },
  imageUSer: {
    width: 50,
    height: 50
  },

  icon_mail: {
    position: "absolute",
    marginTop: 15,
    left: 10,
    width: 20,
    height: 20,
  },
  selectContainer: {
    position: "relative",
    backgroundColor: "white",
    width: "95%",
    borderWidth: 1,
    borderColor: 'black',
    paddingLeft: 45,
    borderRadius: 50,
  },
  input: {
    fontSize: 20,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    width: "95%",
    marginLeft: 0,
    color: "black"
  },
  imageTextIcon: {
    width: 20,
    height: 20,
    marginRight: 15,
  },
  containterTextInput: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    width: "90%",
    borderBottomWidth: 1,
    borderBottomColor: "white",
  },
  textInput: {
    color: "black",
    width: "80%",
    fontSize: 18,
  },
  botones: {
    height: 50,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    width: "90%",
    padding: 10,
  },
  textLogin: {
    color: "black",
    fontSize: 25,
    fontWeight: "bold",
    paddingRight: 100,
    paddingLeft: 30,
    marginBottom: 5,
  },
  subtitleLogin: {
    color: "black",
    fontSize: 14,
    fontWeight: "200",
    paddingRight: 150,
    paddingLeft: 30,
    marginBottom: 15,
  },
  // ✅ Este es el contenedor scrolleable
  container_scroll: {
    padding: 40,
    gap: 14,
    backgroundColor: "white",
    paddingBottom: 100,
    display: "flex",
    justifyContent: "center",
  },
  // ✅ El form ahora ocupa toda la pantalla
  form: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FFCC28",
    paddingTop: 70,
  },
  alert: {
    color: "white",
    fontSize: 18,
    fontWeight: "500"
  },
  textButton: {
    color: "white",
    fontSize: 16,
    fontWeight: "400"
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  modalButtons: {
    marginTop: 20,
    gap: 30,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    width: "100%",
    alignItems: "center"
  },
  imageCheckIcon: {
    margin: "auto",
    width: 50,
    height: 50
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
