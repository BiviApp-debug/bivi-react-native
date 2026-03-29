import {createContext} from 'react';
let defaultState = "status"; 
export const dataContext = createContext<any>(defaultState)
