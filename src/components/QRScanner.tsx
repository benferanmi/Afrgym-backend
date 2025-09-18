// QRScanner.jsx - Enhanced version for 8-digit codes
import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Camera, FlashlightIcon, CheckCircle2, AlertCircle } from 'lucide-react';

export const QRScanner = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      initializeScanner();
    }

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    try {
      // Check if camera is available
      const hasCamera = await QrScanner.hasCamera();
      setHasCamera(hasCamera);

      if (!hasCamera) {
        console.log('No camera found');
        return;
      }

      // Get available cameras
      const cameras = await QrScanner.listCameras(true);
      setCameras(cameras);
      setSelectedCamera(cameras[0]?.id);

      // Initialize scanner
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          handleScanResult(result.data);
        },
        {
          onDecodeError: (error) => {
            console.log('QR decode error:', error);
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment', // Use back camera on mobile
          maxScansPerSecond: 2, // Reduce CPU usage
        }
      );

      await qrScannerRef.current.start();
    } catch (error) {
      console.error('Scanner initialization error:', error);
      setHasCamera(false);
    }
  };

  const handleScanResult = (scannedData) => {
    if (isProcessing) return; // Prevent multiple rapid scans
    
    setIsProcessing(true);
    console.log('Raw scan result:', scannedData);
    
    // Extract the 8-digit code from scanned data
    let qrCode = scannedData;
    
    // If it's a URL, extract the code from it
    if (scannedData.includes('/')) {
      const urlParts = scannedData.split('/');
      qrCode = urlParts[urlParts.length - 1];
    }
    
    // Remove any query parameters
    if (qrCode.includes('?')) {
      qrCode = qrCode.split('?')[0];
    }
    
    // Validate that it's an 8-digit alphanumeric code
    if (/^[A-Za-z0-9]{8}$/.test(qrCode)) {
      setScanResult({
        success: true,
        code: qrCode,
        message: 'Valid QR code detected!'
      });
      
      // Wait a moment to show the success state, then process
      setTimeout(() => {
        onScan(qrCode);
      }, 800);
    } else {
      setScanResult({
        success: false,
        code: qrCode,
        message: 'Invalid QR code format. Expected 8-digit code.'
      });
      
      // Reset after showing error
      setTimeout(() => {
        setScanResult(null);
        setIsProcessing(false);
      }, 2000);
    }
  };

  const handleClose = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setScanResult(null);
    setIsProcessing(false);
    onClose();
  };

  const toggleFlash = async () => {
    if (qrScannerRef.current) {
      try {
        if (isFlashOn) {
          await qrScannerRef.current.turnFlashOff();
        } else {
          await qrScannerRef.current.turnFlashOn();
        }
        setIsFlashOn(!isFlashOn);
      } catch (error) {
        console.log('Flash not supported:', error);
      }
    }
  };

  const switchCamera = async () => {
    if (cameras.length > 1 && qrScannerRef.current) {
      const currentIndex = cameras.findIndex(cam => cam.id === selectedCamera);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCamera = cameras[nextIndex];
      
      try {
        await qrScannerRef.current.setCamera(nextCamera.id);
        setSelectedCamera(nextCamera.id);
      } catch (error) {
        console.error('Error switching camera:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">Scan Member QR Code</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Scanner View */}
      <div className="relative w-full h-full">
        {hasCamera ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className={`w-64 h-64 border-2 rounded-lg bg-transparent transition-colors duration-300 ${
                  scanResult?.success ? 'border-green-400' : 
                  scanResult?.success === false ? 'border-red-400' : 
                  'border-white'
                }`}>
                  {/* Corner indicators */}
                  <div className={`absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 rounded-tl-lg transition-colors duration-300 ${
                    scanResult?.success ? 'border-green-400' : 
                    scanResult?.success === false ? 'border-red-400' : 
                    'border-blue-400'
                  }`}></div>
                  <div className={`absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 rounded-tr-lg transition-colors duration-300 ${
                    scanResult?.success ? 'border-green-400' : 
                    scanResult?.success === false ? 'border-red-400' : 
                    'border-blue-400'
                  }`}></div>
                  <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 rounded-bl-lg transition-colors duration-300 ${
                    scanResult?.success ? 'border-green-400' : 
                    scanResult?.success === false ? 'border-red-400' : 
                    'border-blue-400'
                  }`}></div>
                  <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 rounded-br-lg transition-colors duration-300 ${
                    scanResult?.success ? 'border-green-400' : 
                    scanResult?.success === false ? 'border-red-400' : 
                    'border-blue-400'
                  }`}></div>
                </div>
                
                {/* Scan result feedback */}
                {scanResult ? (
                  <div className="text-center mt-4 space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      {scanResult.success ? (
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-400" />
                      )}
                      <Badge 
                        variant={scanResult.success ? "default" : "destructive"}
                        className="bg-black/50 text-white border-current"
                      >
                        {scanResult.code}
                      </Badge>
                    </div>
                    <p className={`text-sm ${scanResult.success ? 'text-green-400' : 'text-red-400'}`}>
                      {scanResult.message}
                    </p>
                  </div>
                ) : (
                  <div className="text-center mt-4">
                    <p className="text-white">Position QR code within the frame</p>
                    <p className="text-gray-300 text-sm mt-1">Looking for 8-digit member code</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <Camera className="mx-auto h-16 w-16 mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Camera Not Available</h3>
              <p className="text-gray-300">
                Please check camera permissions or try a different device
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {hasCamera && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/50 p-6">
          <div className="flex items-center justify-center space-x-6">
            {/* Flash toggle */}
            <Button
              variant="ghost"
              size="lg"
              onClick={toggleFlash}
              className={`text-white hover:bg-white/20 ${isFlashOn ? 'bg-white/30' : ''}`}
              disabled={isProcessing}
            >
              <FlashlightIcon className="h-6 w-6" />
            </Button>

            {/* Camera switch */}
            {cameras.length > 1 && (
              <Button
                variant="ghost"
                size="lg"
                onClick={switchCamera}
                className="text-white hover:bg-white/20"
                disabled={isProcessing}
              >
                <Camera className="h-6 w-6" />
              </Button>
            )}
          </div>
          
          <div className="text-center text-gray-300 text-sm mt-4 space-y-1">
            <p>Point your camera at a member's QR code</p>
            {scanResult && !scanResult.success && (
              <p className="text-red-400">Make sure the QR code is clear and well-lit</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};