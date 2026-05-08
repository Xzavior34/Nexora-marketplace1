import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Package, Upload, ImagePlus, X } from 'lucide-react';

const categories = ['Electronics', 'Books', 'Fashion', 'Food', 'Services', 'Digital', 'Other'];

// Maximum allowed images
const MAX_IMAGES = 4;

export default function PostProduct() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // NEW: State to hold multiple files and their preview URLs
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    product_type: 'physical',
    stock: '1',
    shipping_info: '',
  });

  // NEW: Handle multiple file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (selectedFiles.length === 0) return;

    // Check if adding these files exceeds the limit
    if (images.length + selectedFiles.length > MAX_IMAGES) {
      toast.error(`You can only upload up to ${MAX_IMAGES} images.`);
      return;
    }

    const newImages = selectedFiles.map(file => {
      // Validate file size
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} must be less than 5MB`);
        return null;
      }
      return {
        file,
        preview: URL.createObjectURL(file)
      };
    }).filter(Boolean) as { file: File; preview: string }[];

    setImages(prev => [...prev, ...newImages]);
    
    // Reset the input so the same files can be selected again if removed
    e.target.value = '';
  };

  // NEW: Remove a specific image
  const removeImage = (indexToRemove: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[indexToRemove].preview); // Clean up memory
      newImages.splice(indexToRemove, 1);
      return newImages;
    });
  };

  // NEW: Upload multiple images and return an array of URLs
  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0 || !user) return [];

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      // Upload files sequentially to avoid hitting rate limits easily
      for (const { file } of images) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }
      return uploadedUrls;
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload some images');
      return [];
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in first');
      navigate('/auth');
      return;
    }

    const price = parseFloat(form.price);
    if (!form.title || !form.description || !form.category || isNaN(price) || price <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      // NEW: Upload all images and get the array of URLs
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages();
      }

      // We still save the first image to `image_url` for backwards compatibility 
      // on cards, but also save the full array to `image_urls`.
      const { error } = await supabase.from('products').insert({
        seller_id: user.id,
        title: form.title,
        description: form.description,
        price_kobo: Math.floor(price * 100),
        category: form.category,
        product_type: form.product_type,
        stock: parseInt(form.stock) || 1,
        shipping_info: form.shipping_info || null,
        image_url: imageUrls.length > 0 ? imageUrls[0] : null,
        image_urls: imageUrls, 
      });

      if (error) throw error;

      toast.success('Product listed successfully!');
      navigate('/marketplace');
    } catch (err) {
      console.error('Error posting product:', err);
      toast.error('Failed to list product');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="mb-4">Please sign in to list products</p>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">List a Product</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Details
            </CardTitle>
            <CardDescription>
              List your product for sale in the marketplace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Product Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., iPhone 12 Pro Max"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe your product in detail..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₦) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="1"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="5000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="1"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={form.product_type} onValueChange={(v) => setForm({ ...form, product_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical">Physical Product</SelectItem>
                      <SelectItem value="digital">Digital Product</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* NEW: Multi-Image Upload Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Product Images (optional)</Label>
                  <span className="text-xs text-muted-foreground">{images.length}/{MAX_IMAGES} uploaded</span>
                </div>
                
                {/* Image Previews Grid */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    {images.map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                        <img
                          src={img.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button (hidden if max reached) */}
                {images.length < MAX_IMAGES && (
                  <label className={`flex flex-col items-center justify-center w-full ${images.length > 0 ? 'h-24' : 'h-48'} border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImagePlus className={`${images.length > 0 ? 'h-6 w-6' : 'h-10 w-10'} text-muted-foreground mb-2`} />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-primary">Click to upload</span> {images.length > 0 && 'more'}
                      </p>
                      {images.length === 0 && <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB (Max 4)</p>}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>

              {form.product_type === 'physical' && (
                <div className="space-y-2">
                  <Label htmlFor="shipping_info">Shipping Information</Label>
                  <Textarea
                    id="shipping_info"
                    value={form.shipping_info}
                    onChange={(e) => setForm({ ...form, shipping_info: e.target.value })}
                    placeholder="Delivery within FUNAAB campus, pickup available..."
                    rows={2}
                  />
                </div>
              )}

              <Button type="submit" className="w-full h-12" disabled={loading || uploading}>
                {(loading || uploading) ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Upload className="h-5 w-5 mr-2" />
                )}
                {uploading ? `Uploading Images...` : 'List Product'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
