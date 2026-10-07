# Kalceto

The public site is at [https://amerelezi2025.github.io/kalceto-shkoder/](https://amerelezi2025.github.io/kalceto-shkoder/).

Login codes are sent by the hosted Kalceto server at [https://kalceto-shkoder.onrender.com](https://kalceto-shkoder.onrender.com). Share either link; GitHub Pages uses that server for sign-in.

## Run login locally

1. Copy `.env.example` to `.env`.
2. Put your Gmail address in `GMAIL_USER`.
3. Create a Google [App Password](https://myaccount.google.com/apppasswords) and put it in `GMAIL_APP_PASSWORD`.
4. Install and start the server:

```bash
npm install
npm start
```

5. Open [http://localhost:4173](http://localhost:4173), choose **Sign in**, enter an email, then **Create account** the first time. Kalceto checks whether that email already has an account, emails a 6-digit code, and signs you in after you confirm it.

## Updating content

- Replace the photo names in the `images` folder: `hero.jpg`, `gallery-1.jpg`, `kalceto-1.jpg`, and `team-1.jpg` through `team-4.jpg`.
- Edit the `players` and `pitches` lists at the top of `app.js` to add real people and pitches.
- Replace each placeholder `map: "#"` with the corresponding Google Maps URL.
