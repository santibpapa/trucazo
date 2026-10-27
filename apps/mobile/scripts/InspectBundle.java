import com.android.bundle.Config.BundleConfig;
import java.util.zip.ZipFile;

// Lee el mismo protocolo de bundletool incluido por Gradle, sin descargar herramientas.
class InspectBundle {
    public static void main(String[] args) throws Exception {
        try (var zip = new ZipFile(args[0]); var stream = zip.getInputStream(zip.getEntry("BundleConfig.pb"))) {
            var config = BundleConfig.parseFrom(stream);
            var alignment = config.getOptimizations().getUncompressNativeLibraries().getAlignment();
            if (!alignment.name().equals("PAGE_ALIGNMENT_16K")) throw new IllegalStateException("AAB sin alineación 16KB: " + alignment);
            System.out.println(alignment.name());
        }
    }
}
