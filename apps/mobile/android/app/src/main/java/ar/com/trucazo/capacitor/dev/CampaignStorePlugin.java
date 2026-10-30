package ar.com.trucazo.capacitor.dev;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import org.json.JSONObject;

// SQLite de Android: transacción completa antes de confirmar al WebView.
// no_backup conserva partidas al actualizar, pero no las transfiere a otro equipo.
@CapacitorPlugin(name = "CampaignStore")
public class CampaignStorePlugin extends Plugin {
    private SQLiteOpenHelper helper;

    @Override public void load() {
        String path = new File(getContext().getNoBackupFilesDir(), "trucazo-historia-v1.db").getPath();
        helper = new SQLiteOpenHelper(getContext(), path, null, 1) {
            @Override public void onConfigure(SQLiteDatabase db) { db.execSQL("PRAGMA synchronous=FULL"); }
            @Override public void onCreate(SQLiteDatabase db) {
                db.execSQL("CREATE TABLE campaigns (owner TEXT PRIMARY KEY, revision INTEGER NOT NULL, body TEXT NOT NULL)");
                db.execSQL("CREATE TABLE meta (id INTEGER PRIMARY KEY CHECK(id=1), owner TEXT)");
                db.execSQL("INSERT INTO meta VALUES (1, NULL)");
            }
            @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
                throw new IllegalStateException("El guardado necesita su versión anterior. Se conserva.");
            }
        };
    }

    private String active(SQLiteDatabase db) {
        try (Cursor row = db.rawQuery("SELECT owner FROM meta WHERE id=1", null)) {
            return row.moveToFirst() && !row.isNull(0) ? row.getString(0) : null;
        }
    }
    private JSObject read(SQLiteDatabase db, String owner) {
        JSObject result = new JSObject();
        result.put("active", active(db));
        if (owner != null) try (Cursor row = db.rawQuery("SELECT body FROM campaigns WHERE owner=?", new String[]{owner})) {
            if (row.moveToFirst()) result.put("body", row.getString(0));
        }
        return result;
    }

    @PluginMethod public synchronized void read(PluginCall call) {
        try { call.resolve(read(helper.getReadableDatabase(), call.getString("owner"))); }
        catch (Exception error) { call.reject("No se pudo abrir el guardado. Se conserva."); }
    }

    @PluginMethod public synchronized void activate(PluginCall call) {
        try {
            SQLiteDatabase db = helper.getWritableDatabase();
            String owner = call.getString("owner");
            ContentValues values = new ContentValues(); values.put("owner", owner);
            db.update("meta", values, "id=1", null);
            call.resolve(read(db, owner));
        } catch (Exception error) { call.reject("No se pudo abrir el guardado de esta cuenta."); }
    }

    @PluginMethod public synchronized void remove(PluginCall call) {
        SQLiteDatabase db = null;
        try {
            db = helper.getWritableDatabase(); db.beginTransaction();
            String owner = call.getString("owner");
            if (owner == null) { call.reject("Falta la cuenta a eliminar."); return; }
            db.delete("campaigns", "owner=?", new String[]{owner});
            db.execSQL("UPDATE meta SET owner=NULL WHERE id=1 AND owner=?", new Object[]{owner});
            db.setTransactionSuccessful();
            db.endTransaction();
            call.resolve();
        } catch (Exception error) { call.reject("No se pudo borrar el guardado local. Reintentá."); }
        finally { if (db != null && db.inTransaction()) db.endTransaction(); }
    }

    @PluginMethod public synchronized void commit(PluginCall call) {
        SQLiteDatabase db = null;
        try {
            String owner = call.getString("owner"), body = call.getString("body");
            Integer expected = call.getInt("expectedRevision");
            JSONObject campaign = new JSONObject(body == null ? "" : body);
            if (owner == null || expected == null || !owner.equals(campaign.getString("owner"))
                || !"historia-local-v1".equals(campaign.getString("version"))
                || campaign.getInt("revision") != expected + 1) {
                call.reject("Guardado no compatible."); return;
            }
            db = helper.getWritableDatabase(); db.beginTransaction();
            if (!owner.equals(active(db))) { call.reject("La cuenta cambió. Conservamos el último guardado."); return; }
            int revision = -1;
            try (Cursor row = db.rawQuery("SELECT revision FROM campaigns WHERE owner=?", new String[]{owner})) {
                if (row.moveToFirst()) revision = row.getInt(0);
            }
            if (revision != expected) { call.reject("La partida cambió. Volvé al último guardado."); return; }
            db.execSQL("INSERT OR REPLACE INTO campaigns(owner,revision,body) VALUES(?,?,?)",
                new Object[]{owner, expected + 1, body});
            db.setTransactionSuccessful(); db.endTransaction();
            call.resolve();
        } catch (Exception error) {
            call.reject("No se pudo guardar. Liberá espacio y reintentá; la jugada no avanzó.");
        } finally {
            if (db != null && db.inTransaction()) db.endTransaction();
        }
    }
}
