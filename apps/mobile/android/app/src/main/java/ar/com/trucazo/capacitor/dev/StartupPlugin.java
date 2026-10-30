package ar.com.trucazo.capacitor.dev;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Android mide el arranque hasta que la primera pantalla realmente puede usarse.
@CapacitorPlugin(name = "Startup")
public class StartupPlugin extends Plugin {
    @PluginMethod public void ready(PluginCall call) {
        getActivity().runOnUiThread(() -> { getActivity().reportFullyDrawn(); call.resolve(); });
    }
}
