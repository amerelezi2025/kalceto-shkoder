# Kalceto Shkodër ⚽ 🇦🇱

Uebsajti publik gjendet në: [https://amerelezi2025.github.io/kalceto-shkoder/](https://amerelezi2025.github.io/kalceto-shkoder/).

Serveri dhe sistemi i hyrjes me email + fjalëkalim ndodhet në [https://kalceto-shkoder.onrender.com](https://kalceto-shkoder.onrender.com).

## Sistemi i Hyrjes me Email + Fjalëkalim

Platforma kërkon dy hapa për hyrje. Përdoruesi nuk futet në llogari vetëm me email ose vetëm me fjalëkalim:

1. **Vendosja e email-it**: Përdoruesi shkruan email-in në modalin e hyrjes.
2. **Linku i verifikimit**: Serveri dërgon email me butonin **Verify email**. Linku skadon pas 15 minutash.
3. **Fjalëkalimi pas verifikimit**: Vetëm pasi linku hapet, faqja shfaq hapin e fjalëkalimit.
4. **Profili i Lojtarit**: Pas hyrjes, lojtari plotëson emrin, pozicionin, nivelin dhe zonën në Shkodër.

## Nisja lokale e serverit

```bash
npm install
npm start
```

Hapni shfletuesin në [http://localhost:4173](http://localhost:4173).

### Konfigurimi i email-it:
Në skedarin `.env`:
- `GMAIL_USER=...`
- `GMAIL_APP_PASSWORD=...`
- `FRONTEND_ORIGIN=https://amerelezi2025.github.io/kalceto-shkoder`

Nëse Gmail nuk është konfiguruar gjatë zhvillimit lokal, serveri e shfaq linkun e verifikimit në console dhe e kthen si `previewLink` për testim.
