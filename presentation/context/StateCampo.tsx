import React, { useState,useEffect } from "react";
import { dataContext } from "./Authcontext";

const StateCampo = ({ children }:any) => {

  const [authResponse, setAuthResponse] = useState<any>("Letras");
  
  const saveAuthSession = async() =>{

  }

  const getAuthSession = async() =>{

  }

  const removeAuthSession = async() =>{
setAuthResponse(null)
  }
  return (
    <dataContext.Provider value={{ 
      authResponse, 
      setAuthResponse,
      saveAuthSession,
      getAuthSession,
      removeAuthSession
   }}>
      {children}
    </dataContext.Provider>
  );
};

export default StateCampo;
