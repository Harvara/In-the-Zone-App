package de.manhunt.game;
import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.lifecycle.Lifecycle;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONObject;

@CapacitorPlugin(name = "GameRuntime", permissions = {
    @Permission(alias = "location", strings = {Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION}),
    @Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})
})
public class GameRuntimePlugin extends Plugin {
    private RuntimeStorage storage() { return new RuntimeStorage(getContext()); }
    @PluginMethod public void load(PluginCall call) {
        try { JSObject result = new JSObject(); JSONObject access = storage().load(); if (access != null) result.put("credentials", access); call.resolve(result); }
        catch (Exception e) { storage().clear(); call.reject("Der gespeicherte Zugang ist nicht mehr lesbar. Bitte erneut beitreten."); }
    }
    @PluginMethod public void save(PluginCall call) {
        try {
            JSONObject input = call.getData();
            if (!GameHttp.allowedServer(input.getString("server")) || !input.getString("token").matches("[a-f0-9]{64}") || !input.getString("participantId").matches("[a-f0-9]{32}") || !input.getString("sessionId").matches("[a-f0-9]{32}")) { call.reject("Ungültiger Spielzugang."); return; }
            storage().save(input); call.resolve();
        } catch (Exception e) { call.reject("Der Spielzugang konnte nicht gespeichert werden."); }
    }
    @PluginMethod public void clear(PluginCall call) { getContext().stopService(new Intent(getContext(), GameTrackingService.class)); storage().clear(); call.resolve(); }
    private JSObject currentStatus() {
        JSObject result = new JSObject();
        boolean location = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        result.put("location", location); result.put("notifications", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
        result.put("batteryExempt", getContext().getSystemService(PowerManager.class).isIgnoringBatteryOptimizations(getContext().getPackageName()));
        result.put("running", GameTrackingService.running); result.put("lastPositionAt", GameTrackingService.lastPositionAt); result.put("lastSyncAt", GameTrackingService.lastSyncAt); result.put("error", GameTrackingService.error);
        return result;
    }
    @PluginMethod public void status(PluginCall call) { call.resolve(currentStatus()); }
    @PluginMethod public void requestAccess(PluginCall call) { requestPermissionForAliases(Build.VERSION.SDK_INT >= 33 ? new String[]{"location", "notifications"} : new String[]{"location"}, call, "accessResult"); }
    @PermissionCallback private void accessResult(PluginCall call) { call.resolve(currentStatus()); }
    @PluginMethod public void openSettings(PluginCall call) {
        String page = call.getString("page", "app");
        Intent intent = new Intent(page.equals("battery") ? Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS : page.equals("location") ? Settings.ACTION_LOCATION_SOURCE_SETTINGS : Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        if (!page.equals("battery") && !page.equals("location")) intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        try { getActivity().startActivity(intent); call.resolve(); } catch (Exception e) { call.reject("Einstellungen auf diesem Gerät nicht verfügbar."); }
    }
    @PluginMethod public void start(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (!getActivity().getLifecycle().getCurrentState().isAtLeast(Lifecycle.State.STARTED)) { call.reject("Öffne die App, um die Ortung zu starten."); return; }
            if (!currentStatus().optBoolean("location")) { call.reject("Bitte zuerst den Standort freigeben."); return; }
            try { ContextCompat.startForegroundService(getContext(), new Intent(getContext(), GameTrackingService.class)); call.resolve(); }
            catch (Exception e) { call.reject("Android hat den Start der Ortung abgewiesen. Öffne die App und prüfe die Berechtigungen."); }
        });
    }
    @PluginMethod public void stop(PluginCall call) { getContext().stopService(new Intent(getContext(), GameTrackingService.class)); call.resolve(); }
}
