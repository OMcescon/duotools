# DuoTools — Briefing Completo de Renovación

## Descripción del Producto
Herramienta financiera SaaS gratuita dirigida al usuario boliviano moderno.
Propuesta de valor: Compara dónde te conviene más comprar o vender dólares y crypto hoy en Bolivia.

## Stack
React + TypeScript + Vite + Tailwind CSS
Deploy objetivo: Vercel (serverless functions para APIs)
Diseño actual: dark theme glassmorphism — CONSERVAR estilo visual

## Contexto Bolivia 2026 (CRÍTICO)
- Las criptomonedas son legales en Bolivia desde junio 2024
- Bolivia opera flotación administrada desde 29 junio 2026
- TCO oficial BCB hoy: ~12.32 Bs por USD (fluctúa diariamente)
- Ya NO existe dólar paralelo como antes — brecha pequeña con P2P
- USDT es la crypto más usada en Bolivia como alternativa al dólar
- Exchanges con liquidez real en BOB: Binance P2P, Bybit P2P, OKX P2P
- Métodos de pago: transferencia bancaria boliviana + Tigo Money
- Bancos: Banco Unión, BNB, BancoSol, BCP, Bisa, Banco Mercantil

## APIs GRATUITAS — Solo estas, sin costo
1. Frankfurter.dev — fiat sin key: https://api.frankfurter.dev/v2/latest?base=USD
2. CoinGecko — crypto sin key: https://api.coingecko.com/api/v3/simple/price
3. Binance P2P API pública USDT/BOB:
   POST https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search
   body: {"fiat":"BOB","asset":"USDT","tradeType":"BUY","page":1,"rows":10}
4. BCB scraping TCO oficial: https://www.bcb.gob.bo/tco_reporte_ultima_cotizacion.php

## Arquitectura Objetivo Vercel
- Frontend: React SPA en /src
- API serverless en /api/*.ts
  - /api/exchange-rates.ts — fiat via Frankfurter
  - /api/crypto-rates.ts — crypto via CoinGecko
  - /api/p2p-rates.ts — USDT/BOB via Binance/Bybit/OKX P2P
  - /api/bcb-rate.ts — TCO oficial via bcb.gob.bo
- vercel.json con rewrites configurado

## MÓDULOS

### MÓDULO 1 — BOB Dashboard (ESTRELLA — construir primero)
- TCO oficial BCB del día (dato real, no hardcodeado)
- Precio USDT en tiempo real: Binance P2P, Bybit P2P, OKX P2P
- Brecha entre TCO oficial y mejor precio P2P
- Calculadora: input BOB output USDT y viceversa
- Actualización automática cada 60 segundos

### MÓDULO 2 — Conversor Crypto/Fiat (RENOVAR Converter.tsx)
- Pares prioritarios Bolivia: USDT/BOB, BTC/BOB, ETH/BOB, BNB/BOB, SOL/BOB
- Eliminar: bob_parallel hardcodeado, factor 1.3204, OFFICIAL_BOB=6.96
- Reemplazar con BOB real desde Frankfurter + TCO BCB
- Gráfico histórico: CONSERVAR
- Descarga CSV: CONSERVAR

### MÓDULO 3 — Comparador de Exchanges (NUEVO)
- Tabla: Binance P2P, Bybit P2P, OKX P2P, BingX
- Por exchange: precio compra/venta USDT en BOB, spread, comisión, métodos pago
- Ordenar por mejor precio de compra
- Badge del mejor precio hoy
- Actualización cada 60 segundos

### MÓDULO 4 — PDF Suite (CORREGIR Compressor.tsx)
- Mantener: comprimir, merge, split, rotar, marca de agua, reordenar, extraer, imagen a PDF
- Corregir Word a PDF: eliminar truncado de 2000 caracteres
- Eliminar protectPDF del menú con aviso claro
- Corregir pdfToImages: mostrar mensaje claro de no disponible

## BUGS CRÍTICOS
1. Eliminar BASE_PARALLEL_FACTOR = 1.3204
2. Eliminar OFFICIAL_BOB = 6.96
3. Eliminar bloque p2pExchanges con factores fijos en server.ts
4. protectPDF engaña al usuario — eliminar del menú
5. pdfToImages devuelve PDF original sin avisar — corregir

## NAVEGACIÓN RENOVADA
Tabs: BOB Hoy (default) | Conversor | Exchanges | PDF Suite

## ORDEN DE EJECUCIÓN
Fase 1: Configurar arquitectura Vercel (vercel.json + /api serverless)
Fase 2: Construir /api/bcb-rate.ts y /api/p2p-rates.ts
Fase 3: Construir Módulo 1 — BOB Dashboard
Fase 4: Renovar Módulo 2 — Conversor
Fase 5: Construir Módulo 3 — Comparador de Exchanges
Fase 6: Corregir Módulo 4 — PDF Suite
Fase 7: Renovar navegación App.tsx
Fase 8: tsc --noEmit + revisión final

## RESTRICCIONES
- NUNCA datos hardcodeados para tasas de cambio
- NUNCA hacer git push — solo commits locales
- Confirmar antes de cada fase
- tsc --noEmit después de cada fase
- Todos los datos financieros con timestamp visible
- Siempre mostrar fuente del dato (BCB, Binance P2P, CoinGecko)
