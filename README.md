# Un mundo para nosotros

Web estática de Aaron y Eri para el Día de la Primavera. Incluye fotos, música,
sonidos y todos los archivos necesarios para publicarla, sin instalación ni backend.

## Subir a GitHub Pages

1. Descomprimí este ZIP.
2. Subí **el contenido extraído** a la raíz de un repositorio de GitHub. `index.html`
   debe quedar en la raíz, junto a `app.js`, `content.js`, las carpetas `music/`,
   `photos/` y `sounds/`, y los demás archivos. No subas solo el ZIP.
3. En el repositorio abrí **Settings → Pages**. En **Build and deployment** elegí
   **Deploy from a branch**, seleccioná `main` y `/(root)`, y guardá.

Guía oficial: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

GitHub Pages publica el contenido del sitio en Internet. Las fotos y los archivos
de música incluidos en este paquete serán accesibles para quien tenga el enlace.

## Cambiar contenido

Los nombres, textos, recuerdos, carta, canciones y mensaje final están en
`content.js`. Para reemplazar fotos o canciones, copiá los archivos a `photos/`
o `music/` y cambiá sus rutas en ese mismo archivo.

Para probarlo localmente, ejecutá `python -m http.server 4173` en esta carpeta
y abrí `http://localhost:4173`.

## Recursos

Las fotos, las canciones y las texturas del terreno fueron suministradas por
Aaron. El cofre, los marcos, las flores y los sonidos del juego proceden de
recursos de Minecraft: Java Edition. Minecraft y esos recursos pertenecen a
Mojang/Microsoft. Este proyecto es una sorpresa personal, no contenido oficial.
