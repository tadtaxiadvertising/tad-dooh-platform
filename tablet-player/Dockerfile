FROM nginx:alpine

# Copiar archivos estáticos al directorio de Nginx
COPY . /usr/share/nginx/html/

# Exponer el puerto 80
EXPOSE 80

# Comando para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
