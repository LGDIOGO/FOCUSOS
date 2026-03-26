@echo off
set GIT_PATH="C:\Program Files\Git\bin\git.exe"
echo 🚀 Iniciando Sincronizacao FocusOS...
%GIT_PATH% add .
%GIT_PATH% commit -m "Sync: Auto Update"
%GIT_PATH% push origin main
echo ✅ Sincronizado com Sucesso!
pause
