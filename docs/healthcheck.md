# Supabase Healthcheck

Este util permite verificar rápidamente la lectura desde Supabase sin tocar la UI.

## Cómo usar

- Abre tu app en modo desarrollo.
- Abre la consola del navegador (DevTools).
- Ejecuta:

  ```js
  await window.__supabaseProbe('meditations')
  ```

## Resultado esperado

- Lectura correcta (ejemplo):

  ```json
  { "ok": true, "error": null, "sample": { /* fila de ejemplo */ } }
  ```

- Si falta una policy RLS o hay restricciones, puedes ver un error como:

  ```json
  { "ok": false, "error": "new row violates row-level security policy for table ...", "sample": null }
  ```

> Nota: La función se expone sólo en desarrollo (`import.meta.env.DEV`). Asegúrate de que el módulo `client/src/lib/supabaseHealthcheck.ts` esté importado en algún punto de tu bundle si no la ves disponible en `window`.

