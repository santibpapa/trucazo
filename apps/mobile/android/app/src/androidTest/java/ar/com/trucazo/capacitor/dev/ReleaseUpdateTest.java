package ar.com.trucazo.capacitor.dev;

import static org.junit.Assert.*;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

// Se instala por separado, con la misma firma. No añade diagnóstico al release.
@RunWith(AndroidJUnit4.class)
public class ReleaseUpdateTest {
    private static final String OWNER = "00000000-0000-4000-a016-000000000016";
    private static class Call extends PluginCall {
        JSObject result;
        boolean completed;
        Call(JSObject data) { super(null, "CampaignStore", "test", "test", data); }
        @Override public void resolve(JSObject data) { result = data; completed = true; }
        @Override public void resolve() { completed = true; }
        @Override public void reject(String message) { throw new AssertionError(message); }
    }
    private static JSObject owner() { return new JSObject().put("owner", OWNER); }

    @Test public void preservesOpenGameAndQueue() throws Exception {
        var instrumentation = InstrumentationRegistry.getInstrumentation();
        var context = instrumentation.getTargetContext();
        assertEquals("ar.com.trucazo.app", context.getPackageName());
        assertEquals(0, context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE);
        String expectedVersion = InstrumentationRegistry.getArguments().getString("expectedVersion");
        if (expectedVersion != null) assertEquals(Long.parseLong(expectedVersion), context.getPackageManager().getPackageInfo(context.getPackageName(), 0).getLongVersionCode());
        String fixture;
        try (InputStream stream = instrumentation.getContext().getAssets().open("update-fixture.json")) {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] buffer = new byte[4096]; int count;
            while ((count = stream.read(buffer)) != -1) bytes.write(buffer, 0, count);
            fixture = new String(bytes.toByteArray(), StandardCharsets.UTF_8);
        }
        var phase = InstrumentationRegistry.getArguments().getString("phase", "verify");
        Intent intent = new Intent().setClassName(context, MainActivity.class.getName()).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        MainActivity activity = (MainActivity) instrumentation.startActivitySync(intent);
        instrumentation.runOnMainSync(() -> {
            assertFalse(activity.getBridge().getConfig().isWebContentsDebuggingEnabled());
            assertFalse(activity.getBridge().getConfig().isLoggingEnabled());
            assertNull(activity.getBridge().getConfig().getServerUrl());
            var plugin = (CampaignStorePlugin) activity.getBridge().getPlugin("CampaignStore").getInstance();
            var read = new Call(owner()); plugin.read(read); assertTrue(read.completed);
            if (phase.equals("seed")) {
                assertFalse("No reemplazar datos existentes", read.result.has("body"));
                var activate = new Call(owner()); plugin.activate(activate); assertTrue(activate.completed);
                var commit = new Call(owner().put("body", fixture).put("expectedRevision", -1));
                plugin.commit(commit); assertTrue(commit.completed);
            } else {
                assertEquals(fixture, read.result.getString("body"));
                try {
                    JSONObject saved = new JSONObject(read.result.getString("body"));
                    assertEquals(1, saved.getJSONArray("pending").length());
                    assertEquals("playing", saved.getJSONObject("trial").getJSONObject("game").getString("status"));
                } catch (Exception error) { throw new AssertionError(error); }
                if (phase.equals("cleanup")) {
                    var remove = new Call(owner()); plugin.remove(remove); assertTrue(remove.completed);
                    var after = new Call(owner()); plugin.read(after); assertFalse(after.result.has("body"));
                }
            }
        });
    }
}
