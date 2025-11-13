// utils/apiConfig.ts
import Constants from "expo-constants";

const LOCAL = "http://192.168.1.212:8080";

const PROD = "https://restauranthub-api-production.up.railway.app";

export const API_BASE_URL = __DEV__ ? LOCAL : PROD;
// export const API_BASE_URL = PROD;
