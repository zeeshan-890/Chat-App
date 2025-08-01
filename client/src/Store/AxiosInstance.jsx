import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === 'development' ? 'http://localhost:3000/api' : '/api', // set your base URL here
  withCredentials: true, // send cookies (optional)
});

export default axiosInstance