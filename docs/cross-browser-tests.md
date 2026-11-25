# WatchDog Cross-Browser-Testprotokoll

Stand: Mai 2026

## Automatisierte Abdeckung

Die Unit Tests in `packages/core` pruefen:

- Error-Interceptor inklusive Chrome-, Firefox- und Safari-Stack-Normalisierung.
- Console-Interceptor inklusive zirkulaerer Objektserialisierung.
- fetch- und XMLHttpRequest-Interceptor inklusive Loop-Schutz.
- Fingerprint-Stabilitaet, Rotation und native `crypto.subtle.digest`-Nutzung.
- User-Agent-Erkennung fuer Chrome, Firefox, Safari, Edge und Samsung Internet.
- Event-Batching und `navigator.sendBeacon()` bei Page-Unload.

## Manuelle Browser-Matrix fuer Phase 1

Vor dem Phase-1-Abschluss muss diese Matrix gegen eine leere HTML-Testseite ausgefuehrt werden:

| Browser | Plattform     | Fingerprint stabil nach Reload | Browser-ID unterscheidet sich | Error | Promise | Console | fetch | XHR   |
| ------- | ------------- | ------------------------------ | ----------------------------- | ----- | ------- | ------- | ----- | ----- |
| Chrome  | Windows       | offen                          | offen                         | offen | offen   | offen   | offen | offen |
| Chrome  | macOS         | offen                          | offen                         | offen | offen   | offen   | offen | offen |
| Firefox | Windows       | offen                          | offen                         | offen | offen   | offen   | offen | offen |
| Firefox | macOS         | offen                          | offen                         | offen | offen   | offen   | offen | offen |
| Safari  | macOS         | offen                          | offen                         | offen | offen   | offen   | offen | offen |
| Safari  | iOS           | offen                          | offen                         | offen | offen   | offen   | offen | offen |
| Edge    | Windows/macOS | offen                          | offen                         | offen | offen   | offen   | offen | offen |

## Testseite

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <title>WatchDog Smoke Test</title>
    <script src="./watchdog.min.js"></script>
    <script>
      const watchdog = WatchDog.init({
        projectId: 'dev-project-token',
        server: 'http://localhost:4040',
        debug: true
      });

      console.error('console smoke', { nested: true });
      Promise.reject(new Error('promise smoke'));
      fetch('/missing').catch(() => {});
      setTimeout(() => {
        throw new Error('throw smoke');
      }, 100);
    </script>
  </head>
  <body>
    <h1>WatchDog Smoke Test</h1>
  </body>
</html>
```
