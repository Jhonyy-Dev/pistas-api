<div align="center">
  <img src="web/src/pages/assets/Play/music.png" alt="Solo Chiveros Logo" width="120" height="120">
  <h1>Solo Chiveros - Plataforma Premium de Pistas Musicales</h1>
  <p><strong>La colección más completa de pistas peruanas para eventos profesionales</strong></p>
</div>

<div align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version 1.0.0">
  <img src="https://img.shields.io/badge/node-16.x-brightgreen.svg" alt="Node 16.x">
  <img src="https://img.shields.io/badge/react-18.x-61DAFB.svg" alt="React 18.x">
  <img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License MIT">
</div>

<hr>

## 📣 Descripción

**Solo Chiveros** es una plataforma de streaming de pistas musicales diseñada para DJs, animadores, orquestas y organizadores de eventos. Con una biblioteca de más de 4,000 pistas 100% peruanas de alta calidad, nuestra aplicación ofrece una experiencia de reproducción fluida con tecnología de búsqueda avanzada y una interfaz de usuario intuitiva y moderna.

## ✨ Características Principales

- **Biblioteca Masiva**: Acceso a más de 4,000 pistas musicales organizadas profesionalmente
- **Reproducción Optimizada**: Sistema de reproducción de audio de alto rendimiento con controles intuitivos
- **Búsqueda Instantánea**: Búsqueda en tiempo real con resultados precisos
- **Indicador Visual Avanzado**: Indicador de reproducción con efecto radar para identificar fácilmente la pista activa
- **Experiencia Responsive**: Diseño completamente adaptativo para dispositivos móviles, tablets y desktops
- **Streaming Seguro**: Transmisión de audio protegida mediante URLs firmadas con tiempo de caducidad
- **Paginación Eficiente**: Navegación fluida a través de la colección completa de pistas

## 💻 Arquitectura del Sistema

### Stack Tecnológico

#### Frontend (web)
- **Framework**: React 18 con Vite para desarrollo y construcción optimizada
- **Gestión de Estado**: Redux para manejo centralizado del estado de la aplicación
- **Enrutamiento**: React Router para navegación fluida entre páginas
- **Estilos**: CSS moderno con sistema de diseño responsive personalizado
- **Iconografía**: Combinación de React Icons y assets personalizados

#### Backend (api)
- **Runtime**: Node.js con Express para APIs RESTful de alto rendimiento
- **Almacenamiento**: Backblaze B2 para almacenamiento cloud escalable de archivos de audio
- **Autenticación**: JWT (JSON Web Tokens) para acceso seguro
- **Base de Datos**: MySQL para metadatos de pistas y gestión de usuarios

## 📍 Estructura del Proyecto

```
PISTAS_CHIVERAS/
├── api/             # Backend - Servidor Node.js/Express
│   ├── config/       # Configuraciones de la aplicación
│   ├── controllers/   # Controladores de ruta
│   ├── middlewares/   # Middlewares de autenticación y otros
│   ├── models/       # Modelos de datos
│   ├── routes/       # Definición de rutas API
│   ├── services/     # Servicios de negocio
│   └── utils/        # Utilidades y helpers
│
├── web/             # Frontend - Aplicación React
│   ├── public/       # Activos públicos
│   └── src/          # Código fuente
│       ├── components/  # Componentes React reutilizables
│       ├── hooks/       # Custom hooks
│       ├── pages/       # Componentes de página
│       ├── services/    # Servicios para comunicación con API
│       ├── store/       # Configuración de Redux y slices
│       └── utils/       # Utilidades compartidas
└── docs/            # Documentación adicional
```

## 🔥 Características Técnicas Destacadas

1. **Sistema de Audio Optimizado**:
   - Eliminación inteligente de reproducción simultánea
   - Manejo eficiente de la memoria al cambiar entre pistas
   - Precargar automático para reproducción fluida

2. **UI/UX Premium**:
   - Indicador visual tipo radar con animación fluida
   - Etiquetas "Reproduciendo" estéticamente integradas
   - Diseño responsive con optimización para móviles
   
3. **Optimización SEO**:
   - Meta etiquetas completas para mejor indexación
   - Open Graph para vista previa rica en redes sociales
   - Twitter Cards para compartir optimizado

4. **Seguridad**:
   - URLs firmadas con tiempo de caducidad para acceso a archivos
   - Protección contra acceso directo no autorizado
   - Sanitización de entradas para prevenir inyecciones

## ✍️ Autor y Mantenimiento

Desarrollado con ❤️ para la comunidad de músicos y animadores de eventos del Perú.

## ©️ Licencia

Copyright (c) 2025 Solo Chiveros. Todos los derechos reservados.
