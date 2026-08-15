// firebase.js
// Configuración de Firebase leída desde variables de entorno.
// En Render, estas variables se configuran en: Dashboard → tu servicio → Environment.
// Localmente, copia .env.example a .env y rellena los valores.
//
// Debe apuntar al MISMO proyecto/databaseURL que usan la app clínica y el
// servicio de simulación: este servicio es un lector/escritor más de la
// misma Realtime Database, no un proyecto de datos aparte.

import { initializeApp } from "firebase/app";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno "${name}". Configúrala en Render (Environment) ` +
      `o en tu archivo .env local. Revisa .env.example para la lista completa.`
    );
  }
  return value;
}

export const firebaseConfig = {
  apiKey: requireEnv("FIREBASE_API_KEY"),
  authDomain: requireEnv("FIREBASE_AUTH_DOMAIN"),
  databaseURL: requireEnv("FIREBASE_DATABASE_URL"),
  projectId: requireEnv("FIREBASE_PROJECT_ID"),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: requireEnv("FIREBASE_APP_ID"),
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || ""
};

export const app = initializeApp(firebaseConfig);
