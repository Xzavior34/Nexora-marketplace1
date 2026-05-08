import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, MessageCircle, User, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface ProductModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  onBuy: (product: any) => void;
  onChat: (product: any) => void;
}

export function ProductModal({ product, isOpen, onClose, onBuy, onChat }: ProductModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!product) return null;

  const formatNaira = (amount: number) => {
    const parsed = Number(amount) || 0;
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(parsed);
  };

  // Collect all available images
  const images: string[] = [];
  if (product.image_urls && product.image_urls.length > 0) {
    images.push(...product.image_urls.filter(Boolean));
  }
  if (product.image_url && !images.includes(product.image_url)) {
    images.unshift(product.image_url);
  }

  const handlePrev = () => setCurrentImageIndex(i => (i - 1 + images.length) % images.length);
  const handleNext = () => setCurrentImageIndex(i => (i + 1) % images.length);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] w-[95vw] max-h-[90vh] overflow-y-auto rounded-xl p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-xl font-bold">{product.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4 pt-2">
          {/* Image Carousel */}
          <div className="relative w-full h-48 sm:h-64 bg-muted rounded-lg overflow-hidden">
            {images.length > 0 ? (
              <>
                <img 
                  src={images[currentImageIndex]} 
                  alt={`${product.title} - ${currentImageIndex + 1}`} 
                  className="w-full h-full object-contain transition-opacity duration-300"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrev}
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-background transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-background transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    {/* Dots indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`h-2 w-2 rounded-full transition-all ${
                            idx === currentImageIndex ? 'bg-primary w-4' : 'bg-background/60'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mb-2 opacity-20" />
                <span>No image available</span>
              </div>
            )}
          </div>

          {/* Price & Category */}
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-primary">
              {formatNaira(product.price_kobo / 100)}
            </span>
            {product.category && (
              <span className="flex items-center text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                <Tag className="h-3 w-3 mr-1" />
                {product.category}
              </span>
            )}
          </div>

          {/* Seller Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-lg">
            <User className="h-4 w-4" />
            <span>Sold by <strong className="text-foreground">{product.profiles?.full_name || 'Student'}</strong></span>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">Description</h4>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {product.description || "No description provided by the seller."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => { onClose(); onChat(product); }}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat Seller
            </Button>
            <Button 
              className="w-full"
              onClick={() => { onClose(); onBuy(product); }}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Buy Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
