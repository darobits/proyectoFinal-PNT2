# 📌 GymSync – Proyecto Final PNT2

GymSync es una **Single Page Application (SPA)** desarrollada con **Vue 3, Vue Router, Vuex y Vite**, conectada a un backend en **Node.js + Express** con persistencia mediante un archivo `db.json`.  
El sistema permite **registro**, **inicio de sesión**, **gestión de usuarios**, **dashboard con estadísticas**, y navegación **protegida** según el estado de autenticación.

Este proyecto cumple los requisitos de la materia **Programación en Nuevas Tecnologías 2 (PNT2)**:

✔ SPA real  
✔ Persistencia e interacción con backend  
✔ Manejo de usuarios  
✔ Rutas protegidas  
✔ Vuex funcionando con el backend  
✔ CRUD básico  
✔ Buenas prácticas en frontend y backend  

---

## 🚀 Tecnologías utilizadas

### **Frontend**
- Vue 3  
- Vite  
- Vuex  
- Vue Router  
- Axios  
- Bootstrap 5  
- Chart.js + Vue-ChartJS  
- jsPDF + jsPDF-AutoTable  
- XLSX  

### **Backend**
- Node.js  
- Express  
- Persistencia con `db.json`  
- Middlewares personalizados  
- Rutas REST  
- Controladores  

---

## 🔐 Autenticación

El proyecto implementa:

- Registro de usuarios  
- Login con validación  
- Persistencia en `db.json`  
- Manejo de sesión mediante Vuex  
- Redirecciones automáticas  
- Protección de rutas  
- Token almacenado en Vuex  

### **Flujo de autenticación**
1. El usuario se registra.  
2. Los datos se guardan en `db.json`.  
3. Se redirige automáticamente a **/login**.  
4. El usuario inicia sesión.  
5. La sesión se guarda en Vuex.  
6. El sistema redirige a **/home**.  

---

## 📡 Endpoints del Backend

### **Auth**
| Método | Ruta | Descripción |
|--------|-------|-------------|
| POST | `/api/register` | Registrar un usuario nuevo |
| POST | `/api/login` | Iniciar sesión |

### **Usuarios**
| Método | Ruta | Descripción |
|--------|-------|-------------|
| GET | `/api/users/:id` | Obtener información del usuario |
| PUT | `/api/users/:id` | Editar información del usuario |

---

## 📈 Dashboard (Home)

Una vez logueado, el usuario accede al dashboard, que incluye:

- Estadísticas generadas con Chart.js  
- Tarjetas con información personal  
- Exportación a PDF  
- Exportación a Excel  
- Diseño estilizado (verde + azul oscuro, modo oscuro moderno)  

---

## ⚙️ Instalación y ejecución del proyecto

Clonar el repositorio:

```
git clone https://github.com/darobits/proyectoFinal-PNT2
```

Ingresar a la carpeta principal del proyecto:

```
cd proyectoFinal-PNT2
```

Instalar todas las dependencias (backend + frontend):

```
npm install
```

Ejecutar toda la aplicación (backend + frontend unificados):

```
npm start
```

Una vez iniciado:

- Backend disponible en: **http://localhost:3000**  
- Frontend disponible en: **http://localhost:5173**

