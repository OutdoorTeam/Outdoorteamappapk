import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, X, AlertTriangle } from 'lucide-react';

interface PDFViewerProps {
  fileId: number;
  filename: string;
  onClose?: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ fileId, filename, onClose }) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 3000); // Give more time for PDF loading

    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `/api/files/${fileId}`;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleIframeError = () => {
    console.error('PDF iframe error for file:', fileId);
    setError('No se pudo cargar el archivo PDF. Intenta descargarlo para verlo.');
    setIsLoading(false);
  };

  const handleIframeLoad = () => {
    console.log('PDF iframe loaded successfully for file:', fileId);
    setIsLoading(false);
    setError(null);
  };

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Error al cargar PDF
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-50" />
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">{error}</h3>
            <p className="text-muted-foreground mb-6">
              El archivo puede estar dañado, ser muy grande, o tu navegador puede tener problemas para mostrarlo.
            </p>
            <div className="space-y-2">
              <Button onClick={handleDownload} variant="outline" className="mr-2">
                <Download className="w-4 h-4 mr-2" />
                Descargar archivo
              </Button>
              <p className="text-xs text-muted-foreground">
                Después de descargar, ábrelo con un lector de PDF de tu preferencia
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {filename}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10 rounded-lg">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Cargando PDF...</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Si tarda mucho, puedes descargarlo directamente
                </p>
              </div>
            </div>
          )}
          
          <div className="border rounded-lg overflow-hidden bg-white">
            <iframe
              ref={iframeRef}
              src={`/api/files/${fileId}#view=FitH&toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-[800px]"
              title={filename}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{ 
                border: 'none',
                display: isLoading ? 'none' : 'block'
              }}
              sandbox="allow-same-origin allow-scripts"
            />
          </div>

          {/* PDF Controls Info */}
          {!isLoading && !error && (
            <div className="mt-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>💡 Usa los controles del visor para navegar, hacer zoom y buscar en el documento.</span>
                <span>Archivo: {filename}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFViewer;