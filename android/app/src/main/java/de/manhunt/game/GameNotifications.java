package de.manhunt.game;
import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
final class GameNotifications {
    private final Context context;
    private final NotificationManager manager;
    GameNotifications(Context context) {
        this.context = context; manager = context.getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26) {
            manager.createNotificationChannel(new NotificationChannel("tracking", "Laufende Standortübertragung", NotificationManager.IMPORTANCE_LOW));
            manager.createNotificationChannel(new NotificationChannel("game", "Spielereignisse", NotificationManager.IMPORTANCE_HIGH));
        }
    }
    private NotificationCompat.Builder builder(String channel, String title, String message) {
        Intent open = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(context, channel).setSmallIcon(R.drawable.ic_notification).setContentTitle(title).setContentText(message).setStyle(new NotificationCompat.BigTextStyle().bigText(message)).setContentIntent(pending).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setColor(0xff86ac4d).setOnlyAlertOnce(true);
    }
    Notification ongoing(String message) { return builder("tracking", "In the Zone läuft", message).setOngoing(true).setCategory(NotificationCompat.CATEGORY_SERVICE).build(); }
    void update(String message) { manager.notify(1, ongoing(message)); }
    void alert(String key, String title, String message) {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        manager.notify(100 + (key.hashCode() & 0x3fffffff), builder("game", title, message).setAutoCancel(true).build());
    }
}
