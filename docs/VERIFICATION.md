# Offizielle Android-APK nachbauen und prüfen

## Referenz: Android 1.0.3 (5)

Der neue öffentliche Snapshot entspricht dem App-Quellstand des offiziellen
Downloads. Dokumentation und Build-Hilfen wurden für die Veröffentlichung
ergänzt; die Spieleroberfläche und die native Runtime sind unverändert.
Die bisherige private Git-Historie ist nicht enthalten.

Die maschinenlesbaren Referenzdaten stehen in
[`releases/android-1.0.3-5.json`](../releases/android-1.0.3-5.json).

| Eigenschaft | Wert |
| --- | --- |
| Öffentlicher Quellstand | Tag `android-1.0.3-5` |
| App-ID | `de.manhunt.game` |
| Version | `1.0.3`, Versionscode `5` |
| Offizieller Download | <https://in-the-zone.de/downloads/in-the-zone.apk> |
| SHA-256 der offiziellen APK | `fc7425a3833387859879111cdc688527dc68c9302c09bb6fdcb9ccc2fffac575` |
| SHA-256 des Signierzertifikats | `b5d904e58514d32994281bc91a38869d40b25afbb83a9175b6d93dc239180ade` |

Die Referenzwerte wurden am 18.11.2026 mit dem tatsächlichen Website-Download
abgeglichen. Der Nachbau mit den hier dokumentierten Skripten ergab nach
Übernahme der öffentlichen Signatur exakt dieselbe vollständige APK und eine
gültige v2-Signatur. Das erzeugte
[Prüfergebnis](../releases/android-1.0.3-5.verification.json) liegt ebenfalls bei.

## Schritte für eine unabhängige Prüfung

Ein frischer Checkout vermeidet lokale Änderungen und zusätzliche `.env`-Dateien.
Verwende auf Linux mit Bash und Docker:

```sh
git clone --branch android-1.0.3-5 https://github.com/Harvara/In-the-Zone-App.git
cd In-the-Zone-App
MANHUNT_VERSION_CODE=5 MANHUNT_VERSION_NAME=1.0.3 bash scripts/build-unsigned.sh
bash scripts/verify-release.sh
```

Das Buildskript führt `npm ci`, die Frontendtests, den Release-Web-Build,
Capacitor-Sync, einen sauberen Android-App-Build, die Release-Java-Tests und
Android-Lint aus. Es übergibt ausschließlich Version und die Anweisung zum
unsignierten Build; kein Keystore wird eingebunden.

Das Prüfskript baut bzw. verwendet das lokale Build-Image, lädt den offiziellen
Download und liefert bei Erfolg JSON mit `result: "PASS"`,
`signature_verified: true` und `byte_identical: true`. Jede Abweichung beendet
die Prüfung mit einem Fehler. Keine APK-Dateiinhalte werden beim vollständigen
Dateivergleich ausgenommen.

Die Website-URL kann später eine neuere Version ausliefern. In diesem Fall
muss die Prüfung für diesen alten Tag fehlschlagen. Eine archivierte offizielle
APK dieser Version kann als zweites Argument übergeben werden:

```sh
bash scripts/verify-release.sh artifacts/in-the-zone-5-unsigned.apk /pfad/zur/offiziellen-1.0.3.apk
```

Die gespeicherte Prüfsumme und der Zertifikatsfingerabdruck werden dabei weiterhin
geprüft. Für zukünftige Veröffentlichungen sollte die offizielle APK zusätzlich
als versioniertes GitHub-Release-Asset erhalten bleiben.

## Warum der geheime Schlüssel nicht benötigt wird

Der private Schlüssel wird nur benötigt, um **neue** offizielle APKs zu
signieren. Signatur und Zertifikat der bereits veröffentlichten APK sind
öffentlich. `apksigcopier` überträgt diese Signatur auf den eigenen Nachbau.
`apksigner` überprüft anschließend, ob sie zu dessen Inhalt passt. Das kann bei
einem veränderten signierten Inhalt nicht erfolgreich sein.

Zusätzlich verlangt unser Prüfskript, dass die rekonstruierte Datei exakt die
SHA-256-Prüfsumme der offiziellen APK besitzt. So werden auch Unterschiede im
APK-Container erkannt. Mit einem eigenen Schlüssel signierte Debug-Builds
sind für diesen Vergleich ungeeignet: Release-Modus, Versionsnummern und
Einstellungen müssen zur Referenz passen.

Hintergrund: [F-Droid: Reproducible Builds](https://f-droid.org/en/docs/Reproducible_Builds/),
[Android: apksigner](https://developer.android.com/tools/apksigner),
[apksigcopier](https://github.com/obfusk/apksigcopier).

## Build-Umgebung

Die Skripte verwenden Linux/AMD64-Container mit festgehaltenen Images bzw.
Werkzeugversionen:

| Werkzeug | Referenz |
| --- | --- |
| Node-Image | `node@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53` |
| JDK-Basisimage | Temurin `21.0.13+9`, Digest in `infra/android.Dockerfile` |
| Android Command-Line Tools | `13114758` |
| Android-Plattform | API `36` |
| Android Build Tools / APK-Prüfer | `35.0.0` / `36.0.0` |
| Android Gradle Plugin | `8.13.0` |
| Gradle | `8.14.3`, ZIP-Prüfsumme im Wrapper festgehalten |
| npm-Abhängigkeiten | Versionen und Integritätswerte aus `package-lock.json` |
| Signaturübertragung | `apksigcopier 1.1.1`, Wheel-SHA-256 festgehalten |

Android-SDK-, Maven- und Ubuntu-Paketquellen werden beim ersten Build benötigt.
Das ist keine vollständig archivierte, netzwerkunabhängige Build-Umgebung.
Die Prüfung bestätigt konkret die Übereinstimmung des erzeugten Ergebnisses;
das bloße Festlegen von Versionen würde diese noch nicht nachweisen.

## Was die Prüfung aussagt

Ein erfolgreicher unabhängiger Nachbau belegt die Übereinstimmung des
veröffentlichten Quellstands mit dieser APK, unter Vertrauen in die verwendeten
Compiler, Werkzeuge und Abhängigkeiten. Die Zertifikatsprüfung identifiziert
den Signierschlüssel anhand des hier veröffentlichten Fingerabdrucks.
Dieser muss über eine vertrauenswürdige Quelle bezogen werden.

Weder eine Prüfsumme allein noch ein Signierzertifikat beweisen, dass ein
Programm aus einem bestimmten Quellcode gebaut wurde. Deshalb wird hier der
tatsächliche Nachbau geprüft. Aussagen über Datenschutz oder Fehlerfreiheit
brauchen darüber hinaus eine inhaltliche Prüfung. Das Backend und externe
Kartendienste sind nicht Bestandteil des APK-Nachweises.

## Künftige offizielle Releases

Vor jedem Release einen öffentlichen Quellstand taggen, Versionsname und
Versionscode festhalten und beide Builds aus genau diesem Stand erstellen:
den offiziellen signierten Build und den unabhängigen unsignierten Nachbau.
Den privaten Keystore dabei weiterhin außerhalb des Repositories halten.

Eine neue Referenzdatei mit APK-Prüfsumme und Zertifikatsfingerabdruck hinzufügen
und den identischen Vergleich ausführen. Das Python-Prüfskript unterstützt
dafür `--reference PFAD`. Den öffentlichen Tag, die APK und das Prüfergebnis
gemeinsam versioniert veröffentlichen. Für jede neue Version muss der Nachweis
erneut gelingen; das Ergebnis für 1.0.3 gilt nicht automatisch für spätere APKs.
