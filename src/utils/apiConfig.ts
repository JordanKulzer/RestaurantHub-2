// utils/apiConfig.ts
import Constants from "expo-constants";

const LOCAL = "http://172.20.10.2:8080";

const PROD = "https://restauranthub-api-production.up.railway.app";

export const API_BASE_URL = __DEV__ ? LOCAL : PROD;
// export const API_BASE_URL = PROD;
