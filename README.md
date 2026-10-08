# Kalceto Shkodër ⚽ 🇦🇱

Uebsajti publik gjendet në: [https://amerelezi2025.github.io/kalceto-shkoder/](https://amerelezi2025.github.io/kalceto-shkoder/).

Serveri dhe sistemi i verifikimit me SMS ndodhet në [https://kalceto-shkoder.onrender.com](https://kalceto-shkoder.onrender.com).

## Sistemi i Hyrjes me Numër Telefoni (SMS OTP)

Platforma mbështet hyrjen me numra celularë shqiptarë (**Vodafone**, **ONE Albania** - prefiksat `067`, `068`, `069`, `066` / `+355`):

1. **Vendosja e numrit**: Përdoruesi shkruan numrin (p.sh. `069 123 4567` ose `+355 68 123 4567`). Numri validohet dhe formatohet automatikisht sipas standardit kombëtar shqiptar.
2. **Kodi 6-shifror me SMS**: Gjenerohet kodi OTP 6-shifror me vlefshmëri 10 minuta.
3. **Simuluesi & Njoftimi i SMS**: Në ekran shfaqet një kartë interaktive SMS me opsionin **"Plotëso Kodin ⚡"** për testim të menjëhershëm si në uebsajtet profesionale.
4. **Verifikimi me 6 kuti OTP**: Kutitë e kodit kalojnë automatikisht te shifra tjetër, mbështesin paste (kopjim/ngjitje) të menjëhershme dhe konfirmojnë hyrjen.
5. **Profili i Lojtarit**: Pas verifikimit, lojtari zgjedh pozicionin (Mesfushë, Sulmues, Mbrojtës, Portier) dhe zonën në Shkodër (Parrucë, Rus, Perash, Bahçallëk, Kiras, Qendër, etj.).

## Nisja lokale e serverit

```bash
npm install
npm start
```

Hapni shfletuesin në [http://localhost:4173](http://localhost:4173).

### Konfigurimi Opsional i SMS me Operatorë (Twilio / Carrier):
Në skedarin `.env`:
- `TWILIO_ACCOUNT_SID=...`
- `TWILIO_AUTH_TOKEN=...`
- `TWILIO_PHONE_NUMBER=...`
*(Nëse nuk vendosen, serveri e regjistron kodin në console dhe dërgon previewCode për testim të pandërprerë në uebsajt).*
