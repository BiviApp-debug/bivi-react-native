import { StyleSheet } from 'react-native';


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: "center",
    justifyContent: "center"
  },
  imageFont: {
    width: "100%",
    height: "100%",
    opacity: 0.5,
  },
  back_button: {
    position:"absolute",
    top:-465,
    left:-120,
    width:30,
    height:30    
  },
  imageUSer: {
    width: 80,
    height: 80,

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
    color: "white",
    fontSize: 30,
    fontWeight: "bold"
  },
  form: {
    width: "90%",
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.2)",
    height: "75%",
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    padding: 10,
    margin: "auto",
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
  }

});
export default styles
