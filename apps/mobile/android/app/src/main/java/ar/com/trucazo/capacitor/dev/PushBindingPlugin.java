package ar.com.trucazo.capacitor.dev;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.security.SecureRandom;
import java.util.UUID;

@CapacitorPlugin(name = "PushBinding")
public class PushBindingPlugin extends Plugin {
    static final Object LOCK = new Object();
    static SharedPreferences store(Context context) {
        return context.getSharedPreferences("trucazo-native-push", Context.MODE_PRIVATE);
    }
    @PluginMethod public void state(PluginCall call) {
        synchronized (LOCK) {
            SharedPreferences p = store(getContext());
            if (!p.contains("installation")) {
                byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
                StringBuilder secret = new StringBuilder();
                for (byte b : bytes) secret.append(String.format("%02x", b & 255));
                p.edit().putString("installation", UUID.randomUUID().toString()).putString("secret", secret.toString()).commit();
            }
            JSObject result = new JSObject();
            for (String key : new String[]{"installation", "secret", "owner", "binding"}) result.put(key, p.getString(key, ""));
            result.put("allowed", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
            result.put("consented", p.getBoolean("consent:" + call.getString("owner", ""), false));
            call.resolve(result);
        }
    }
    @PluginMethod public void bind(PluginCall call) {
        synchronized (LOCK) {
            String owner = call.getString("owner", ""), binding = call.getString("binding", "");
            if (!owner.matches("[a-fA-F0-9-]{36}") || !binding.matches("[a-fA-F0-9-]{36}")) { call.reject("Cuenta inválida"); return; }
            SharedPreferences p = store(getContext());
            if (!owner.equals(p.getString("owner", "")) || !binding.equals(p.getString("binding", ""))) {
                NotificationManagerCompat.from(getContext()).cancelAll();
            }
            SharedPreferences.Editor edit = p.edit().putString("owner", owner).putString("binding", binding).putBoolean("consent:" + owner, true);
            for (String kind : new String[]{"invite", "checkin", "match"}) edit.putBoolean(kind, call.getBoolean(kind, false));
            edit.commit(); call.resolve();
        }
    }
    @PluginMethod public void clear(PluginCall call) {
        synchronized (LOCK) {
            SharedPreferences p = store(getContext());
            SharedPreferences.Editor edit = p.edit().remove("owner").remove("binding");
            if (call.getBoolean("forget", false)) edit.remove("consent:" + call.getString("owner", ""));
            edit.commit(); NotificationManagerCompat.from(getContext()).cancelAll(); call.resolve();
        }
    }
}
