// Shared API contracts used by both server routes and client adapters

export interface AvatarRequest { imageDataUrl: string }
export interface AvatarResponse { images: string[] }

export interface EditRequest { baseImageUrl: string; instruction: string }
export interface EditResponse { images: string[] }

export interface TryOnRequest { characterImageUrl: string; clothingImageUrl: string }
export interface TryOnResponse { images: string[] }

export interface AmazonSearchRequest { query: string }
export interface AmazonProduct {
  asin: string;
  product_title: string;
  product_photo: string;
  product_url: string;
  product_price: string | null;
}
export interface AmazonSearchResponse { products: AmazonProduct[] }

export interface VideoRequest { imageUrl: string }
export interface VideoResponse { url: string }


