package ar.com.trucazo.capacitor.dev;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.capacitorjs.plugins.pushnotifications.MessagingService;
import java.util.Map;

// FCM entrega sólo datos. Este control también corre cuando el WebView está cerrado.
public class TrucazoMessagingService extends MessagingService {
    @Override public void onMessageReceived(@NonNull com.google.firebase.messaging.RemoteMessage message) {
        synchronized (PushBindingPlugin.LOCK) {
            Map<String, String> d = message.getData();
            SharedPreferences p = PushBindingPlugin.store(this);
            String event = d.get("event"), kind = d.get("kind"), path = d.get("path");
            long expires;
            try { expires = Long.parseLong(d.get("expires")); } catch (Exception e) { return; }
            long now = System.currentTimeMillis() / 1000;
            if (event == null || !event.matches("[a-f0-9-]{36}") || kind == null
                || !java.util.Arrays.asList("invite", "checkin", "match").contains(kind)
                || !p.getBoolean(kind, false) || expires <= now
                || !d.getOrDefault("user", "").equals(p.getString("owner", "")) || p.getString("owner", "").isEmpty()
                || !d.getOrDefault("installation", "").equals(p.getString("installation", ""))
                || !d.getOrDefault("binding", "").equals(p.getString("binding", ""))
                || p.contains("event:" + event) || !NotificationManagerCompat.from(this).areNotificationsEnabled()
                || path == null || !path.matches("/comunidad|/torneos/[a-f0-9-]{36}")) return;
            NotificationManager manager = getSystemService(NotificationManager.class);
            NotificationChannel channel = new NotificationChannel("trucazo-game", "Invitaciones y torneos", NotificationManager.IMPORTANCE_HIGH);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PRIVATE);
            manager.createNotificationChannel(channel);
            Intent intent = new Intent(this, MainActivity.class).setAction("trucazo.push." + event)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("google.message_id", event);
            for (Map.Entry<String, String> entry : d.entrySet()) intent.putExtra(entry.getKey(), entry.getValue());
            PendingIntent tap = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            android.app.Notification notification = new NotificationCompat.Builder(this, "trucazo-game")
                .setSmallIcon(R.drawable.ic_stat_trucazo).setColor(0xffd4a843)
                .setContentTitle(d.get("title")).setContentText(d.get("body")).setContentIntent(tap)
                .setAutoCancel(true).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setPriority(NotificationCompat.PRIORITY_HIGH).build();
            try { manager.notify(event, 0, notification); } catch (SecurityException e) { return; }
            SharedPreferences.Editor edit = p.edit();
            for (Map.Entry<String, ?> item : p.getAll().entrySet()) {
                if (item.getKey().startsWith("event:") && item.getValue() instanceof Long && (Long) item.getValue() < now) edit.remove(item.getKey());
            }
            edit.putLong("event:" + event, expires).commit();
            // El plugin oficial informa recepción a la interfaz; su presentación automática está apagada.
            super.onMessageReceived(message);
        }
    }
}
