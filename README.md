# In-the-Zone App

Die Spieler-App für **[In the Zone](https://in-the-zone.de)**, ein GPS-basiertes
Manhunt-Spiel: Gejagte und Jäger treten per Spielcode bei, sehen das Spielfeld
und veröffentlichte Positionsmeldungen und nutzen Spielaktionen wie Fake-Pings
und Speedhunts. Android erfasst den Standort während eines aktiven Spiels auch
bei gesperrtem Bildschirm über einen sichtbaren Vordergrunddienst.

Die App verwendet Vue 3, TypeScript, Leaflet und Capacitor mit einer nativen
Android-Runtime. Dieses Repository enthält den mobilen Client; Spielleitung,
Backend und Serverbetrieb sind nicht enthalten. Die App verbindet sich mit
`https://in-the-zone.de`. Android 7 / API 24 oder neuer ist erforderlich.

## Selbst bauen

Voraussetzungen: Git, Bash und Docker mit Linux-Containern. Die Skripte laden
Abhängigkeiten und Android-SDK-Komponenten und akzeptieren im Container die
Android-SDK-Lizenzen. Der erste Build benötigt entsprechend Zeit und Speicher.

```sh
git clone https://github.com/Harvara/In-the-Zone-App.git
cd In-the-Zone-App
bash scripts/build-apk.sh
```

Die installierbare Testversion liegt in `artifacts/in-the-zone-debug.apk`.
Sie wird mit einem eigenen Debug-Schlüssel signiert und kann eine vorhandene
offizielle Installation nicht aktualisieren.

## Offiziellen Download überprüfen

Für **Android 1.0.3 (Versionscode 5)** ist ein bytegenauer Nachbau der
[offiziellen APK](https://in-the-zone.de/downloads/in-the-zone.apk) geprüft.
Dafür wird **kein privater Signierschlüssel** benötigt:

```sh
git checkout android-1.0.3-5
MANHUNT_VERSION_CODE=5 MANHUNT_VERSION_NAME=1.0.3 bash scripts/build-unsigned.sh
bash scripts/verify-release.sh
```

Die Prüfung lädt die offizielle APK, prüft deren festgehaltene SHA-256-Prüfsumme
und Signierzertifikat, überträgt mit `apksigcopier` deren öffentliche Signatur
auf den eigenen Nachbau und prüft die Signatur und die vollständige Datei erneut.
Sie ist nur erfolgreich, wenn die rekonstruierte APK bytegenau dem Download
entspricht. Die unsignierte APK allein hat eine andere Dateiprüfsumme.

Details, Referenzwerte und Grenzen stehen in
[docs/VERIFICATION.md](docs/VERIFICATION.md). Das Ergebnis ist eine Aussage über
die APK und ihren veröffentlichten Quellcode; das Verhalten des Servers und
von Kartendiensten wird dadurch nicht überprüft.

## Entwicklung

Alternativ lokal mit Node.js 24, JDK 21 und Android-SDK 36 arbeiten:

```sh
npm ci
npm test
npm run build:release
npx cap sync android
```

`npm run dev` startet die Browseransicht auf `http://localhost:5173`.
Mit `MANHUNT_BACKEND=http://localhost:8080 npm run dev` lässt sich der
Entwicklungsproxy auf ein lokales Backend richten. Die native App verwendet
weiterhin die konfigurierte offizielle Domain. Optionale Kartenanbieter stehen
in [.env.example](.env.example); geänderte Build-Einstellungen können den
Abgleich mit der offiziellen APK verändern.

Das iOS-Projekt liegt unter `ios/` und benötigt macOS/Xcode. Die
iOS-Hintergrundortung und nativen Spielbenachrichtigungen sind noch nicht
implementiert; ein iOS-Release wird hier nicht angeboten.

## Veröffentlichung und Nutzungsrechte

Dieses Repository beginnt mit einem neuen Quellcode-Snapshot ohne die Historie
des bisherigen privaten Repositories. Signierschlüssel, Zugangsdaten und
interne Übergaben sind nicht Bestandteil dieser Veröffentlichung.

Der Code wird zur Einsicht und zum lokalen Nachbauen zur Überprüfung
veröffentlicht. Vorerst wird keine darüber hinausgehende Open-Source-Lizenz
erteilt. Abhängigkeiten unterliegen ihren jeweiligen Lizenzen.
