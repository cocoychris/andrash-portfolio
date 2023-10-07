echo "Launching both backend and frontend"
pm2 start serve-backend.json
pm2 start frontend/serve-frontend.json