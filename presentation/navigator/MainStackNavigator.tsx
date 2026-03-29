import { createNativeStackNavigator } from "@react-navigation/native-stack"
import UserLoginScreen from "../screens/auth/login_user/UserLoginScreen";
import UserRegisterScreen from "../screens/auth/register_user/UserRegisterScreen";
import DriverLoginScreen from "../screens/auth/login_driver/DriverLoginScreen";
import ClientHomeScreen from "../screens/clientHome/ClientHomeScreen";
import DriverRegisterScreen from "../screens/auth/register_driver/DriverRegisterScreen";
import StateCampo from "../context/StateCampo";
import DriverHomeScreen from "../screens/driverHome/DriverHomeScreen";
import UserProfileScreen from "../screens/userProfile/UserProfileScreen";
import UserChatScreen from "../screens/userProfile/UserChatScreen";
import DriverChatScreen from "../screens/driverProfile/DriverChatScreen";
import DriverTripHistoryScreen from "../screens/driverProfile/DriverTripHistoryScreen";
import DriverProfileScreen from "../screens/driverProfile/DriverProfileScreen";
import ClientSearchMap from "../screens/clientHome/screenMap/ClientSearchMap";
import DriverSearchMap from "../screens/driverHome/screenMap/DriverSearchMap";
import SplashScreen from "../screens/splahs/SplashScreen";
import  { createDrawerNavigator } from "@react-navigation/drawer"
import React from "react";
import ChatScreen from "../screens/clientHome/ChatController/ChatScreen";

export type RootStackParamList = {
    UserLoginScreen: undefined,
    UserRegisterScreen: undefined,
    DriverLoginScreen: undefined,
    DriverRegisterScreen: undefined,
    ClientHomeScreen: undefined,
    DriverHomeScreen: undefined,
    ClientSearchMap: undefined,
    DriverSearchMap: undefined,
    ChatScreen: undefined,
    SplashScreen: undefined,
    DriverProfileScreen: undefined,
    UserProfileScreen: undefined,
    UserChatScreen: { preAcceptClientId?: string; preAcceptDriverPhone?: string } | undefined,
    DriverChatScreen: undefined,
    DriverTripHistoryScreen: undefined,
}

const Stack = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator<RootStackParamList>();


export const MainStackNavigator = () => {
    return (
        <StateCampo>
            <Stack.Navigator initialRouteName="SplashScreen" screenOptions={{ headerShown: false }}>
                <Stack.Screen
                    name="SplashScreen"
                    component={SplashScreen}
                />
                <Stack.Screen
                    name="UserLoginScreen"
                    component={UserLoginScreen}
                />
                <Stack.Screen
                    name="UserChatScreen"
                    component={UserChatScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="DriverLoginScreen"
                    component={DriverLoginScreen}
                />
                <Stack.Screen
                    name="DriverRegisterScreen"
                    component={DriverRegisterScreen}
                />
                  <Stack.Screen
                    name="DriverChatScreen"
                    component={DriverChatScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="DriverTripHistoryScreen"
                    component={DriverTripHistoryScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="UserRegisterScreen"
                    component={UserRegisterScreen}
                />
                 <Stack.Screen
                    name="DriverHomeScreen"
                    component={DriverDrawerNavigator}
                    options={{ headerShown: false }}
                />     
                 <Stack.Screen
                    name="ClientHomeScreen"
                    component={ClientDrawerNavigator}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="ChatScreen"
                    component={ChatScreen}
                    options={{ headerShown: false }}
                />
                          
            </Stack.Navigator>
        </StateCampo>
    )
}

const DriverDrawerNavigator = () =>{
    return(
        <Drawer.Navigator >
            <Drawer.Screen name="DriverSearchMap"  options={{ headerShown: false }}  component={DriverSearchMap}/>           
            <Drawer.Screen name="DriverProfileScreen" options={{ headerShown: false }} component={DriverProfileScreen}/>           
        </Drawer.Navigator>
    )
}

const ClientDrawerNavigator = () =>{
    return(
        <Drawer.Navigator >
            <Drawer.Screen name="ClientSearchMap"  options={{ headerShown: false }} component={ClientSearchMap}/>           
            <Drawer.Screen name="UserProfileScreen" options={{ headerShown: false }} component={UserProfileScreen}/>           
        </Drawer.Navigator>
    )
}


