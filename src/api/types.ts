export interface UserResponse {
  id: string;
  email: string;
  is_pro: boolean;
  email_verified: boolean;
  name: string | null;
  picture_url: string | null;
  is_exclusive: boolean;
  exclusive_until: string | null;
}

export interface LoginResponse {
  token: string;
  user: UserResponse;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface AutocompleteResponse {
  suggestions: string[];
}

export interface GeocodeResponse extends Coordinates {}

export interface ReverseGeocodeResponse {
  address: string;
}

export interface RouteStop {
  order: number;
  stop_id?: string | null;
  original_address: string;
  coordinates: Coordinates;
  leg_distance_km: number | null;
  leg_duration_min: number | null;
}

export interface OriginInfo {
  address: string;
  coordinates: Coordinates;
}

export interface RouteResponse {
  optimized_route: RouteStop[];
  total_distance_km: number;
  total_duration_min: number | null;
  geocoding_failures: string[];
  maps_url: string | null;
  origin: OriginInfo | null;
  destination: OriginInfo | null;
}

export interface SavedRouteStopDetails {
  id: string;
  address: string;
  description: string;
  place_name: string;
  client: { name: string; email: string; phone: string } | null;
  tags: string[];
}

export interface SavedRouteInputs {
  addresses: string[];
  origin?: string | null;
  destination?: string | null;
  fixed_first?: string | null;
  fixed_last?: string | null;
  stop_ids?: string[] | null;
  preserve_order?: boolean;
  destination_mode?: ApiDestinationMode;
  stop_details?: SavedRouteStopDetails[];
}

export interface SavedRoute {
  code: string;
  name: string;
  result: RouteResponse;
  inputs: SavedRouteInputs;
  created_at: string | null;
}

export interface RoutePolylineResponse {
  path: Coordinates[];
  encoded_polyline: string;
}

export interface StopLimitExceededDetail {
  code: 'STOP_LIMIT_EXCEEDED';
  limit: number;
  is_pro: boolean;
}

export interface BillingAccountUser {
  id: string;
  email: string;
  name: string | null;
  is_pro: boolean;
  is_exclusive: boolean;
  exclusive_until: string | null;
}

export interface BillingAccountResponse {
  user: BillingAccountUser;
  subscription: Record<string, unknown> | null;
  payments: Record<string, unknown>[];
}

export interface CheckoutResponse {
  payment_url?: string;
  ok?: boolean;
  coupon_applied?: boolean;
}

export interface ContactResponse {
  ok: boolean;
}

export interface AnonymousOptimizationUsage {
  limit: number;
  used: number;
  remaining: number;
  resets_at: string;
}

export type ApiDestinationMode = 'return_to_origin' | 'custom' | 'none';
export type ApiNavigationApp = 'ask_always' | 'google_maps' | 'waze' | 'apple_maps';
export type ApiDistanceUnit = 'km' | 'mi';
export type ApiVehicleType = 'car' | 'truck' | 'motorcycle' | 'bicycle';

export interface UserPreferencesResponse {
  default_origin: string | null;
  default_destination: string | null;
  destination_mode: ApiDestinationMode;
  navigation_app: ApiNavigationApp;
  distance_unit: ApiDistanceUnit;
  vehicle_type: ApiVehicleType;
}

export interface UpdatePreferencesRequest {
  default_origin?: string | null;
  default_destination?: string | null;
  destination_mode?: ApiDestinationMode;
  navigation_app?: ApiNavigationApp;
  distance_unit?: ApiDistanceUnit;
  vehicle_type?: ApiVehicleType;
}
