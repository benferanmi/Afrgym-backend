// ViewProductDialog.tsx
import { useState, useEffect } from "react";
import { Loader2, Edit, Package, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  useProductsStore,
  Product,
  formatCurrency,
  getStockStatus,
  formatDate,
} from "@/stores/productsStore";
import { useAuthStore } from "@/stores/authStore";

interface ViewProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number | null;
  onEdit?: (productId: number) => void;
}

export function ViewProductDialog({
  open,
  onOpenChange,
  productId,
  onEdit,
}: ViewProductDialogProps) {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "super_admin";
  const { fetchSingleProduct } = useProductsStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && productId) {
      loadProduct();
    }
  }, [open, productId]);

  const loadProduct = async () => {
    if (!productId) return;

    setLoading(true);
    try {
      const productData = await fetchSingleProduct(productId);
      setProduct(productData);
    } catch (error) {
      console.error("Failed to load product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setProduct(null);
    onOpenChange(false);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading product...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!product) {
    return null;
  }

  const stockStatus = getStockStatus(product);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{product.name}</DialogTitle>
              <DialogDescription>
                SKU: {product.sku || "N/A"} • Category: {product.category || "Uncategorized"}
              </DialogDescription>
            </div>
            {isSuperAdmin && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(product.id)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Images */}
          {product.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {product.images.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`${product.name} ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ))}
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Price</span>
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(product.price)}
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Package className="h-4 w-4" />
                <span className="text-sm">In Stock</span>
              </div>
              <div className="text-2xl font-bold">{product.quantity_left}</div>
              <div className="text-xs text-muted-foreground">
                of {product.quantity} total
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Package className="h-4 w-4" />
                <span className="text-sm">Total Sold</span>
              </div>
              <div className="text-2xl font-bold">{product.total_sold}</div>
              <div className="text-xs text-muted-foreground">
                Revenue: {formatCurrency(product.price * product.total_sold)}
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex gap-2">
            <Badge
              className={
                product.status === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }
            >
              {product.status}
            </Badge>
            <Badge
              className={
                stockStatus.color === "green"
                  ? "bg-green-100 text-green-800"
                  : stockStatus.color === "orange"
                  ? "bg-orange-100 text-orange-800"
                  : "bg-red-100 text-red-800"
              }
            >
              {stockStatus.text}
            </Badge>
          </div>

          {/* Description */}
          {product.description && (
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          )}

          {/* Additional Details */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created By</span>
              <span className="font-medium capitalize">
                {product.created_by_gym.replace("_", " ")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created At</span>
              <span className="font-medium">{formatDate(product.created_at)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="font-medium">{formatDate(product.updated_at)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
