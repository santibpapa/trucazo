// El guardado de la reseña no depende del proveedor de correo.
export async function feedbackImageLinks(storage, paths) {
  const lines = await Promise.all(paths.map(async (imagePath, index) => {
    try {
      const { data, error } = await storage.createSignedUrl(imagePath, 60 * 60 * 24 * 7);
      if (error || !data?.signedUrl) throw Error('No se pudo firmar');
      return data.signedUrl;
    } catch {
      return 'Captura ' + (index + 1) + ': guardada; enlace no disponible. Revisar el acceso privado en Supabase.';
    }
  }));
  return lines.length ? lines.join('\n') : '(ninguna)';
}
