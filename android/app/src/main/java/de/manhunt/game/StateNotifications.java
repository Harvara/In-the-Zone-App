package de.manhunt.game;
import org.json.JSONArray;
import org.json.JSONObject;
final class StateNotifications {
    private final RuntimeStorage storage;
    private final GameNotifications notifications;
    StateNotifications(RuntimeStorage storage, GameNotifications notifications) { this.storage = storage; this.notifications = notifications; }
    private void once(String key, String title, String message) { if (storage.markOnce(key)) notifications.alert(key, title, message); }
    void process(JSONObject session, JSONObject own) {
        String status = session.optString("status"), phase = session.optString("phase");
        if (status.equals("running")) once("started", "In the Zone gestartet", phase.equals("headstart") ? "Der Vorsprung läuft. Die Jagd beginnt mit dem ersten Silent-Ping." : "Die Jagd läuft.");
        if (phase.equals("hunt")) once("hunt", "Die Jagd beginnt", "Der erste Silent-Ping ist erreicht. Fänge und Speedhunts sind jetzt freigegeben.");
        JSONObject hunt = session.optJSONObject("speedhunt");
        if (hunt != null && hunt.optString("status").equals("active")) {
            String target = hunt.optString("targetId", ""), name = "";
            JSONArray players = session.optJSONArray("participants");
            for (int i = 0; players != null && i < players.length(); ++i) { JSONObject p = players.optJSONObject(i); if (p != null && p.optString("id").equals(target)) name = p.optString("name"); }
            once("speed:" + hunt.optString("id"), "Speedhunt gestartet", name.isEmpty() ? "Ein Speedhunt läuft. Das Ziel bleibt verborgen." : "Ziel: " + name);
        }
        if (hunt != null && status.equals("running")) {
            for (SpeedhuntPingNotices.Notice ping : SpeedhuntPingNotices.published(hunt.optString("id"), hunt.optInt("pingCount"), hunt.optInt("pingLimit"))) {
                once(ping.key, "Speedhunt-Ping angefordert", ping.message);
            }
        }
        JSONArray warnings = session.optJSONArray("warnings");
        for (int i = 0; warnings != null && i < warnings.length(); ++i) {
            JSONObject warning = warnings.optJSONObject(i); if (warning == null) continue;
            boolean outside = warning.optString("type").equals("outside"), issued = warning.optBoolean("warned");
            String key = "warning:" + warning.optString("id") + ":" + warning.optString("startedAt") + ":" + issued;
            once(key, outside ? "Spielfeld verlassen" : "Clusterwarnung", outside ? "Bitte kehre ins Spielfeld zurück." : issued ? "Die Trennfrist ist abgelaufen. Bitte halte Abstand." : "Du bist zu nah bei einem anderen Gejagten. Bitte halte Abstand.");
        }
        JSONArray catches = session.optJSONArray("catches");
        for (int i = 0; catches != null && i < catches.length(); ++i) {
            JSONObject report = catches.optJSONObject(i);
            if (report != null && report.optString("targetId").equals(session.optString("me")) && report.optString("status").equals("pending")) once("catch:" + report.optString("id"), "Fang gemeldet", "Öffne die App und bestätige oder lehne den Fang ab.");
        }
        if (own != null && own.optString("state").equals("eliminated")) once("caught", "Fang bestätigt", "Du bist ausgeschieden. Deine Standortübertragung wird beendet.");
        if (status.equals("finished")) once("finished", "Spiel beendet", "Die Standortübertragung ist beendet. Das Ergebnis findest du in der App.");
    }
}
