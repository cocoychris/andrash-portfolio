@echo off
start "Backend" /d backend npm run dev
start "Frontend" /d frontend npm run dev
echo Done
exit