package de.manhunt.game;
import org.junit.Test;
import static org.junit.Assert.*;
public class ServerValidationTest {
    @Test public void allowsHttpsAndPrivateDebugServers() {
        assertTrue(GameHttp.allowedServer("https://game.example.org"));
        assertTrue(GameHttp.allowedServer("http://10.0.2.2:8080"));
        assertTrue(GameHttp.allowedServer("http://192.168.1.2:8080"));
    }
    @Test public void rejectsCredentialsPathsAndPublicPlaintext() {
        assertFalse(GameHttp.allowedServer("http://example.org"));
        assertFalse(GameHttp.allowedServer("https://user:secret@example.org"));
        assertFalse(GameHttp.allowedServer("https://example.org/api"));
        assertFalse(GameHttp.allowedServer("https://example.org?token=secret"));
        assertFalse(GameHttp.allowedServer("ftp://example.org"));
    }
}
