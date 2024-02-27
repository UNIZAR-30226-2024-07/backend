

# Utiliza la imagen de Node.js como base
FROM node:20.11.1

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia el archivo package.json y package-lock.json (o yarn.lock) al directorio de trabajo
COPY package*.json .


# Instala las dependencias de la aplicación
RUN npm install


# Copia los archivos de la aplicación al directorio de trabajo
COPY . .


# Instala npm serve de forma global (si no está instalado)
#RUN npm install -g serve

# Define el puerto en el que se ejecutará la aplicación
EXPOSE 3900

# Comando para iniciar la aplicación cuando se ejecute el contenedor
CMD ["npm", "start"]
