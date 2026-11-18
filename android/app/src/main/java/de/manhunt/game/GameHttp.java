package de.manhunt.game;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import org.json.JSONObject;
final class GameHttp {
    static final class Response {
        final int status; final JSONObject body;
        Response(int status, JSONObject body) { this.status = status; this.body = body; }
        boolean terminal() { return status == 401 || status == 410; }
    }
    static boolean allowedServer(String value) {
        try {
            URI uri = URI.create(value); String host = uri.getHost();
            if (host == null || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null || !(uri.getPath().isEmpty() || uri.getPath().equals("/"))) return false;
            return "https".equals(uri.getScheme()) || ("http".equals(uri.getScheme()) && (host.equals("localhost") || host.equals("127.0.0.1") || host.matches("10\\.\\d+\\.\\d+\\.\\d+|192\\.168\\.\\d+\\.\\d+|172\\.(1[6-9]|2\\d|3[01])\\.\\d+\\.\\d+")));
        } catch (Exception e) { return false; }
    }
    Response request(JSONObject access, String path, JSONObject body) throws Exception {
        String server = access.getString("server");
        if (!allowedServer(server)) throw new IllegalArgumentException("Ungültige Serveradresse.");
        HttpURLConnection connection = (HttpURLConnection) URI.create(server + "/api/v1" + path).toURL().openConnection();
        connection.setInstanceFollowRedirects(false); connection.setConnectTimeout(8000); connection.setReadTimeout(8000);
        connection.setRequestMethod(body == null ? "GET" : "POST"); connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Content-Type", "application/json"); connection.setRequestProperty("Authorization", "Bearer " + access.getString("token"));
        try {
            if (body != null) { connection.setDoOutput(true); try (var output = connection.getOutputStream()) { output.write(body.toString().getBytes(StandardCharsets.UTF_8)); } }
            int status = connection.getResponseCode();
            try (InputStream input = status >= 400 ? connection.getErrorStream() : connection.getInputStream()) {
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                if (input != null) {
                    byte[] buffer = new byte[8192]; int count;
                    while ((count = input.read(buffer)) != -1) { bytes.write(buffer, 0, count); if (bytes.size() > 16 * 1024 * 1024) throw new IllegalStateException("Serverantwort zu groß."); }
                }
                String content = input == null ? "{}" : new String(bytes.toByteArray(), StandardCharsets.UTF_8);
                return new Response(status, new JSONObject(content));
            }
        } finally { connection.disconnect(); }
    }
}
