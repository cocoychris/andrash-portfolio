@echo off
start "Backend" npm run dev
start "Frontend" /d frontend npm run dev
echo Done
exit