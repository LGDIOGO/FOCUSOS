#!/bin/bash
echo "🚀 Iniciando Sincronização FocusOS..."
git add .
git commit -m "Sync: Auto Update $(date +'%Y-%m-%d %H:%M:%S')"
git push origin main
echo "✅ Sincronizado com Sucesso!"
read -p "Pressione Enter para fechar..."
