package ar.com.trucazo.capacitor.dev;

import static org.junit.Assert.*;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.os.BatteryManager;
import android.os.SystemClock;
import android.view.WindowManager;
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
import org.json.JSONArray;
import org.json.JSONTokener;
import org.junit.Test;
import org.junit.runner.RunWith;

// Comprobador separado y firmado. Sólo durante instrumentación local por ADB;
// nunca se empaqueta en la app entregable ni habilita WebView debug.
@RunWith(AndroidJUnit4.class)
public class ReleaseAcceptanceTest {
    private MainActivity activity;
    private final JSONArray batterySamples = new JSONArray();
    private java.util.Timer batteryTimer;
    private synchronized String battery() { return batterySamples.toString(); }
    private synchronized void sampleBattery() {
        try {
            var state = activity.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            var manager = activity.getSystemService(BatteryManager.class);
            batterySamples.put(new JSONObject().put("elapsedMs", SystemClock.elapsedRealtime())
                .put("utcMs", System.currentTimeMillis()).put("plugged", state.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1))
                .put("level", state.getIntExtra(BatteryManager.EXTRA_LEVEL, -1))
                .put("temperatureTenthsC", state.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, -1))
                .put("chargeMicroAh", manager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CHARGE_COUNTER))
                .put("currentMicroA", manager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW)));
            try (var file = new java.io.FileOutputStream(new java.io.File(activity.getCacheDir(), "android17-battery.json"))) {
                file.write(battery().getBytes(StandardCharsets.UTF_8));
            }
        } catch (Exception error) { throw new RuntimeException(error); }
    }
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
        evaluate("window.__acceptanceResult=null;void 0");
        evaluate("Promise.resolve().then(()=> (0,eval)(" + JSONObject.quote(script) + ")).then(value=>window.__acceptanceResult={value},error=>window.__acceptanceResult={error:'Falló el recorrido ('+error.name+')'});void 0");
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
        return new String(bytes.toByteArray(), StandardCharsets.UTF_8);
    }
    @Test public void acceptsSignedCandidate() throws Exception {
        var instrumentation = InstrumentationRegistry.getInstrumentation();
        var context = instrumentation.getTargetContext();
        assertEquals("ar.com.trucazo.app", context.getPackageName());
        assertEquals(0, context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE);
        if ("battery-read".equals(InstrumentationRegistry.getArguments().getString("phase"))) {
            var file = new java.io.File(context.getCacheDir(), "android17-battery.json");
            assertTrue("No hay muestras guardadas", file.isFile());
            var status = new android.os.Bundle();
            status.putString("batterySamples", new String(java.nio.file.Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8));
            instrumentation.sendStatus(0, status);
            return;
        }
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
                byte[] body = new byte[length];
                int received = 0;
                while (received < length) {
                    int count = input.read(body, received, length - received);
                    if (count < 0) throw new java.io.EOFException("Solicitud incompleta");
                    received += count;
                }
                String result;
                if (first.startsWith("POST /stop ")) { running = false; result = "{\"stopped\":true}"; }
                else if (first.startsWith("POST /battery/start ")) {
                    assertNull("La medición ya empezó", batteryTimer);
                    instrumentation.runOnMainSync(() -> activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));
                    batteryTimer = new java.util.Timer("android17-battery", true);
                    batteryTimer.scheduleAtFixedRate(new java.util.TimerTask() { public void run() { sampleBattery(); } }, 0, 30000);
                    result = "{\"started\":true}";
                }
                else if (first.startsWith("POST /battery ")) { result = "{\"samples\":" + battery() + "}"; }
                else {
                    assertTrue(first.startsWith("POST /evaluate "));
                    result = execute(new JSONObject(new String(body, StandardCharsets.UTF_8)).getString("script"));
                }
                byte[] response = result.getBytes(StandardCharsets.UTF_8);
                socket.getOutputStream().write(("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " + response.length + "\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.UTF_8));
                socket.getOutputStream().write(response); socket.getOutputStream().flush();
            }
        } finally {
            if (batteryTimer != null) batteryTimer.cancel();
            instrumentation.runOnMainSync(() -> activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));
        }
    }
}
