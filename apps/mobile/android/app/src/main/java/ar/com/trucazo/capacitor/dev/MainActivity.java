package ar.com.trucazo.capacitor.dev;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CampaignStorePlugin.class);
        registerPlugin(PushBindingPlugin.class);
        registerPlugin(StartupPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
