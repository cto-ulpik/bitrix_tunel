# Usa una imagen base de Node.js
FROM node:18

# Establece la zona horaria global para el contenedor
ENV TZ=America/Guayaquil

# Establece el directorio de trabajo en el contenedor
WORKDIR /usr/src/app

# Copia los archivos package.json y package-lock.json
COPY package*.json ./

# Instala las dependencias del proyecto
RUN npm install

# Copia el resto de los archivos del proyecto
COPY . .

# Copia el archivo .env al directorio de trabajo del contenedor
#COPY .env .env

# Elimina la carpeta node_modules y reinstala las dependencias
RUN rm -rf node_modules && npm install

# Construye el proyecto
RUN npm run build

# Expone los puertos necesarios
EXPOSE 3333

# Instala el paquete dotenv-cli para cargar variables de entorno
RUN npm install -g dotenv-cli

# Inicia la aplicación usando dotenv para cargar las variables de entorno
CMD ["dotenv", "-e", ".env", "npm", "run", "start:prod"]
