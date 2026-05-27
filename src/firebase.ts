import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBBFFEsUvdLTC0XuQN4LlYIhXqTvvLuNRE",
  authDomain: "rifa-epereira.firebaseapp.com",
  projectId: "rifa-epereira",
  storageBucket: "rifa-epereira.firebasestorage.app",
  messagingSenderId: "476809050094",
  appId: "1:476809050094:web:e838c815d5d717f01300ff",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);