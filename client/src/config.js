// Configuration for different environments
const config = {
  development: {
    apiUrl: 'http://localhost:5001'
  },
  production: {
    apiUrl: process.env.REACT_APP_API_URL || 'https://words-green.vercel.app/'
  }
};

const environment = process.env.NODE_ENV || 'development';
export const apiUrl = config[environment].apiUrl; 