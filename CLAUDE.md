# DuoTools — Briefing Completo de Renovación

## Estado: RENOVACIÓN COMPLETA (Fases 1-8)
Producción: https://duotools-silk.vercel.app
Repo: https://github.com/OMcescon/duotools

## Descripción del Producto
Herramienta financiera SaaS gratuita dirigida al usuario boliviano moderno.
Propuesta de valor: Compara dónde te conviene más comprar o vender dólares y crypto hoy en Bolivia.

## Stack
React + TypeScript + Vite + Tailwind CSS
Deploy: Vercel (serverless functions en /api)
Diseño: dark theme glassmorphism

## Contexto Bolivia 2026 (CRÍTICO)
- Las criptomonedas son legales en Bolivia desde junio 2024
- Bolivia opera flotación administrada desde 29 junio 2026
- TCO oficial BCB hoy: ~12.04 Bs por USD (fluctúa diariamente, ver /api/bcb-rate)
- Ya NO existe dólar paralelo como antes — brecha pequeña con P2P
- USDT es la crypto más usada en Bolivia como alternativa al dólar
- Exchanges con liquidez real en BOB: Binance P2P, Bybit P2P (OKX se evaluó y se eliminó — ver Pendientes Futuros)
- Métodos de pago: transferencia bancaria boliviana + Tigo Money
- Bancos: Banco Unión, BNB, BancoSol, BCP, Bisa, Banco Mercantil

## APIs GRATUITAS — Solo estas, sin costo
1. Frankfurter.dev — fiat sin key: https://api.frankfurter.dev/v1/latest?base=USD
   (ECB, no publica ARS/CLP/PEN — ver punto 2 para el cruce ARS/CLP)
2. CoinGecko — sin key: https://api.coingecko.com/api/v3/simple/price
   - Precios crypto en USD (`vs_currencies=usd`)
   - Cruce ARS/CLP: se deriva usando `bitcoin` como moneda puente
     (`vs_currencies=usd,ars,clp`), ya que CoinGecko soporta ars/clp como
     vs_currency pero Frankfurter no. PEN no está soportado por ninguna
     de las dos — ver Pendientes Futuros.
3. Binance P2P API pública USDT/BOB:
   POST https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search
   body: {"fiat":"BOB","asset":"USDT","tradeType":"BUY","page":1,"rows":10}
   (mismo endpoint para Bybit vía su API pública equivalente)
4. BCB scraping TCO oficial: https://www.bcb.gob.bo/tco_reporte_ultima_cotizacion.php
   (implementado contra periodos.php — ver api/_lib/bcb.ts)

## Arquitectura Vercel (implementada)
- Frontend: React SPA en /src
- API serverless en /api/*.ts
  - /api/exchange-rates.ts — fiat via Frankfurter
  - /api/crypto-rates.ts — crypto via CoinGecko + cruce ARS/CLP + BOB derivado del TCO BCB
  - /api/p2p-rates.ts — USDT/BOB via Binance P2P + Bybit P2P
  - /api/bcb-rate.ts — TCO oficial via bcb.gob.bo
  - /api/bcb-history.ts — histórico TCO oficial
- vercel.json con rewrites configurado

## MÓDULOS (todos completados)

### MÓDULO 1 — BOB Dashboard ✅ (src/components/BobDashboard.tsx)
- TCO oficial BCB del día (dato real, no hardcodeado)
- Precio USDT en tiempo real: Binance P2P, Bybit P2P
- Brecha entre TCO oficial y mejor precio P2P
- Calculadora: input BOB output USDT y viceversa
- Actualización automática cada 60 segundos

### MÓDULO 2 — Conversor Crypto/Fiat ✅ (src/components/Converter.tsx)
- Pares prioritarios Bolivia: USDT/BOB, BTC/BOB, ETH/BOB, BNB/BOB, SOL/BOB
- Eliminados: bob_parallel hardcodeado, factor 1.3204, OFFICIAL_BOB=6.96
- BOB real desde TCO BCB; ARS/CLP reales vía cruce CoinGecko; BRL/MXN vía Frankfurter
- Gráfico histórico del TCO: conservado
- Descarga CSV: conservada

### MÓDULO 3 — Comparador de Exchanges ✅ (integrado dentro de Converter.tsx)
Nota: en vez de un tab separado "Exchanges" (plan original), el comparador P2P
("Mejores Tasas P2P en Vivo") quedó integrado dentro del tab Conversor, con
Binance P2P + Bybit P2P + card de precio promedio. OKX se probó y se eliminó
por falta de liquidez/datos confiables. BingX no se implementó (sin API
pública gratuita evaluada aún).

### MÓDULO 4 — PDF Suite ✅ (src/components/Compressor.tsx + ToolInterface.tsx)
- Mantenidas: comprimir, merge, split, rotar, marca de agua, reordenar, extraer, imagen a PDF
- Word a PDF: eliminado el truncado de 2000 caracteres, ahora pagina el documento completo
- protectPDF eliminado del menú (cifraba falsamente) + aviso visible en la UI
- pdfToImages: muestra mensaje claro "no disponible en esta versión" en vez de devolver el PDF original

## BUGS CRÍTICOS (todos resueltos)
1. ✅ Eliminado BASE_PARALLEL_FACTOR = 1.3204
2. ✅ Eliminado OFFICIAL_BOB = 6.96
3. ✅ Eliminado bloque p2pExchanges con factores fijos en server.ts
4. ✅ protectPDF engañaba al usuario — eliminado del menú
5. ✅ pdfToImages devolvía el PDF original sin avisar — corregido con mensaje claro

## NAVEGACIÓN FINAL
Tabs: BOB Hoy (default) | Conversor | PDF Suite
Metodología: accesible como link en el footer (no ocupa tab de navegación principal)

## ORDEN DE EJECUCIÓN (completado)
Fase 1: ✅ Arquitectura Vercel (vercel.json + /api serverless)
Fase 2: ✅ /api/bcb-rate.ts y /api/p2p-rates.ts
Fase 3: ✅ Módulo 1 — BOB Dashboard
Fase 4: ✅ Módulo 2 — Conversor
Fase 5: ✅ Módulo 3 — Comparador de Exchanges (integrado en Conversor) + Fase 5c (ARS/CLP reales, PEN eliminado)
Fase 6: ✅ Módulo 4 — PDF Suite
Fase 7: ✅ Navegación final App.tsx
Fase 8: ✅ tsc --noEmit + revisión final + verificación de endpoints en producción

## RESTRICCIONES
- NUNCA datos hardcodeados para tasas de cambio
- NUNCA hacer git push — solo commits locales
- Confirmar antes de cada fase
- tsc --noEmit después de cada fase
- Todos los datos financieros con timestamp visible
- Siempre mostrar fuente del dato (BCB, Binance P2P, Bybit P2P, CoinGecko, Frankfurter)

## Pendientes Futuros
- **Bitget P2P**: agregar como exchange adicional en el comparador cuando tenga
  una API pública documentada y estable (no evaluada aún).
- **PEN (Sol peruano)**: no tiene fuente gratuita real hoy — ni Frankfurter (ECB)
  ni CoinGecko (`/simple/supported_vs_currencies`) lo soportan. Reintroducir en
  "Otras Monedas Latam" y en el selector del conversor apenas exista una API
  gratuita confiable para USD/PEN.
- **Histórico P2P**: hoy solo existe histórico para el TCO oficial BCB
  (/api/bcb-history). Falta persistir series de tiempo de Binance/Bybit P2P
  (requiere algún tipo de almacenamiento — no hay endpoint histórico gratuito
  de terceros para P2P) para poder graficar la evolución del spread P2P vs. oficial.

## Estado actual: Fases 1-8 completadas.
Producción: https://duotools-silk.vercel.app
Repo: https://github.com/OMcescon/duotools
Todos los endpoints serverless verificados respondiendo en producción (bcb-rate,
bcb-history, exchange-rates, crypto-rates, p2p-rates). tsc --noEmit limpio.
