package de.manhunt.game;
import java.util.ArrayList;
import java.util.List;
/** Stable identities let persisted notification deduplication cover polling and service restarts. */
final class SpeedhuntPingNotices {
    static final class Notice {
        final String key, message;
        Notice(String key, String message) { this.key = key; this.message = message; }
    }
    static List<Notice> published(String huntId, int count, int limit) {
        List<Notice> result = new ArrayList<>();
        if (huntId.isEmpty() || limit < 1) return result;
        // Ping 1 is automatic and already covered by the Speedhunt-start notification.
        for (int number = 2; number <= Math.min(count, limit); ++number) {
            result.add(new Notice("speed-ping:" + huntId + ":" + number, "Speedhunt: Ping " + number + "/" + limit + " wurde angefordert."));
        }
        return result;
    }
}
