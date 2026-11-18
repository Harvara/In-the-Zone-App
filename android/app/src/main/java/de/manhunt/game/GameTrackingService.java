package de.manhunt.game;
import android.Manifest;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import androidx.core.content.ContextCompat;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONObject;

/** GPS, HTTP and notifications run natively; none depend on a WebView timer. */
public class GameTrackingService extends Service implements LocationListener {
    static volatile boolean running;
    static volatile long lastPositionAt, lastSyncAt;
    static volatile String error = "";
    private RuntimeStorage storage;
    private GameNotifications notifications;
    private StateNotifications events;
    private LocationManager locations;
    private ScheduledExecutorService worker;
    private PowerManager.WakeLock wakeLock;
    private volatile Location latest;
    private long sentLocationNanos, sequence;
    private volatile boolean stopping;
    @Override public void onCreate() {
        super.onCreate(); storage = new RuntimeStorage(this); notifications = new GameNotifications(this); events = new StateNotifications(storage, notifications);
        locations = getSystemService(LocationManager.class);
    }
    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (running) return START_NOT_STICKY;
        try {
            if (storage.load() == null) { stopSelf(); return START_NOT_STICKY; }
            if (Build.VERSION.SDK_INT >= 29) startForeground(1, notifications.ongoing("GPS wird verbunden. Tippen öffnet dein Spiel."), ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            else startForeground(1, notifications.ongoing("GPS wird verbunden. Tippen öffnet dein Spiel."));
            running = true; stopping = false; error = ""; lastPositionAt = 0; lastSyncAt = 0;
            boolean fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
            for (String provider : locations.getAllProviders()) {
                if (provider.equals(LocationManager.GPS_PROVIDER) && fine || provider.equals(LocationManager.NETWORK_PROVIDER)) locations.requestLocationUpdates(provider, 3000, 0, this, Looper.getMainLooper());
            }
            wakeLock = getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Manhunt:ActiveGame");
            wakeLock.setReferenceCounted(false); wakeLock.acquire(TimeUnit.MINUTES.toMillis(15));
            worker = Executors.newSingleThreadScheduledExecutor(); worker.scheduleWithFixedDelay(this::tick, 0, 3, TimeUnit.SECONDS);
        } catch (Exception e) { error = "Ortung konnte nicht starten. Prüfe GPS und Standortberechtigung."; stopSelf(); }
        // A force-stop or killed process requires a visible app start, avoiding background-start permission violations.
        return START_NOT_STICKY;
    }
    private void tick() {
        if (stopping) return;
        // Renew the bounded CPU lock while actively participating; release immediately on stop.
        if (wakeLock != null) wakeLock.acquire(TimeUnit.MINUTES.toMillis(15));
        try {
            JSONObject access = storage.load(); if (access == null) { stopSelf(); return; }
            GameHttp http = new GameHttp(); GameHttp.Response response = http.request(access, "/play/state", null);
            if (response.terminal()) { terminateAccess(); return; }
            if (response.status != 200) throw new IllegalStateException("Status unavailable");
            if (stopping) return;
            JSONObject session = response.body.getJSONObject("session");
            if (session.optString("status").equals("closed")) { terminateAccess(); return; }
            JSONObject own = null; JSONArray players = session.getJSONArray("participants");
            for (int i = 0; i < players.length(); ++i) { JSONObject p = players.getJSONObject(i); if (p.optString("id").equals(access.getString("participantId"))) own = p; }
            events.process(session, own); lastSyncAt = System.currentTimeMillis(); error = "";
            if (own == null || session.optString("status").equals("finished") || own.optString("state").equals("eliminated")) { stopSelf(); return; }
            sequence = Math.max(sequence, own.optLong("sequence", 0));
            Location point = latest;
            long age = point == null ? Long.MAX_VALUE : (SystemClock.elapsedRealtimeNanos() - point.getElapsedRealtimeNanos()) / 1000000;
            if (point != null && age < 15000 && point.getElapsedRealtimeNanos() > sentLocationNanos && !stopping) {
                sequence = Math.max(System.currentTimeMillis(), sequence + 1);
                JSONObject input = new JSONObject().put("longitude", point.getLongitude()).put("latitude", point.getLatitude()).put("accuracy", (double) point.getAccuracy()).put("sequence", sequence);
                GameHttp.Response sent = http.request(access, "/play/positions", input);
                if (sent.terminal()) { terminateAccess(); return; }
                if (sent.status == 409) { stopSelf(); return; }
                if (sent.status != 200) throw new IllegalStateException("Position unavailable");
                sentLocationNanos = point.getElapsedRealtimeNanos(); lastPositionAt = System.currentTimeMillis();
            }
            String message = point == null || age >= 15000 ? "Warte auf aktuelles GPS. Prüfe bei Bedarf die Standort-Einstellungen." : "Standortübertragung aktiv. Tippen öffnet dein Spiel.";
            notifications.update(message);
        } catch (Exception e) {
            if (!stopping) { error = "Keine Verbindung zum Spielserver. Es wird automatisch erneut versucht."; notifications.update(error); }
        }
    }
    private void terminateAccess() { storage.clear(); notifications.alert("closed", "Spiel offiziell beendet", "Dein Spielzugang wurde geschlossen."); stopSelf(); }
    @Override public void onLocationChanged(Location location) { if (!stopping && Math.abs(location.getLatitude()) <= 85) latest = new Location(location); }
    @Override public void onProviderEnabled(String provider) {}
    @Override public void onProviderDisabled(String provider) { error = "GPS ist ausgeschaltet oder nicht verfügbar."; }
    @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onDestroy() {
        stopping = true; running = false;
        if (worker != null) worker.shutdownNow();
        if (locations != null) locations.removeUpdates(this);
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        stopForeground(STOP_FOREGROUND_REMOVE); super.onDestroy();
    }
}
