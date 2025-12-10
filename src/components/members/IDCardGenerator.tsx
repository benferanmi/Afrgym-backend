import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, FileImage, FileText, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import siteLogo from "../../assets/logo.png";

interface IDCardUser {
  display_name?: string;
  name?: string;
  username: string;
  email: string;
  profile_picture_url?: string | null;
  avatar_url?: string;
  qr_code?: {
    has_qr_code: boolean;
    unique_id: string | null;
    qr_code_url: string | null;
    generated_by: string | null;
  };
  unique_id?: string;
}

interface IDCardGeneratorProps {
  user: IDCardUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IDCardGenerator({
  user,
  open,
  onOpenChange,
}: IDCardGeneratorProps) {
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const getUserName = () => user.display_name || user.name || user.username;
  const getQRUniqueId = () => user.qr_code?.unique_id || user.unique_id || "";

  const getQRCodeUrl = () => {
    if (user.qr_code?.qr_code_url) {
      return user.qr_code.qr_code_url;
    }
    const uniqueId = getQRUniqueId();
    if (uniqueId) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${uniqueId}`;
    }
    return null;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow && cardRef.current) {
      const clone = cardRef.current.cloneNode(true) as HTMLElement;
      clone.style.backgroundColor = "#2579f5";
      const cardHTML = clone.outerHTML;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>ID Card - ${getUserName()}</title>
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: white;
  }
  @media print {
    body {
      background: white !important;
    }
    @page {
      margin: 0;
      size: landscape;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
</style>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          </head>
          <body>
            ${cardHTML}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownloadPNG = async () => {
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      if (cardRef.current) {
        const canvas = await html2canvas(cardRef.current, {
          scale: 2,
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: true,
          allowTaint: true,
        });
        const link = document.createElement("a");
        link.download = `${user.username}-id-card.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    } catch (error) {
      console.error("Failed to download PNG:", error);
      alert("Failed to download ID card as PNG");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      if (cardRef.current) {
        const canvas = await html2canvas(cardRef.current, {
          scale: 3,
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: true,
          allowTaint: true,
        });
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: [85.6, 53.98],
        });
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, 85.6, 53.98);
        pdf.save(`${user.username}-id-card.pdf`);
      }
    } catch (error) {
      console.error("Failed to download PDF:", error);
      alert("Failed to download ID card as PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Member ID Card</DialogTitle>
            <DialogDescription>
              Download or print the membership ID card for {getUserName()}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center py-6 bg-gray-50 rounded-lg">
            <div
              ref={cardRef}
              data-card="true"
              className="relative overflow-hidden shadow-2xl bg-[#2579f5]"
              style={{
                width: "428px",
                height: "270px",
                borderRadius: "16px",
              }}
            >
              {/* Gradient Header Strip */}
              {/* <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"></div> */}

              {/* Card Content */}
              <div className="relative h-full p-6 flex gap-4 bg-inherit">
                {/* Left Section */}
                <div className="flex-1 flex flex-col">
                  {/* Logo & Brand */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                      <img
                        src={siteLogo}
                        alt="AFRGYM Logo"
                        className="w-9 h-9 object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <div>
                      <h3 className="font-black text-2xl text-white text-transparent">
                        AFRGYM
                      </h3>
                      <p className="text-xs text-gray-100 font-semibold uppercase tracking-widest">
                        Member ID
                      </p>
                    </div>
                  </div>

                  {/* User Info Section */}
                  <div className="flex items-center gap-4 mb-auto z-10">
                    {/* Profile Picture */}
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-100 to-blue-100 shadow-md">
                        {user.profile_picture_url || user.avatar_url ? (
                          <img
                            src={user.profile_picture_url || user.avatar_url}
                            alt={getUserName()}
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-black text-3xl">
                            {getUserName().charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>

                    {/* User Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-lg text-gray-900 leading-tight mb-1">
                        {getUserName()}
                      </h4>
                      <p className="text-sm text-white font-semibold mb-1">
                        @{user.username}
                      </p>
                      <p className="text-xs text-gray-200 truncate h-6 z-10">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* Footer Badge */}
                  <div className=" z-10">
                    <div
                      className="flex justify-center items-center bg-white rounded-full border border-cyan-200 h-6 px-3"
                      style={{ width: "auto", maxWidth: "200px" }}
                    >
                      <p className="text-xs pb-3 text-black z-10 font-bold uppercase tracking-wide print:pb-0">
                        ✓ AUTHORIZED MEMBER
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Section - QR Code */}
                <div className="w-32 flex flex-col items-center justify-center">
                  {getQRCodeUrl() ? (
                    <div className="flex flex-col items-center">
                      <div className="bg-white p-2 rounded-xl shadow-lg border border-gray-200">
                        <img
                          src={getQRCodeUrl()!}
                          alt="QR Code"
                          className="w-28 h-28 object-contain"
                          crossOrigin="anonymous"
                        />
                      </div>
                      <p className="text-[10px] font-mono font-bold text-gray-300 mt-2 text-center break-all px-1">
                        {getQRUniqueId()}
                      </p>
                      <p
                        style={{ fontSize: "9px" }}
                        className="text-gray-100 mt-1 uppercase tracking-wider font-semibold"
                      >
                        Scan to verify
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-300">
                      <div className="w-28 h-28 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center bg-gray-50">
                        <span className="text-xs font-semibold text-gray-400">
                          No QR
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Decorative Corner Element */}
              {/* <div className="absolute bottom-0 right-0 w-24 h-24 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-tl from-cyan-500 to-transparent rounded-tl-full"></div>
              </div> */}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>

            <div className="flex gap-2">
              <Button
                onClick={handlePrint}
                variant="outline"
                disabled={downloading}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={downloading}>
                    {downloading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownloadPNG}>
                    <FileImage className="w-4 h-4 mr-2" />
                    Download as PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadPDF}>
                    <FileText className="w-4 h-4 mr-2" />
                    Download as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
