# Fuentes oficiales — Ruta Serena

Ruta Serena solo muestra como **vigente** un servicio que tenga el enlace a su fuente oficial (`url_fuente`) y una fecha de verificación de hace 30 días o menos. Si pasa más tiempo, queda "en revisión" hasta que alguien del equipo lo confirme.

Esta tabla reúne las **entidades oficiales** de donde se tomará la información real de los servicios. La versión de demostración (TRL 4) usa **solo datos sintéticos**, así que todavía no se ha copiado ningún teléfono, horario ni dirección real de estas fuentes.

La columna **Fecha de verificación** está vacía a propósito. Se llena a mano el día en que una persona del equipo revise la fuente y cargue o confirme los servicios en el panel de administración (**Verificar**).

| Entidad | Fuente | URL | Qué se toma | Fecha de verificación |
| --- | --- | --- | --- | --- |
| Ministerio de Salud y Protección Social | Portal oficial | https://www.minsalud.gov.co | Líneas nacionales de orientación en salud mental y rutas de atención | |
| Gobernación del Meta — Secretaría Departamental de Salud | Portal oficial | https://meta.gov.co | Líneas departamentales y oferta de salud mental en el Meta | |
| Alcaldía de Villavicencio — Secretaría de Salud | Portal oficial | https://www.villavicencio.gov.co | Oferta municipal: puntos de atención presencial, horarios y canales | |
| Instituto Colombiano de Bienestar Familiar (ICBF) | Portal oficial | https://www.icbf.gov.co | Canales de orientación y protección para niñas, niños, adolescentes y familias | |
| Fiscalía General de la Nación | Portal oficial | https://www.fiscalia.gov.co | Canales oficiales para orientar a víctimas de violencias | |
| Policía Nacional de Colombia | Portal oficial | https://www.policia.gov.co | Confirmación de la línea única de emergencias 123 | |

Los portales respondían en línea el 22 de octubre de 2026. Eso confirma que existen, pero no que su contenido haya sido verificado.

## Cómo verificar una fuente

1. Abrir la página oficial y ubicar el servicio, la línea o el punto de atención.
2. Copiar la **URL exacta** de la página donde aparece el dato; esa es la `url_fuente` del servicio.
3. En el panel de administración (**Servicios** o **Verificar**), cargar o confirmar el servicio. La fecha de verificación queda con el día de hoy.
4. Anotar en esta tabla la fecha y quién hizo la verificación.
5. No publicar ningún dato que no aparezca en una fuente oficial. Si la fuente cambia o deja de existir, el servicio pasa a "en revisión" o se retira.

## Lectura automática de fuentes (scraper)

El lector automático solo visita dominios de la **lista blanca** (`SCRAPER_LISTA_BLANCA`). Por defecto son `minsalud.gov.co`, `meta.gov.co` y `villavicencio.gov.co`. Para leer también el ICBF, la Fiscalía o la Policía hay que agregarlos a esa variable.

El lector respeta `robots.txt`, hace como máximo 1 solicitud cada 5 segundos por dominio y **nunca publica cambios por sí solo**: los deja en "Cambios pendientes" para que un administrador los revise.
