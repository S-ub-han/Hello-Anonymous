// src/socket.js
import { io } from 'socket.io-client';

const socket = io("https://hello-anonymous.onrender.com"); // use your backend URL

export default socket;