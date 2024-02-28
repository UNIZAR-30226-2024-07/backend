# backend
Backend de las dos aplicaciones. La tecnología empleada es Express, un framework de Node.js

Aquí se encuentra una descripción de las carpetas existentes y su contenido:
- ./database: contiene la configuración necesaria para poder conectarse con la BD.
- ./node_modules: ficheros básicos generados automáticamente para la creación del proyecto, librerías, dependencias...
- ./models: esquemas de las tablas de la BD. Cada tabla en un fichero distinto
- ./routes: se definen los endpoints de la api. Para cada tabla en models un fichero con las funciones de la misma y las rutas para acceder a ellas
- ./controllers: en cada fichero correspondiente se encuentran las funciones disponibles del backend.