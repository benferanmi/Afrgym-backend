import { useState, useEffect } from "react";
import {
  Loader2,
  Save,
  X,
  Plus,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useProductsStore,
  UpdateProductPayload,
  Product,
} from "../../stores/productsStore";
import { uploadMultipleToCloudinary } from "../../config/cloudinary";

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number | null;
  onSuccess: () => void;
}

export function EditProductDialog({
  open,
  onOpenChange,
  productId,
  onSuccess,
}: EditProductDialogProps) {
  const {
    updateProduct,
    fetchSingleProduct,
    loading,
    fetchCategories,
    categories,
  } = useProductsStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<UpdateProductPayload>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    if (open && productId) {
      loadProduct();
      fetchCategories();
    }
  }, [open, productId]);

  const loadProduct = async () => {
    if (!productId) return;

    setLoadingProduct(true);
    try {
      const productData = await fetchSingleProduct(productId);
      setProduct(productData);
      setFormData({
        name: productData.name,
        price: productData.price,
        description: productData.description,
        quantity: productData.quantity,
        sku: productData.sku,
        category: productData.category,
        images: productData.images,
        status: productData.status,
      });
    } catch (error) {
      console.error("Failed to load product:", error);
      setErrors({
        load: "Failed to load product details",
      });
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleChange = (
    field: keyof UpdateProductPayload,
    value: string | number | string[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.images;
      return newErrors;
    });

    try {
      // Upload all selected images to Cloudinary
      const uploadedUrls = await uploadMultipleToCloudinary(files);

      // Add the new URLs to existing images
      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...uploadedUrls],
      }));

      // Clear the file input
      e.target.value = "";
    } catch (error) {
      console.error("Failed to upload images:", error);
      setErrors((prev) => ({
        ...prev,
        images: "Failed to upload images. Please try again.",
      }));
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || [],
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.name !== undefined && !formData.name.trim()) {
      newErrors.name = "Product name cannot be empty";
    }

    if (formData.price !== undefined && formData.price <= 0) {
      newErrors.price = "Price must be greater than 0";
    }

    if (formData.quantity !== undefined && formData.quantity < 0) {
      newErrors.quantity = "Quantity cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!productId || !validate()) return;

    try {
      await updateProduct(productId, formData);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Failed to update product:", error);
      setErrors({
        submit:
          error instanceof Error ? error.message : "Failed to update product",
      });
    }
  };

  const handleClose = () => {
    setProduct(null);
    setFormData({});
    setErrors({});
    onOpenChange(false);
  };

  if (loadingProduct) {
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update product details. Only modify the fields you want to change.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder={product.name}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Price and Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price (₦)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  handleChange("price", parseFloat(e.target.value) || 0)
                }
                placeholder={product.price.toString()}
              />
              {errors.price && (
                <p className="text-sm text-red-500 mt-1">{errors.price}</p>
              )}
            </div>

            <div>
              <Label htmlFor="quantity">Total Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) =>
                  handleChange("quantity", parseInt(e.target.value) || 0)
                }
                placeholder={product.quantity.toString()}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Currently: {product.quantity_left} left ({product.total_sold}{" "}
                sold)
              </p>
              {errors.quantity && (
                <p className="text-sm text-red-500 mt-1">{errors.quantity}</p>
              )}
            </div>
          </div>

          {/* SKU and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleChange("sku", e.target.value)}
                placeholder={product.sku || "Enter SKU"}
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              {categories.length > 0 ? (
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleChange("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={product.category || "Select category"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">+ New Category</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  placeholder={product.category || "Enter category"}
                />
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder={product.description || "Enter description"}
              rows={3}
            />
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onValueChange={(value: any) => handleChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={product.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Images - Cloudinary Upload */}
          <div>
            <Label>Product Images</Label>
            <div className="space-y-3">
              {/* Upload Button */}
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors">
                <input
                  type="file"
                  id="image-upload-edit"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImages || loading}
                  className="hidden"
                />
                <label
                  htmlFor="image-upload-edit"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {uploadingImages ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Uploading images...
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs font-medium">
                        Click to add more images
                      </span>
                    </>
                  )}
                </label>
              </div>

              {/* Error message */}
              {errors.images && (
                <p className="text-sm text-red-500">{errors.images}</p>
              )}

              {/* Image Preview Grid */}
              {formData.images && formData.images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {formData.images.map((url, index) => (
                    <div
                      key={index}
                      className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
                    >
                      <img
                        src={url}
                        alt={`Product ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => handleRemoveImage(index)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {/* Image counter badge */}
                      <div className="absolute top-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {(!formData.images || formData.images.length === 0) && (
                <div className="text-center py-4">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No images uploaded yet
                  </p>
                </div>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded">
              {errors.submit}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading || uploadingImages}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || uploadingImages}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
