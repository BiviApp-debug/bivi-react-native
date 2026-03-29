import { StyleSheet } from 'react-native';


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: "center",
    justifyContent: "center"
  },
   imageIcon: {
    width: 32,
    height: 32
  },
  imageFont: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: "100%",
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
    backgroundColor: "#2C2C2C",
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

   user_button: {
    borderRadius:40,
    width:80,
    display:'flex',
    height:80,
    zIndex:10000,
    elevation: 1,
  },
   user_img: {    
    borderRadius:40,
    top:0,
    left:0,
    width:80,
    display:'flex',
    height:80,
    zIndex:10000,
     elevation: 1,
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

    color: "white",
    width: "80%",
    fontSize: 18,
  },
   content_display: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    display: 'flex',
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
  title: {
    color: "black",
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center"
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
  alert: {
    color: "black",
    fontSize: 18,
    fontWeight: "400"
  },
  textButton: {
    color: "white",
    fontSize: 16,
    fontWeight: "400"
  }

});
export default styles
