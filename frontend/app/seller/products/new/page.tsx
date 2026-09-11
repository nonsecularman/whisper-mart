import ProductForm from "@/components/ProductForm";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="text-xl font-display font-bold text-ink-900 mb-4">Add Product</h1>
      <ProductForm mode="create" />
    </div>
  );
}
