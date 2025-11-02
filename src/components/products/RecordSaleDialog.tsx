
// RecordSaleDialog.tsx
import { useState as useStateR, useEffect as useEffectR } from "react";
import { Loader2 as Loader2R, ShoppingCart } from "lucide-react";
import { Button as ButtonR } from "@/components/ui/button";
import {
  Dialog as DialogR,
  DialogContent as DialogContentR,
  DialogDescription as DialogDescriptionR,
  DialogFooter as DialogFooterR,
  DialogHeader as DialogHeaderR,
  DialogTitle as DialogTitleR,
} from "@/components/ui/dialog";
import { Input as InputR } from "@/components/ui/input";
import { Label as LabelR } from "@/components/ui/label";
import { Textarea as TextareaR } from "@/components/ui/textarea";
import {
  useProductsStore as useProductsStoreR,
  Product as ProductR,
  formatCurrency as formatCurrencyR,
} from "../../stores/productsStore";


interface RecordSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number | null;
  onSuccess: () => void;
}

export function RecordSaleDialog({
  open,
  onOpenChange,
  productId,
  onSuccess,
}: RecordSaleDialogProps) {
  const { recordSale, fetchSingleProduct, loading } = useProductsStoreR();
  const [product, setProduct] = useStateR<ProductR | null>(null);
  const [quantity, setQuantity] = useStateR(1);
  const [note, setNote] = useStateR("");
  const [errors, setErrors] = useStateR<Record<string, string>>({});
  const [loadingProduct, setLoadingProduct] = useStateR(false);

  useEffectR(() => {
    if (open && productId) {
      loadProduct();
    }
  }, [open, productId]);

  const loadProduct = async () => {
    if (!productId) return;

    setLoadingProduct(true);
    try {
      const productData = await fetchSingleProduct(productId);
      setProduct(productData);
      setQuantity(1);
      setNote("");
      setErrors({});
    } catch (error) {
      console.error("Failed to load product:", error);
    } finally {
      setLoadingProduct(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (quantity <= 0) {
      newErrors.quantity = "Quantity must be at least 1";
    }

    if (product && quantity > product.quantity_left) {
      newErrors.quantity = `Only ${product.quantity_left} units available`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!productId || !validate()) return;

    try {
      await recordSale(productId, { quantity, note });
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Failed to record sale:", error);
      setErrors({
        submit: error instanceof Error ? error.message : "Failed to record sale",
      });
    }
  };

  const handleClose = () => {
    setProduct(null);
    setQuantity(1);
    setNote("");
    setErrors({});
    onOpenChange(false);
  };

  if (loadingProduct) {
    return (
      <DialogR open={open} onOpenChange={handleClose}>
        <DialogContentR>
          <div className="flex items-center justify-center py-8">
            <Loader2R className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading product...</span>
          </div>
        </DialogContentR>
      </DialogR>
    );
  }

  if (!product) {
    return null;
  }

  const totalAmount = product.price * quantity;

  return (
    <DialogR open={open} onOpenChange={handleClose}>
      <DialogContentR className="max-w-md">
        <DialogHeaderR>
          <DialogTitleR>Record Sale</DialogTitleR>
          <DialogDescriptionR>
            Record a sale for {product.name}
          </DialogDescriptionR>
        </DialogHeaderR>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex items-center gap-3 mb-2">
              {product.images[0] && (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-12 w-12 rounded object-cover"
                />
              )}
              <div>
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrencyR(product.price)} per unit
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Available: {product.quantity_left} units
            </div>
          </div>

          {/* Quantity */}
          <div>
            <LabelR htmlFor="quantity">
              Quantity <span className="text-red-500">*</span>
            </LabelR>
            <InputR
              id="quantity"
              type="number"
              min="1"
              max={product.quantity_left}
              value={quantity}
              onChange={(e) => {
                setQuantity(parseInt(e.target.value) || 1);
                if (errors.quantity) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.quantity;
                    return newErrors;
                  });
                }
              }}
            />
            {errors.quantity && (
              <p className="text-sm text-red-500 mt-1">{errors.quantity}</p>
            )}
          </div>

          {/* Total Amount */}
          <div className="border rounded-lg p-4 bg-green-50">
            <div className="text-sm text-muted-foreground mb-1">
              Total Amount
            </div>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrencyR(totalAmount)}
            </div>
          </div>

          {/* Note */}
          <div>
            <LabelR htmlFor="note">Note (Optional)</LabelR>
            <TextareaR
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any notes about this sale..."
              rows={3}
            />
          </div>

          {errors.submit && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded">
              {errors.submit}
            </div>
          )}
        </div>

        <DialogFooterR>
          <ButtonR variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </ButtonR>
          <ButtonR onClick={handleSubmit} disabled={loading || quantity <= 0}>
            {loading ? (
              <>
                <Loader2R className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Record Sale
              </>
            )}
          </ButtonR>
        </DialogFooterR>
      </DialogContentR>
    </DialogR>
  );
}