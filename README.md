# Nexury Social App

Nexury es una plataforma de red social de alto rendimiento y modular con interacciones en tiempo real, arquitectura de grado empresarial y una interfaz moderna.

## 🚀 Despliegue en GitHub Pages

Este proyecto está configurado para desplegarse automáticamente en GitHub Pages mediante GitHub Actions.

### Pasos para el despliegue:

1. **Crear un nuevo repositorio en GitHub.**
2. **Subir el código a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git push -u origin main
   ```
3. **Configurar Secretos en GitHub:**
   - Ve a tu repositorio en GitHub.
   - Navega a **Settings > Secrets and variables > Actions**.
   - Añade los siguientes secretos como **Repository secrets**:
     - `VITE_SUPABASE_URL`: Tu URL de proyecto de Supabase.
     - `VITE_SUPABASE_ANON_KEY`: Tu clave anónima de Supabase.
4. **Habilitar GitHub Pages:**
   - Una vez que la acción de GitHub (GitHub Action) termine de ejecutarse por primera vez, se creará una rama llamada `gh-pages`.
   - Ve a **Settings > Pages**.
   - En **Build and deployment > Branch**, selecciona la rama `gh-pages` y la carpeta `/(root)`.
   - Haz clic en **Save**.

### ⚙️ Configuración de Supabase

Para que la aplicación funcione correctamente, debes ejecutar los scripts SQL que se encuentran en la carpeta `/supabase` en el **SQL Editor** de tu proyecto de Supabase.

1. Ejecuta los archivos en orden numérico (`01_...`, `02_...`, etc.).
2. Crea dos buckets públicos en **Storage**: `posts` y `avatars`.
3. Habilita las políticas RLS (Row Level Security) según sea necesario.

## 🛠️ Desarrollo Local

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## 📱 PWA y Móvil

La aplicación está configurada como una PWA y es compatible con Capacitor para generar aplicaciones nativas de Android e iOS.

- Para sincronizar con Capacitor: `npm run cap:sync`
- Para añadir Android: `npm run cap:add:android`
