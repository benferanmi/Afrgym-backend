import { create } from "zustand";

const BASE_URL = "https://afrgym.com.ng/wp-json/gym-admin/v1";

export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  sku: string;
  category: string;
  quantity: number;
  total_sold: number;
  quantity_left: number;
  images: string[];
  status: "active" | "inactive";
  created_by_gym: string;
  created_at: string;
  updated_at: string;
}

export interface ProductSale {
  id: number;
  product_id: number;
  quantity: number;
  price_at_sale: number;
  total_amount: number;
  admin_id: number;
  gym_identifier: string;
  note: string;
  sale_date: string;
  created_at: string;
}

export interface CreateProductPayload {
  name: string;
  price: number;
  description?: string;
  quantity: number;
  sku?: string;
  category?: string;
  images?: string[];
  status?: "active" | "inactive";
}

export interface UpdateProductPayload {
  name?: string;
  price?: number;
  description?: string;
  quantity?: number;
  sku?: string;
  category?: string;
  images?: string[];
  status?: "active" | "inactive";
}

export interface RecordSalePayload {
  quantity: number;
  note?: string;
}

export interface MonthlyStats {
  month: string;
  summary: {
    total_units_sold: number;
    total_revenue: number;
    transaction_count: number;
    average_transaction_value: number;
  };
  products_breakdown: Array<{
    id: number;
    name: string;
    price: number;
    total_sold: number;
    total_revenue: number;
  }>;
  daily_stats: Array<{
    date: string;
    units_sold: number;
    revenue: number;
  }>;
}

export interface WeeklyStats {
  week_start: string;
  week_end: string;
  summary: {
    total_units_sold: number;
    total_revenue: number;
  };
  daily_breakdown: Array<{
    date: string;
    day_name: string;
    units_sold: number;
    revenue: number;
  }>;
}

export interface ProductAnalytics {
  period: string;
  date_range: {
    start: string;
    end: string;
  };
  summary: {
    total_units_sold: number;
    total_revenue: number;
    products_sold_count: number;
  };
  top_by_revenue: Array<{
    id: number;
    name: string;
    units_sold: number;
    revenue: number;
  }>;
  top_by_units: Array<{
    id: number;
    name: string;
    units_sold: number;
    revenue: number;
  }>;
}

export interface TopSellingProduct {
  id: number;
  name: string;
  price: number;
  category: string;
  units_sold: number;
  revenue: number;
  transaction_count: number;
}

export interface LowStockProduct {
  id: number;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  total_sold: number;
  quantity_left: number;
  status: string;
}

// Helper function for token management
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isTokenInvalidError = (error: any): boolean => {
  if (error?.code === "jwt_auth_invalid_token") return true;
  if (error?.data?.status === 403) return true;
  if (error?.status === 403) return true;
  if (error?.message?.toLowerCase().includes("token is invalid")) return true;
  if (error?.message?.toLowerCase().includes("unauthorized")) return true;
  if (error?.message?.toLowerCase().includes("forbidden")) return true;
  return false;
};

const handleTokenInvalidation = async () => {
  console.log("Invalid token detected, logging out user");
  localStorage.removeItem("gym-auth-storage");
  window.dispatchEvent(
    new CustomEvent("auth:logout", {
      detail: { reason: "token_invalid" },
    })
  );
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${BASE_URL}${endpoint}`;

  const authState = localStorage.getItem("gym-auth-storage");
  let token = null;

  if (authState) {
    try {
      const parsedAuth = JSON.parse(authState);
      token = parsedAuth.state?.token;
    } catch (error) {
      console.warn("Failed to parse auth token:", error);
    }
  }

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = {
        ...errorData,
        status: response.status,
        statusText: response.statusText,
      };

      if (isTokenInvalidError(error)) {
        await handleTokenInvalidation();
        throw new Error("Your session has expired. Please login again.");
      }

      throw error;
    }

    return response.json();
  } catch (error) {
    if (isTokenInvalidError(error)) {
      await handleTokenInvalidation();
      throw new Error("Your session has expired. Please login again.");
    }
    throw error;
  }
};

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
  selectedProduct: Product | null;
  searchTerm: string;
  filterStatus: "all" | "active" | "inactive" | "low_stock";
  currentPage: number;
  totalPages: number;
  total: number;
  categories: string[];

  // Statistics
  monthlyStats: MonthlyStats | null;
  weeklyStats: WeeklyStats | null;
  analytics: ProductAnalytics | null;
  topSelling: TopSellingProduct[];
  lowStock: LowStockProduct[];
  statsLoading: boolean;

  // Actions
  fetchProducts: (page?: number, search?: string) => Promise<void>;
  fetchSingleProduct: (id: number) => Promise<Product>;
  addProduct: (product: CreateProductPayload) => Promise<Product>;
  updateProduct: (
    id: number,
    product: UpdateProductPayload
  ) => Promise<Product>;
  deleteProduct: (id: number) => Promise<void>;
  recordSale: (id: number, payload: RecordSalePayload) => Promise<void>;

  selectProduct: (product: Product | null) => void;
  setSearchTerm: (term: string) => void;
  setFilterStatus: (
    status: "all" | "active" | "inactive" | "low_stock"
  ) => void;
  setCurrentPage: (page: number) => void;
  getFilteredProducts: () => Product[];
  clearError: () => void;

  // Statistics Actions
  fetchMonthlyStats: (month?: string) => Promise<MonthlyStats>;
  fetchWeeklyStats: (date?: string) => Promise<WeeklyStats>;
  fetchAnalytics: (period?: string) => Promise<ProductAnalytics>;
  fetchTopSelling: (
    limit?: number,
    period?: string
  ) => Promise<TopSellingProduct[]>;
  fetchLowStock: (threshold?: number) => Promise<LowStockProduct[]>;
  fetchCategories: () => Promise<string[]>;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  loading: false,
  error: null,
  selectedProduct: null,
  searchTerm: "",
  filterStatus: "all",
  currentPage: 1,
  totalPages: 1,
  total: 0,
  categories: [],

  monthlyStats: null,
  weeklyStats: null,
  analytics: null,
  topSelling: [],
  lowStock: [],
  statsLoading: false,

  fetchProducts: async (page = 1, search = "") => {
    set({ loading: true, error: null });

    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", page.toString());
      queryParams.append("per_page", "20");

      if (search) {
        queryParams.append("search", search);
      }

      const { filterStatus } = get();
      if (filterStatus !== "all") {
        queryParams.append("status", filterStatus);
      }

      const response = await apiCall(`/products?${queryParams}`);

      set({
        products: response.data,
        total: response.pagination.total_items,
        currentPage: response.pagination.page,
        totalPages: response.pagination.total_pages,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch products";
      set({
        loading: false,
        error: errorMessage,
        products: [],
        total: 0,
        totalPages: 1,
      });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
    }
  },

  fetchSingleProduct: async (id: number) => {
    set({ loading: true, error: null });

    try {
      const response = await apiCall(`/products/${id}`);
      set({ loading: false, error: null });
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch product";
      set({ loading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  },

  addProduct: async (productData: CreateProductPayload) => {
    set({ loading: true, error: null });

    try {
      const response = await apiCall("/products", {
        method: "POST",
        body: JSON.stringify(productData),
      });

      if (response.success) {
        const { products } = get();
        set({
          products: [response.data, ...products],
          loading: false,
          error: null,
        });
        return response.data;
      } else {
        const errorMessage = response.message || "Failed to create product";
        set({ loading: false, error: errorMessage });
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error?.message || "Failed to create product";
      set({ loading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  },

  updateProduct: async (id: number, productData: UpdateProductPayload) => {
    set({ loading: true, error: null });

    try {
      const response = await apiCall(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(productData),
      });

      if (response.success) {
        const { products, selectedProduct } = get();
        const updatedProducts = products.map((product) =>
          product.id === id ? response.data : product
        );

        set({
          products: updatedProducts,
          selectedProduct:
            selectedProduct?.id === id ? response.data : selectedProduct,
          loading: false,
          error: null,
        });

        return response.data;
      } else {
        const errorMessage = response?.message || "Failed to update product";
        set({ loading: false, error: errorMessage });
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error?.message || "Failed to update product";
      set({ loading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  },

  deleteProduct: async (id: number) => {
    set({ loading: true, error: null });

    try {
      const response = await apiCall(`/products/${id}`, {
        method: "DELETE",
      });

      if (response.success) {
        const { products, selectedProduct } = get();
        const filteredProducts = products.filter(
          (product) => product.id !== id
        );

        set({
          products: filteredProducts,
          selectedProduct: selectedProduct?.id === id ? null : selectedProduct,
          loading: false,
          error: null,
        });
      } else {
        const errorMessage = response?.message || "Failed to delete product";
        set({ loading: false, error: errorMessage });
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error?.message || "Failed to delete product";
      set({ loading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
    }
  },

  recordSale: async (id: number, payload: RecordSalePayload) => {
    set({ loading: true, error: null });

    try {
      const response = await apiCall(`/products/${id}/sale`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.success) {
        // Update product in list
        const { products, selectedProduct } = get();
        const updatedProducts = products.map((product) =>
          product.id === id ? response.data.product : product
        );

        set({
          products: updatedProducts,
          selectedProduct:
            selectedProduct?.id === id
              ? response.data.product
              : selectedProduct,
          loading: false,
          error: null,
        });
      } else {
        throw new Error("Failed to record sale");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to record sale";
      set({ loading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  },

  selectProduct: (product) => set({ selectedProduct: product }),

  setSearchTerm: (term) => {
    set({ searchTerm: term });
    const { fetchProducts } = get();
    fetchProducts(1, term);
  },

  setFilterStatus: (status) => {
    set({ filterStatus: status });
    const { fetchProducts, searchTerm } = get();
    fetchProducts(1, searchTerm);
  },

  setCurrentPage: (page) => {
    set({ currentPage: page });
    const { fetchProducts, searchTerm } = get();
    fetchProducts(page, searchTerm);
  },

  getFilteredProducts: () => {
    const { products, searchTerm, filterStatus } = get();

    return products.filter((product) => {
      const matchesSearch =
        !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "active" && product.status === "active") ||
        (filterStatus === "inactive" && product.status === "inactive") ||
        (filterStatus === "low_stock" && product.quantity_left <= 10);

      return matchesSearch && matchesFilter;
    });
  },

  clearError: () => set({ error: null }),

  // Statistics Actions
  fetchMonthlyStats: async (month?: string) => {
    set({ statsLoading: true, error: null });

    try {
      const queryParams = month ? `?month=${month}` : "";
      const response = await apiCall(`/products/stats/monthly${queryParams}`);

      if (response.success) {
        set({
          monthlyStats: response.data,
          statsLoading: false,
          error: null,
        });
        return response.data;
      } else {
        throw new Error("Failed to fetch monthly stats");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch monthly stats";
      set({ statsLoading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  },

  fetchWeeklyStats: async (date?: string) => {
    set({ statsLoading: true, error: null });

    try {
      const queryParams = date ? `?date=${date}` : "";
      const response = await apiCall(`/products/stats/weekly${queryParams}`);

      if (response.success) {
        set({
          weeklyStats: response.data,
          statsLoading: false,
          error: null,
        });
        return response.data;
      } else {
        throw new Error("Failed to fetch weekly stats");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch weekly stats";
      set({ statsLoading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  },

  fetchAnalytics: async (period = "month") => {
    set({ statsLoading: true, error: null });

    try {
      const response = await apiCall(
        `/products/stats/analytics?period=${period}`
      );

      if (response.success) {
        set({
          analytics: response.data,
          statsLoading: false,
          error: null,
        });
        return response.data;
      } else {
        throw new Error("Failed to fetch analytics");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch analytics";
      set({ statsLoading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  },

  fetchTopSelling: async (limit = 10, period = "month") => {
    set({ statsLoading: true, error: null });

    try {
      const response = await apiCall(
        `/products/stats/top-selling?limit=${limit}&period=${period}`
      );

      if (response.success) {
        set({
          topSelling: response.data,
          statsLoading: false,
          error: null,
        });
        return response.data;
      } else {
        throw new Error("Failed to fetch top selling products");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch top selling products";
      set({ statsLoading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  },

  fetchLowStock: async (threshold = 10) => {
    set({ statsLoading: true, error: null });

    try {
      const response = await apiCall(
        `/products/low-stock?threshold=${threshold}`
      );

      if (response.success) {
        set({
          lowStock: response.data,
          statsLoading: false,
          error: null,
        });
        return response.data;
      } else {
        throw new Error("Failed to fetch low stock products");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch low stock products";
      set({ statsLoading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  },

  fetchCategories: async () => {
    try {
      const response = await apiCall("/products/categories");

      if (response.success) {
        set({ categories: response.data });
        return response.data;
      } else {
        throw new Error("Failed to fetch categories");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch categories";
      console.error(errorMessage);
      return [];
    }
  },
}));

// Utility functions
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(amount);
};

export const getStockStatus = (
  product: Product
): {
  status: "in_stock" | "low_stock" | "out_of_stock";
  color: string;
  text: string;
} => {
  if (product.quantity_left <= 0) {
    return { status: "out_of_stock", color: "red", text: "Out of Stock" };
  }
  if (product.quantity_left <= 10) {
    return { status: "low_stock", color: "orange", text: "Low Stock" };
  }
  return { status: "in_stock", color: "green", text: "In Stock" };
};

export const getProductStatusBadge = (status: string): string => {
  return status === "active"
    ? "bg-green-100 text-green-800"
    : "bg-gray-100 text-gray-800";
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};
