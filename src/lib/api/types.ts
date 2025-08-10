// Shared API contracts used by both server routes and client adapters

export interface AvatarRequest { imageDataUrl: string }
export interface AvatarResponse { images: string[] }

export interface EditRequest { baseImageUrl: string; instruction: string }
export interface EditResponse { images: string[] }

export interface TryOnRequest { characterImageUrl: string; clothingImageUrl: string }
export interface TryOnResponse { images: string[] }

export interface AmazonSearchRequest {
  query?: string;
  categoryId?: string;
  page?: number;
  country?: string; // default US
  sort_by?: string; // e.g., RELEVANCE
  product_condition?: string; // e.g., ALL, NEW
  is_prime?: boolean;
  deals_and_discounts?: string; // e.g., NONE
  category?: string; // numeric category id(s)
  min_price?: number;
  max_price?: number;
  brand?: string; // comma separated
  seller_id?: string; // comma separated
  four_stars_and_up?: boolean;
  language?: string;
  additional_filters?: string;
  fields?: string;
}
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


