package de.manhunt.game;
import org.junit.Test;
import static org.junit.Assert.*;
public class SpeedhuntPingNoticesTest {
    @Test public void automaticPingDoesNotDuplicateStartNotice() { assertTrue(SpeedhuntPingNotices.published("hunt", 1, 3).isEmpty()); }
    @Test public void catchesUpEveryRequestedPingIncludingFinalPing() {
        var notices = SpeedhuntPingNotices.published("hunt", 3, 3);
        assertEquals(2, notices.size()); assertEquals("speed-ping:hunt:2", notices.get(0).key);
        assertEquals("Speedhunt: Ping 3/3 wurde angefordert.", notices.get(1).message);
    }
    @Test public void keysStayStableAcrossPollsButDifferForNewHunts() {
        assertEquals(SpeedhuntPingNotices.published("a", 2, 3).get(0).key, SpeedhuntPingNotices.published("a", 3, 3).get(0).key);
        assertNotEquals(SpeedhuntPingNotices.published("a", 2, 3).get(0).key, SpeedhuntPingNotices.published("b", 2, 3).get(0).key);
    }
}
