package ar.com.trucazo.capacitor.dev;

import static org.junit.Assert.*;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.json.JSONTokener;
import org.junit.Test;
import org.junit.runner.RunWith;

// Comprobador separado y firmado. Sólo durante instrumentación local por ADB;
// nunca se empaqueta en la app entregable ni habilita WebView debug.
@RunWith(AndroidJUnit4.class)
public class ReleaseAcceptanceTest {
    private MainActivity activity;
    private String evaluate(String script) throws Exception {
        var instrumentation = InstrumentationRegistry.getInstrumentation();
        var value = new AtomicReference<String>();
        var ready = new CountDownLatch(1);
        instrumentation.runOnMainSync(() -> activity.getBridge().getWebView().evaluateJavascript(script, result -> {
            value.set(result); ready.countDown();
        }));
        assertTrue("WebView no respondió", ready.await(10, TimeUnit.SECONDS));
        return value.get();
    }
    private String execute(String script) throws Exception {
        evaluate("window.__acceptanceResult=null;Promise.resolve().then(()=> (" + script + ")).then(value=>window.__acceptanceResult={value},()=>window.__acceptanceResult={error:'Falló el recorrido'});void 0");
        for (int i = 0; i < 600; i++) {
            String result = evaluate("JSON.stringify(window.__acceptanceResult)");
            Object parsed = new JSONTokener(result).nextValue();
            if (parsed instanceof String && !parsed.equals("null")) return (String) parsed;
            Thread.sleep(50);
        }
        return "{\"error\":\"El recorrido no terminó\"}";
    }
    private String line(BufferedInputStream input) throws Exception {
        var bytes = new ByteArrayOutputStream();
        for (int c; (c = input.read()) != -1;) {
            if (c == '\n') break;
            if (c != '\r') bytes.write(c);
            if (bytes.size() > 8192) throw new IllegalArgumentException("Cabecera demasiado larga");
        }
        return bytes.toString(StandardCharsets.UTF_8);
    }
    @Test public void acceptsSignedCandidate() throws Exception {
        var instrumentation = InstrumentationRegistry.getInstrumentation();
        var context = instrumentation.getTargetContext();
        assertEquals("ar.com.trucazo.app", context.getPackageName());
        assertEquals(0, context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE);
        var intent = new Intent().setClassName(context, MainActivity.class.getName()).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity = (MainActivity) instrumentation.startActivitySync(intent);
        assertFalse(activity.getBridge().getConfig().isWebContentsDebuggingEnabled());
        assertNull(activity.getBridge().getConfig().getServerUrl());
        String token = InstrumentationRegistry.getArguments().getString("acceptanceToken");
        assertNotNull(token); assertTrue(token.length() >= 32);
        try (var server = new ServerSocket(9237, 1, InetAddress.getByName("127.0.0.1"))) {
            server.setSoTimeout(1800000);
            boolean running = true;
            while (running) try (var socket = server.accept()) {
                socket.setSoTimeout(15000);
                var input = new BufferedInputStream(socket.getInputStream());
                String first = line(input), header;
                int length = 0; boolean authorized = false;
                while (!(header = line(input)).isEmpty()) {
                    if (header.toLowerCase().startsWith("content-length:")) length = Integer.parseInt(header.substring(15).trim());
                    if (header.equals("Authorization: Bearer " + token)) authorized = true;
                }
                assertTrue("Comprobador local sin autorización", authorized);
                assertTrue(length >= 0 && length <= 65536);
                byte[] body = input.readNBytes(length);
                String result;
                if (first.startsWith("POST /stop ")) { running = false; result = "{\"stopped\":true}"; }
                else {
                    assertTrue(first.startsWith("POST /evaluate "));
                    result = execute(new JSONObject(new String(body, StandardCharsets.UTF_8)).getString("script"));
                }
                byte[] response = result.getBytes(StandardCharsets.UTF_8);
                socket.getOutputStream().write(("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " + response.length + "\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.UTF_8));
                socket.getOutputStream().write(response); socket.getOutputStream().flush();
            }
        }
    }
}
