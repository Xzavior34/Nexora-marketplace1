-- Create products table for marketplace
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_kobo BIGINT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  product_type TEXT NOT NULL DEFAULT 'physical' CHECK (product_type IN ('physical', 'digital')),
  stock INTEGER DEFAULT 1,
  is_available BOOLEAN DEFAULT true,
  shipping_info TEXT,
  download_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product orders table
CREATE TABLE public.product_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_kobo BIGINT NOT NULL,
  platform_fee_kobo BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded')),
  shipping_address TEXT,
  tracking_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Anyone can view available products" ON public.products
  FOR SELECT USING (is_available = true);

CREATE POLICY "Sellers can view all their products" ON public.products
  FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Users can create products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their products" ON public.products
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their products" ON public.products
  FOR DELETE USING (auth.uid() = seller_id);

-- Product orders policies
CREATE POLICY "Buyers can view their orders" ON public.product_orders
  FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view orders for their products" ON public.product_orders
  FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Users can create orders" ON public.product_orders
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update order status" ON public.product_orders
  FOR UPDATE USING (auth.uid() = seller_id);

-- Add trigger for updated_at on products
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on product_orders  
CREATE TRIGGER update_product_orders_updated_at
  BEFORE UPDATE ON public.product_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();